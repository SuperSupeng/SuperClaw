// ============================================================================
// Gateway Server — HTTP 服务器（原生 node:http）
// ============================================================================

import { createServer, type Server, type IncomingMessage as HttpReq, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import type { GatewayConfig, EventBus, AgentRuntime, IncomingMessage, Signal, SuperClawConfig } from "@superclaw-ai/types";
import type { Logger } from "pino";
import type { WebSocketServer } from "./websocket.js";

/** GatewayServer 接口 */
export interface GatewayServer {
  start(): Promise<void>;
  stop(): Promise<void>;
  setAgentProvider(fn: () => AgentRuntime[]): void;
  setMessageHandler(fn: (msg: IncomingMessage) => Promise<void>): void;
  setSignalProvider(fn: () => Signal[]): void;
  setConfigProvider(fn: () => SuperClawConfig): void;
  setWebSocketServer(wss: WebSocketServer): void;
}

interface GatewayDeps {
  eventBus: EventBus;
  logger: Logger;
}

/** MIME 类型映射 */
const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".json": "application/json; charset=utf-8",
  ".ico": "image/x-icon",
};

/**
 * 读取 HTTP 请求体
 */
function readBody(req: HttpReq): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    req.on("error", reject);
  });
}

/**
 * 发送 JSON 响应
 */
function sendJson(res: ServerResponse, status: number, data: unknown): void {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

/**
 * 深度克隆并脱敏配置：将 apiKey / token 字段替换为 "***"
 */
function sanitizeConfig(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeConfig);

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if ((key === "apiKey" || key === "token") && typeof value === "string") {
      result[key] = "***";
    } else {
      result[key] = sanitizeConfig(value);
    }
  }
  return result;
}

/**
 * 创建 Gateway HTTP 服务器
 */
export function createGatewayServer(
  config: GatewayConfig,
  deps: GatewayDeps,
): GatewayServer {
  const { eventBus, logger } = deps;
  const port = config.port ?? 3000;
  const healthPath = config.healthPath ?? "/health";
  const authToken = config.authToken;
  const dashboardDir = config.dashboardDir;

  let getAgents: () => AgentRuntime[] = () => [];
  let getSignals: (() => Signal[]) | null = null;
  let getConfig: (() => SuperClawConfig) | null = null;
  let wsServer: WebSocketServer | null = null;
  let server: Server | null = null;
  const startedAt = Date.now();

  // 消息处理回调（由 router 设置）
  let messageHandler: ((msg: IncomingMessage) => Promise<void>) | null = null;

  function checkAuth(req: HttpReq, res: ServerResponse): boolean {
    if (!authToken) return true;
    const header = req.headers.authorization;
    if (header === `Bearer ${authToken}`) return true;
    sendJson(res, 401, { error: "Unauthorized" });
    return false;
  }

  /**
   * 提供静态文件服务（Dashboard SPA）
   */
  async function serveDashboard(url: string, res: ServerResponse): Promise<boolean> {
    if (!dashboardDir) return false;

    // 去掉 /dashboard 前缀
    let filePath = url.replace(/^\/dashboard\/?/, "/") || "/";
    if (filePath === "/") filePath = "/index.html";

    const fullPath = join(dashboardDir, filePath);

    try {
      const content = await readFile(fullPath);
      const ext = extname(fullPath);
      const contentType = MIME_TYPES[ext] ?? "application/octet-stream";
      res.writeHead(200, {
        "Content-Type": contentType,
        "Content-Length": content.length,
      });
      res.end(content);
      return true;
    } catch {
      // 文件不存在 → SPA fallback: serve index.html
      try {
        const indexPath = join(dashboardDir, "index.html");
        const content = await readFile(indexPath);
        res.writeHead(200, {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Length": content.length,
        });
        res.end(content);
        return true;
      } catch {
        return false;
      }
    }
  }

  async function handleRequest(req: HttpReq, res: ServerResponse): Promise<void> {
    const method = req.method ?? "GET";
    const url = req.url ?? "/";

    // CORS 简单处理
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    // Health check
    if (method === "GET" && url === healthPath) {
      const agents = getAgents();
      sendJson(res, 200, {
        status: "ok",
        uptime: Math.floor((Date.now() - startedAt) / 1000),
        agentCount: agents.length,
      });
      return;
    }

    // Auth check for API routes
    if (url.startsWith("/api/")) {
      if (!checkAuth(req, res)) return;
    }

    // POST /api/message — webhook 入口
    if (method === "POST" && url === "/api/message") {
      try {
        const body = await readBody(req);
        const parsed = JSON.parse(body) as IncomingMessage;

        // 确保有 timestamp
        if (parsed.timestamp && typeof parsed.timestamp === "string") {
          (parsed as unknown as { timestamp: Date }).timestamp = new Date(parsed.timestamp);
        }

        eventBus.emit("message:received", { message: parsed });

        if (messageHandler) {
          await messageHandler(parsed);
        }

        sendJson(res, 200, { status: "accepted", messageId: parsed.id });
      } catch (err) {
        logger.error({ err }, "Failed to process incoming message");
        sendJson(res, 400, { error: "Invalid message body" });
      }
      return;
    }

    // GET /api/agents — 返回所有 Agent 状态
    if (method === "GET" && url === "/api/agents") {
      const agents = getAgents();
      const statuses = agents.map((agent) => ({
        id: agent.config.id,
        name: agent.config.name,
        tier: agent.config.tier,
        team: agent.config.team,
        status: agent.instance.status,
        bootedAt: agent.instance.bootedAt,
        messageCount: agent.instance.messageCount,
        lastActiveAt: agent.instance.lastActiveAt,
        error: agent.instance.error,
      }));
      sendJson(res, 200, { agents: statuses });
      return;
    }

    // GET /api/agents/:id — 单个 Agent 详情
    const agentMatch = method === "GET" && url.match(/^\/api\/agents\/([^/]+)$/);
    if (agentMatch) {
      const agentId = decodeURIComponent(agentMatch[1]!);
      const agents = getAgents();
      const agent = agents.find((a) => a.config.id === agentId);
      if (!agent) {
        sendJson(res, 404, { error: `Agent '${agentId}' not found` });
        return;
      }
      sendJson(res, 200, {
        config: agent.config,
        instance: {
          status: agent.instance.status,
          bootedAt: agent.instance.bootedAt,
          messageCount: agent.instance.messageCount,
          lastActiveAt: agent.instance.lastActiveAt,
          error: agent.instance.error,
        },
      });
      return;
    }

    // POST /api/agents/:id/message — 向指定 Agent 发送消息
    const agentMsgMatch = method === "POST" && url.match(/^\/api\/agents\/([^/]+)\/message$/);
    if (agentMsgMatch) {
      const agentId = decodeURIComponent(agentMsgMatch[1]!);
      const agents = getAgents();
      const agent = agents.find((a) => a.config.id === agentId);
      if (!agent) {
        sendJson(res, 404, { error: `Agent '${agentId}' not found` });
        return;
      }
      try {
        const body = await readBody(req);
        const parsed = JSON.parse(body) as IncomingMessage;
        if (parsed.timestamp && typeof parsed.timestamp === "string") {
          (parsed as unknown as { timestamp: Date }).timestamp = new Date(parsed.timestamp);
        }
        // 强制路由到指定 agent（绕过 binding table）
        parsed.metadata = { ...parsed.metadata, targetAgent: agentId };
        if (messageHandler) {
          await messageHandler(parsed);
        }
        sendJson(res, 200, { status: "accepted", messageId: parsed.id });
      } catch (err) {
        logger.error({ err }, "Failed to process agent message");
        sendJson(res, 400, { error: "Invalid message body" });
      }
      return;
    }

    // GET /api/signals — 所有 Signal
    if (method === "GET" && url === "/api/signals") {
      if (!getSignals) {
        sendJson(res, 501, { error: "Signal provider not configured" });
        return;
      }
      sendJson(res, 200, { signals: getSignals() });
      return;
    }

    // GET /api/config — 脱敏后的配置
    if (method === "GET" && url === "/api/config") {
      if (!getConfig) {
        sendJson(res, 501, { error: "Config provider not configured" });
        return;
      }
      const sanitized = sanitizeConfig(getConfig());
      sendJson(res, 200, { config: sanitized });
      return;
    }

    // Dashboard 静态文件
    if (method === "GET" && (url === "/dashboard" || url.startsWith("/dashboard/"))) {
      const served = await serveDashboard(url, res);
      if (served) return;
    }

    // 404
    sendJson(res, 404, { error: "Not found" });
  }

  return {
    setAgentProvider(fn: () => AgentRuntime[]) {
      getAgents = fn;
    },

    setMessageHandler(fn: (msg: IncomingMessage) => Promise<void>) {
      messageHandler = fn;
    },

    setSignalProvider(fn: () => Signal[]) {
      getSignals = fn;
    },

    setConfigProvider(fn: () => SuperClawConfig) {
      getConfig = fn;
    },

    setWebSocketServer(wss: WebSocketServer) {
      wsServer = wss;
    },

    start(): Promise<void> {
      return new Promise((resolve, reject) => {
        server = createServer((req, res) => {
          handleRequest(req, res).catch((err) => {
            logger.error({ err }, "Unhandled gateway error");
            if (!res.headersSent) {
              sendJson(res, 500, { error: "Internal server error" });
            }
          });
        });

        // WebSocket upgrade 处理
        if (wsServer) {
          const wss = wsServer;
          server.on("upgrade", (req, socket, head) => {
            if (req.url === "/ws") {
              wss.handleUpgrade(req, socket, head);
            } else {
              socket.destroy();
            }
          });
        }

        server.on("error", reject);
        server.listen(port, () => {
          logger.info({ port }, "Gateway server started");
          resolve();
        });
      });
    },

    stop(): Promise<void> {
      return new Promise((resolve) => {
        if (!server) {
          resolve();
          return;
        }
        server.close(() => {
          logger.info("Gateway server stopped");
          resolve();
        });
      });
    },
  };
}
