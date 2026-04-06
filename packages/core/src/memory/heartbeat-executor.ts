// ============================================================================
// HeartbeatExecutor — HEARTBEAT.md 定期自动执行
// ============================================================================
// 定期读取每个 Agent 的 HEARTBEAT.md，将其内容作为 IncomingMessage 发送到
// 事件总线，由 Router 分发给对应 Agent 执行。
// ============================================================================

import type { AgentConfig, EventBus, IncomingMessage, MemoryManager } from "@superclaw/types";
import type { Logger } from "pino";

/** HeartbeatExecutor 依赖 */
export interface HeartbeatDeps {
  memoryManager: MemoryManager;
  agentConfigs: AgentConfig[];
  eventBus: EventBus;
  logger: Logger;
  /** 心跳间隔（毫秒），默认 300000 = 5 分钟 */
  interval?: number;
}

/** HeartbeatExecutor 接口 */
export interface HeartbeatExecutor {
  start(): void;
  stop(): void;
}

const DEFAULT_INTERVAL = 300_000; // 5 minutes

/**
 * 创建 HeartbeatExecutor 实例
 */
export function createHeartbeatExecutor(deps: HeartbeatDeps): HeartbeatExecutor {
  const {
    memoryManager,
    agentConfigs,
    eventBus,
    logger,
    interval = DEFAULT_INTERVAL,
  } = deps;

  let timer: ReturnType<typeof setInterval> | null = null;
  let counter = 0;

  async function tick(): Promise<void> {
    for (const agent of agentConfigs) {
      if (!agent.agentDir) continue;

      try {
        const content = await memoryManager.load(agent.agentDir, "heartbeat");
        if (!content || content.trim() === "") continue;

        counter++;

        const message: IncomingMessage = {
          id: `heartbeat-${agent.id}-${counter}`,
          channelType: "internal",
          accountId: "system",
          sourceType: "heartbeat",
          senderId: "heartbeat",
          senderName: `heartbeat:${agent.id}`,
          content,
          timestamp: new Date(),
          metadata: { heartbeatAgentId: agent.id },
        };

        eventBus.emit("message:received", { message });

        logger.debug(
          { agentId: agent.id, messageId: message.id },
          "Heartbeat message emitted",
        );
      } catch (err) {
        logger.error(
          { agentId: agent.id, error: err },
          "Heartbeat tick failed for agent",
        );
      }
    }
  }

  return {
    start(): void {
      if (timer) {
        logger.warn("HeartbeatExecutor already running, ignoring start()");
        return;
      }

      logger.info(
        { interval, agentCount: agentConfigs.length },
        "HeartbeatExecutor started",
      );

      // Run first tick immediately, then on interval
      tick().catch((err) =>
        logger.error({ error: err }, "Initial heartbeat tick failed"),
      );

      timer = setInterval(() => {
        tick().catch((err) =>
          logger.error({ error: err }, "Heartbeat tick failed"),
        );
      }, interval);
    },

    stop(): void {
      if (timer) {
        clearInterval(timer);
        timer = null;
        logger.info("HeartbeatExecutor stopped");
      }
    },
  };
}
