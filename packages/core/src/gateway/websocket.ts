// ============================================================================
// WebSocket Server — 实时事件广播
// ============================================================================

import { WebSocketServer as WsServer, WebSocket } from "ws";
import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import type { Logger } from "pino";

/** WebSocketServer 接口 */
export interface WebSocketServer {
  handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer): void;
  broadcast(event: string, data: unknown): void;
  getConnectionCount(): number;
  close(): Promise<void>;
}

/**
 * 创建 WebSocket 服务器（不独立监听端口，由 HTTP server 的 upgrade 事件驱动）
 */
export function createWebSocketServer(logger: Logger): WebSocketServer {
  const wss = new WsServer({ noServer: true });

  wss.on("connection", (ws, req) => {
    const remote = req.socket.remoteAddress ?? "unknown";
    logger.info({ remote }, "WebSocket client connected");

    ws.on("close", (code, reason) => {
      logger.debug({ remote, code, reason: reason.toString() }, "WebSocket client disconnected");
    });

    ws.on("error", (err) => {
      logger.error({ err, remote }, "WebSocket client error");
    });
  });

  return {
    handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer): void {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    },

    broadcast(event: string, data: unknown): void {
      const payload = JSON.stringify({
        event,
        data,
        timestamp: new Date().toISOString(),
      });

      for (const client of wss.clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      }
    },

    getConnectionCount(): number {
      let count = 0;
      for (const client of wss.clients) {
        if (client.readyState === WebSocket.OPEN) count++;
      }
      return count;
    },

    close(): Promise<void> {
      return new Promise((resolve, reject) => {
        for (const client of wss.clients) {
          client.close(1001, "Server shutting down");
        }
        wss.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    },
  };
}
