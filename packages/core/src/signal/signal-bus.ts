// ============================================================================
// SignalBus — 信号总线
// ============================================================================

import { randomUUID } from "node:crypto";
import type { EventBus, Signal, SignalPriority } from "@superclaw-ai/types";

/** 信号总线接口 */
export interface SignalBus {
  send(
    from: string,
    to: string[],
    type: string,
    payload: unknown,
    options?: { priority?: SignalPriority; ttl?: string; sla?: string },
  ): Signal;
  consume(agentId: string, signalType?: string): Signal[];
  getPending(agentId: string): Signal[];
  getAll(): Signal[];
  dispose(): void;
}

/** 解析时间字符串（如 "5m", "1h", "1d"）为毫秒 */
function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return 0;
  const value = parseInt(match[1]!, 10);
  const unit = match[2]!;
  switch (unit) {
    case "s": return value * 1000;
    case "m": return value * 60 * 1000;
    case "h": return value * 60 * 60 * 1000;
    case "d": return value * 24 * 60 * 60 * 1000;
    default: return 0;
  }
}

/**
 * 创建信号总线
 */
export function createSignalBus(eventBus: EventBus): SignalBus {
  const signals = new Map<string, Signal>();

  // 定时器：每分钟扫描过期信号
  const cleanupTimer = setInterval(() => {
    const now = new Date();
    for (const signal of signals.values()) {
      if (signal.status === "pending" && signal.expiresAt && signal.expiresAt < now) {
        signal.status = "expired";
        eventBus.emit("signal:expired", { signal });
      }
      // SLA 告警
      if (
        signal.status === "pending" &&
        signal.slaDeadline &&
        signal.slaDeadline < now
      ) {
        eventBus.emit("signal:sla-breach", { signal });
      }
    }
  }, 60_000);

  // 避免定时器阻止进程退出
  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }

  return {
    send(
      from: string,
      to: string[],
      type: string,
      payload: unknown,
      options?: { priority?: SignalPriority; ttl?: string; sla?: string },
    ): Signal {
      const now = new Date();

      let expiresAt: Date | undefined;
      if (options?.ttl) {
        const ms = parseDuration(options.ttl);
        if (ms > 0) {
          expiresAt = new Date(now.getTime() + ms);
        }
      }

      let slaDeadline: Date | undefined;
      if (options?.sla) {
        const ms = parseDuration(options.sla);
        if (ms > 0) {
          slaDeadline = new Date(now.getTime() + ms);
        }
      }

      const signal: Signal = {
        id: randomUUID(),
        type,
        from,
        to,
        priority: options?.priority ?? "normal",
        payload,
        status: "pending",
        createdAt: now,
        expiresAt,
        slaDeadline,
      };

      signals.set(signal.id, signal);
      eventBus.emit("signal:created", { signal });
      return signal;
    },

    consume(agentId: string, signalType?: string): Signal[] {
      const result: Signal[] = [];

      for (const signal of signals.values()) {
        if (signal.status !== "pending") continue;
        if (!signal.to.includes(agentId)) continue;
        if (signalType && signal.type !== signalType) continue;

        signal.status = "consumed";
        signal.consumedAt = new Date();
        signal.consumedBy = agentId;
        result.push(signal);
        eventBus.emit("signal:consumed", { signal });
      }

      return result;
    },

    getPending(agentId: string): Signal[] {
      const result: Signal[] = [];

      for (const signal of signals.values()) {
        if (signal.status !== "pending") continue;
        if (!signal.to.includes(agentId)) continue;
        result.push(signal);
      }

      return result;
    },

    getAll(): Signal[] {
      return Array.from(signals.values());
    },

    dispose(): void {
      clearInterval(cleanupTimer);
      signals.clear();
    },
  };
}
