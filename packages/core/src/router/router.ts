// ============================================================================
// Router — 消息路由核心
// ============================================================================

import type {
  IncomingMessage,
  OutgoingMessage,
  EventBus,
  AgentRuntime,
  MessageAdapter,
} from "@superclaw-ai/types";
import type { Logger } from "pino";
import type { BindingTable } from "./binding-table.js";
import type { MessageQueue } from "./message-queue.js";

/** AgentManager 接口（由 Agent 1 实现，这里定义最小接口） */
export interface AgentManager {
  getAgent(agentId: string): AgentRuntime | undefined;
  getAllAgents(): AgentRuntime[];
}

/** Router 依赖 */
export interface RouterDeps {
  bindingTable: BindingTable;
  messageQueue: MessageQueue;
  agentManager: AgentManager;
  channelAdapters: Map<string, MessageAdapter>;
  eventBus: EventBus;
  logger: Logger;
}

/** Router 接口 */
export interface Router {
  handleIncoming(message: IncomingMessage): Promise<void>;
  start(): void;
  stop(): void;
}

/**
 * 创建消息路由器
 *
 * 处理流程：
 * 1. 收到消息 → emit "message:received"
 * 2. 查 binding table → emit "message:routed"
 * 3. 入队
 * 4. 消费循环：取 agent → handleMessage → 发回回复
 * 5. emit "message:sent" / "message:error"
 */
export function createRouter(deps: RouterDeps): Router {
  const { bindingTable, messageQueue, agentManager, channelAdapters, eventBus, logger } = deps;

  let running = false;
  let consumeTimer: ReturnType<typeof setInterval> | null = null;

  /**
   * 处理单条消息：调用 agent，发送回复
   */
  async function processMessage(agentId: string, message: IncomingMessage): Promise<void> {
    const agent = agentManager.getAgent(agentId);
    if (!agent) {
      logger.error({ agentId, messageId: message.id }, "Agent not found for message processing");
      eventBus.emit("message:error", {
        messageId: message.id,
        agentId,
        error: new Error(`Agent ${agentId} not found`),
      });
      return;
    }

    try {
      const response: OutgoingMessage = await agent.handleMessage(message);

      eventBus.emit("message:responded", {
        messageId: message.id,
        agentId,
        response,
      });

      // 通过 channel adapter 发回回复
      const adapter = channelAdapters.get(message.channelType);
      if (adapter) {
        await adapter.sendMessage(
          message.accountId,
          {
            type: message.groupId ? "group" : "dm",
            id: message.groupId ?? message.senderId,
          },
          response,
        );

        eventBus.emit("message:sent", {
          messageId: message.id,
          channelType: message.channelType,
          accountId: message.accountId,
        });
      } else {
        logger.warn(
          { channelType: message.channelType, messageId: message.id },
          "No channel adapter found, response not sent",
        );
      }
    } catch (err) {
      logger.error({ err, agentId, messageId: message.id }, "Error processing message");
      eventBus.emit("message:error", {
        messageId: message.id,
        agentId,
        error: err instanceof Error ? err : new Error(String(err)),
      });
    }
  }

  /**
   * 消费循环：轮询所有 agent 的队列
   */
  function consumeLoop(): void {
    if (!running) return;

    const agents = agentManager.getAllAgents();
    for (const agent of agents) {
      const agentId = agent.config.id;
      const message = messageQueue.dequeue(agentId);
      if (message) {
        // 异步处理，不阻塞消费循环
        processMessage(agentId, message).catch((err) => {
          logger.error({ err, agentId }, "Unhandled error in message processing");
        });
      }
    }
  }

  return {
    async handleIncoming(message: IncomingMessage): Promise<void> {
      eventBus.emit("message:received", { message });

      // 支持 targetAgent 直接路由（Dashboard / API 调用）
      const targetAgent = message.metadata?.targetAgent as string | undefined;

      // 查 binding table（targetAgent 优先）
      const agentId = targetAgent ?? bindingTable.resolve(message.channelType, message.accountId, message);
      if (!agentId) {
        logger.warn(
          { channelType: message.channelType, accountId: message.accountId, messageId: message.id },
          "No binding found for message",
        );
        return;
      }

      eventBus.emit("message:routed", { message, agentId });

      // 入队
      messageQueue.enqueue(agentId, message);
    },

    start(): void {
      if (running) return;
      running = true;
      // 每 100ms 轮询一次队列
      consumeTimer = setInterval(consumeLoop, 100);
      logger.info("Router started");
    },

    stop(): void {
      running = false;
      if (consumeTimer) {
        clearInterval(consumeTimer);
        consumeTimer = null;
      }
      logger.info("Router stopped");
    },
  };
}
