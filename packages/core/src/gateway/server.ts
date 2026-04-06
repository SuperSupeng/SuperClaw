// ============================================================================
// Gateway Server — HTTP 服务器（原生 node:http）
// ============================================================================

import { createServer, type Server, type IncomingMessage as HttpReq, type ServerResponse } from "node:http";
import type { GatewayConfig, EventBus, AgentRuntime, IncomingMessage } from "@superclaw/types";
import type { Logger } from "pino";

/** GatewayServer 接口 */
export interface GatewayServer {
  start(): Promise<void>;
  stop(): Promise<void>;
  setAgentProvider(fn: () => AgentRuntime[]): void;
  setMessageHandler(fn: (msg: IncomingMessage) => Promise<void>): void;
}

interface GatewayDeps {
  eventBus: EventBus;
  logger: Logger;
}

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

  let getAgents: () => AgentRuntime[] = () => [];
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

  async function handleRequest(req: HttpReq, res: ServerResponse): Promise<void> {
    const method = req.method ?? "GET";
    const url = req.url ?? "/";

    // CORS 简单处理
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
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
        status: agent.instance.status,
        bootedAt: agent.instance.bootedAt,
        messageCount: agent.instance.messageCount,
        lastActiveAt: agent.instance.lastActiveAt,
      }));
      sendJson(res, 200, { agents: statuses });
      return;
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
