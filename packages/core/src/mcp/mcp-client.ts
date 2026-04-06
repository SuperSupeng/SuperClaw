// ============================================================================
// MCP Client Manager — MCP Server 连接管理
// ============================================================================
// 通过 stdio JSON-RPC 与 MCP Server 进程通信。
// 协议：https://spec.modelcontextprotocol.io/
// ============================================================================

import type {
  MCPServerConfig,
  ToolDefinition,
  ToolResult,
} from "@superclaw/types";
import type { Logger } from "pino";
import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { validateToolSchema } from "./schema-validator.js";
import type { SchemaValidationResult } from "./schema-validator.js";

/** MCP Client Manager 接口 */
export interface MCPClientManager {
  /** 连接所有 MCP Server */
  connectAll(): Promise<void>;
  /** 断开所有连接 */
  disconnectAll(): Promise<void>;
  /** 获取指定 server 的可用工具 */
  getTools(serverId: string): ToolDefinition[];
  /** 获取所有 server 的所有工具 */
  getAllTools(): ToolDefinition[];
  /** 执行指定 server 的工具 */
  execute(
    serverId: string,
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<ToolResult>;
}

/** JSON-RPC 请求 */
interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: Record<string, unknown>;
}

/** JSON-RPC 响应 */
interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

/** MCP 工具定义（来自 server） */
interface MCPToolRaw {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

/** 单个 server 连接状态 */
interface ServerConnection {
  config: MCPServerConfig;
  process: ChildProcess;
  tools: ToolDefinition[];
  nextId: number;
  pending: Map<number, {
    resolve: (value: JsonRpcResponse) => void;
    reject: (reason: Error) => void;
  }>;
  buffer: string;
}

/** 默认 RPC 超时（毫秒） */
const RPC_TIMEOUT = 30_000;

/**
 * 创建 MCP Client Manager
 */
export function createMCPClientManager(
  servers: MCPServerConfig[],
  logger: Logger,
): MCPClientManager {
  const log = logger.child({ module: "mcp-client" });
  const connections = new Map<string, ServerConnection>();

  /** 发送 JSON-RPC 请求并等待响应 */
  function sendRequest(
    conn: ServerConnection,
    method: string,
    params?: Record<string, unknown>,
  ): Promise<JsonRpcResponse> {
    return new Promise((resolve, reject) => {
      const id = conn.nextId++;
      const request: JsonRpcRequest = {
        jsonrpc: "2.0",
        id,
        method,
        ...(params ? { params } : {}),
      };

      const timer = setTimeout(() => {
        conn.pending.delete(id);
        reject(new Error(`RPC timeout for method "${method}" (${RPC_TIMEOUT}ms)`));
      }, RPC_TIMEOUT);

      conn.pending.set(id, {
        resolve: (resp) => {
          clearTimeout(timer);
          resolve(resp);
        },
        reject: (err) => {
          clearTimeout(timer);
          reject(err);
        },
      });

      const payload = JSON.stringify(request) + "\n";
      if (conn.process.stdin && !conn.process.stdin.destroyed) {
        conn.process.stdin.write(payload);
      } else {
        clearTimeout(timer);
        conn.pending.delete(id);
        reject(new Error("MCP server stdin is not writable"));
      }
    });
  }

  /** 处理从 server stdout 收到的数据 */
  function handleData(conn: ServerConnection, chunk: string): void {
    conn.buffer += chunk;

    // 按换行分割，逐行尝试解析 JSON-RPC
    const lines = conn.buffer.split("\n");
    // 最后一个可能是不完整的行，保留在 buffer
    conn.buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      try {
        const msg = JSON.parse(trimmed) as JsonRpcResponse;
        if (msg.id !== undefined && conn.pending.has(msg.id)) {
          const handler = conn.pending.get(msg.id)!;
          conn.pending.delete(msg.id);
          handler.resolve(msg);
        }
      } catch {
        // 非 JSON 输出，忽略（可能是 server 的 debug log）
        log.trace({ serverId: conn.config.id, line: trimmed }, "Non-JSON output from MCP server");
      }
    }
  }

  /** 连接单个 server */
  async function connectOne(config: MCPServerConfig): Promise<void> {
    log.info({ serverId: config.id, command: config.command }, "Connecting to MCP server");

    const child = spawn(config.command, config.args ?? [], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, ...config.env },
    });

    const conn: ServerConnection = {
      config,
      process: child,
      tools: [],
      nextId: 1,
      pending: new Map(),
      buffer: "",
    };

    // 监听 stdout
    child.stdout?.setEncoding("utf-8");
    child.stdout?.on("data", (chunk: string) => handleData(conn, chunk));

    // 监听 stderr（仅日志）
    child.stderr?.setEncoding("utf-8");
    child.stderr?.on("data", (data: string) => {
      log.debug({ serverId: config.id, stderr: data.trim() }, "MCP server stderr");
    });

    // 监听进程退出
    child.on("exit", (code, signal) => {
      log.warn({ serverId: config.id, code, signal }, "MCP server process exited");
      connections.delete(config.id);
    });

    child.on("error", (err) => {
      log.error({ serverId: config.id, error: err.message }, "MCP server process error");
      // Reject all pending requests
      for (const [id, handler] of conn.pending) {
        handler.reject(new Error(`MCP server process error: ${err.message}`));
        conn.pending.delete(id);
      }
    });

    connections.set(config.id, conn);

    // MCP 协议：先 initialize
    try {
      const initResp = await sendRequest(conn, "initialize", {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "superclaw", version: "0.1.0" },
      });

      if (initResp.error) {
        log.warn(
          { serverId: config.id, error: initResp.error },
          "MCP initialize returned error",
        );
      }

      // 发送 initialized 通知（无 id，但我们通过 sendRequest 简化处理）
      // 按 MCP 规范，这是一个 notification，不需要响应。直接写入。
      const notification = JSON.stringify({
        jsonrpc: "2.0",
        method: "notifications/initialized",
      }) + "\n";
      child.stdin?.write(notification);
    } catch (err) {
      log.error({ serverId: config.id, error: err }, "MCP initialize failed");
      throw err;
    }

    // 获取工具列表
    try {
      const toolsResp = await sendRequest(conn, "tools/list");

      if (toolsResp.error) {
        log.warn({ serverId: config.id, error: toolsResp.error }, "tools/list returned error");
        return;
      }

      const rawTools = ((toolsResp.result as Record<string, unknown>)?.["tools"] ?? []) as MCPToolRaw[];

      for (const raw of rawTools) {
        const toolDef: ToolDefinition = {
          name: raw.name,
          description: raw.description ?? "",
          parameters: raw.inputSchema ?? { type: "object", properties: {} },
          source: "mcp",
        };

        // Schema 校验
        if (config.validateSchema) {
          const result: SchemaValidationResult = validateToolSchema(toolDef);
          if (!result.valid) {
            log.warn(
              { serverId: config.id, tool: raw.name, errors: result.errors },
              "Tool schema validation failed, isolating tool",
            );
            continue; // 不注册不合规的工具
          }
        }

        conn.tools.push(toolDef);
      }

      log.info(
        { serverId: config.id, toolCount: conn.tools.length },
        "MCP server connected, tools discovered",
      );
    } catch (err) {
      log.error({ serverId: config.id, error: err }, "Failed to list MCP tools");
      throw err;
    }
  }

  /** 断开单个 server */
  function disconnectOne(conn: ServerConnection): void {
    const { config, process: child } = conn;
    log.info({ serverId: config.id }, "Disconnecting MCP server");

    // Reject all pending
    for (const [_id, handler] of conn.pending) {
      handler.reject(new Error("MCP client disconnecting"));
    }
    conn.pending.clear();
    conn.tools = [];

    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }

  return {
    async connectAll(): Promise<void> {
      log.info("Connecting to %d MCP servers", servers.length);
      const results = await Promise.allSettled(
        servers.map((s) => connectOne(s)),
      );

      for (let i = 0; i < results.length; i++) {
        const r = results[i]!;
        if (r.status === "rejected") {
          log.error(
            { serverId: servers[i]!.id, error: r.reason },
            "Failed to connect MCP server",
          );
        }
      }
    },

    async disconnectAll(): Promise<void> {
      log.info("Disconnecting all MCP servers");
      for (const conn of connections.values()) {
        disconnectOne(conn);
      }
      connections.clear();
    },

    getTools(serverId: string): ToolDefinition[] {
      const conn = connections.get(serverId);
      if (!conn) {
        log.warn({ serverId }, "Server not connected");
        return [];
      }
      return [...conn.tools];
    },

    getAllTools(): ToolDefinition[] {
      const allTools: ToolDefinition[] = [];
      for (const conn of connections.values()) {
        allTools.push(...conn.tools);
      }
      return allTools;
    },

    async execute(
      serverId: string,
      toolName: string,
      args: Record<string, unknown>,
    ): Promise<ToolResult> {
      const conn = connections.get(serverId);
      if (!conn) {
        return {
          success: false,
          output: "",
          error: `MCP server "${serverId}" is not connected`,
        };
      }

      const startTime = Date.now();

      try {
        const resp = await sendRequest(conn, "tools/call", {
          name: toolName,
          arguments: args,
        });

        if (resp.error) {
          return {
            success: false,
            output: "",
            error: `MCP error ${resp.error.code}: ${resp.error.message}`,
            duration: Date.now() - startTime,
          };
        }

        // MCP tool result: { content: [{ type: "text", text: "..." }] }
        const result = resp.result as Record<string, unknown> | undefined;
        const content = result?.["content"] as Array<{ type: string; text?: string }> | undefined;
        const outputParts: string[] = [];
        if (Array.isArray(content)) {
          for (const item of content) {
            if (item.type === "text" && item.text) {
              outputParts.push(item.text);
            }
          }
        }
        const output = outputParts.join("\n");

        // 尝试 JSON 解析
        let data: unknown;
        try {
          data = JSON.parse(output);
        } catch {
          data = undefined;
        }

        const isError = result?.["isError"] === true;

        return {
          success: !isError,
          output,
          data,
          duration: Date.now() - startTime,
        };
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        return {
          success: false,
          output: "",
          error: error.message,
          duration: Date.now() - startTime,
        };
      }
    },
  };
}
