// ============================================================================
// Message Queue — 内存消息队列（per-agent + debounce）
// ============================================================================

import type { IncomingMessage, RouterConfig } from "@superclaw-ai/types";
import type { Logger } from "pino";

/** MessageQueue 接口 */
export interface MessageQueue {
  enqueue(agentId: string, message: IncomingMessage): void;
  dequeue(agentId: string): IncomingMessage | null;
  size(agentId: string): number;
}

interface QueueEntry {
  message: IncomingMessage;
  enqueuedAt: number;
}

/**
 * 创建内存消息队列
 *
 * - per-agent 独立队列（Map<agentId, Queue>）
 * - debounce：同一来源在 N ms 内的多条消息合并
 * - 队列满时丢弃最旧消息
 */
export function createMessageQueue(config: RouterConfig, logger: Logger): MessageQueue {
  const maxQueueSize = config.maxQueueSize ?? 100;
  const debounceConfig = config.debounce ?? {};

  // agentId → 消息队列
  const queues = new Map<string, QueueEntry[]>();

  // 用于 debounce：sourceKey → { timer, messages }
  const debounceMap = new Map<
    string,
    { timer: ReturnType<typeof setTimeout>; lastMessage: IncomingMessage; agentId: string }
  >();

  function getQueue(agentId: string): QueueEntry[] {
    let q = queues.get(agentId);
    if (!q) {
      q = [];
      queues.set(agentId, q);
    }
    return q;
  }

  function pushToQueue(agentId: string, message: IncomingMessage): void {
    const q = getQueue(agentId);

    // 队列满时丢弃最旧消息
    if (q.length >= maxQueueSize) {
      const dropped = q.shift();
      logger.warn(
        { agentId, droppedMessageId: dropped?.message.id, queueSize: q.length },
        "Message queue full, dropping oldest message",
      );
    }

    q.push({ message, enqueuedAt: Date.now() });
  }

  /**
   * 生成 debounce key：channelType + accountId + senderId
   */
  function debounceKey(agentId: string, msg: IncomingMessage): string {
    return `${agentId}:${msg.channelType}:${msg.accountId}:${msg.senderId}`;
  }

  return {
    enqueue(agentId: string, message: IncomingMessage): void {
      const debounceMs = debounceConfig[message.channelType];

      if (debounceMs && debounceMs > 0) {
        const key = debounceKey(agentId, message);
        const existing = debounceMap.get(key);

        if (existing) {
          // 合并：取最新消息的内容追加到前一条
          clearTimeout(existing.timer);
          const merged: IncomingMessage = {
            ...existing.lastMessage,
            content: existing.lastMessage.content + "\n" + message.content,
            // 保留最新时间戳
            timestamp: message.timestamp,
          };

          const timer = setTimeout(() => {
            debounceMap.delete(key);
            pushToQueue(agentId, merged);
          }, debounceMs);

          debounceMap.set(key, { timer, lastMessage: merged, agentId });
        } else {
          const timer = setTimeout(() => {
            debounceMap.delete(key);
            pushToQueue(agentId, message);
          }, debounceMs);

          debounceMap.set(key, { timer, lastMessage: message, agentId });
        }
      } else {
        // 无 debounce，直接入队
        pushToQueue(agentId, message);
      }
    },

    dequeue(agentId: string): IncomingMessage | null {
      const q = queues.get(agentId);
      if (!q || q.length === 0) return null;
      const entry = q.shift()!;
      return entry.message;
    },

    size(agentId: string): number {
      return queues.get(agentId)?.length ?? 0;
    },
  };
}
