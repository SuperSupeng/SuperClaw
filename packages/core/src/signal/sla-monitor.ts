// ============================================================================
// SLA Monitor — 信号 SLA 超时监控
// ============================================================================

import type { EventBus } from "@superclaw-ai/types";
import type { Logger } from "pino";
import type { SignalBus } from "./signal-bus.js";

/** SLA 违规记录 */
export interface SLABreach {
  signalId: string;
  signalType: string;
  from: string;
  to: string[];
  slaDeadline: Date;
  breachedAt: Date;
  severity: "warning" | "critical";
}

/** SLA 监控器接口 */
export interface SLAMonitor {
  start(): void;
  stop(): void;
  getBreaches(): SLABreach[];
}

/**
 * 创建 SLA 监控器
 *
 * 每 30 秒扫描所有 pending 信号：
 * - 超过 SLA 50% 时间但未消费 → warning breach
 * - 超过 SLA 截止时间但未消费 → critical breach，emit "signal:sla-breach"
 */
export function createSLAMonitor(
  signalBus: SignalBus,
  eventBus: EventBus,
  logger: Logger,
): SLAMonitor {
  const breaches: SLABreach[] = [];
  // 跟踪已发出的 breach，避免重复告警（signalId:severity）
  const emitted = new Set<string>();
  let timer: ReturnType<typeof setInterval> | null = null;

  function check(): void {
    const now = new Date();
    const allSignals = signalBus.getAll();

    for (const signal of allSignals) {
      if (signal.status !== "pending") continue;
      if (!signal.slaDeadline) continue;

      const deadline = signal.slaDeadline;
      const created = signal.createdAt;
      const totalMs = deadline.getTime() - created.getTime();
      const elapsedMs = now.getTime() - created.getTime();

      // critical: 已过 SLA 截止时间
      if (now >= deadline) {
        const key = `${signal.id}:critical`;
        if (!emitted.has(key)) {
          const breach: SLABreach = {
            signalId: signal.id,
            signalType: signal.type,
            from: signal.from,
            to: signal.to,
            slaDeadline: deadline,
            breachedAt: now,
            severity: "critical",
          };
          breaches.push(breach);
          emitted.add(key);
          logger.warn({ breach }, "SLA critical breach: signal past deadline");
          eventBus.emit("signal:sla-breach", { signal });
        }
        continue;
      }

      // warning: 已过 50% SLA 时间
      if (totalMs > 0 && elapsedMs > totalMs * 0.5) {
        const key = `${signal.id}:warning`;
        if (!emitted.has(key)) {
          const breach: SLABreach = {
            signalId: signal.id,
            signalType: signal.type,
            from: signal.from,
            to: signal.to,
            slaDeadline: deadline,
            breachedAt: now,
            severity: "warning",
          };
          breaches.push(breach);
          emitted.add(key);
          logger.info({ breach }, "SLA warning: signal past 50% of deadline");
        }
      }
    }
  }

  return {
    start(): void {
      if (timer) return;
      logger.info("SLA monitor started (interval: 30s)");
      timer = setInterval(check, 30_000);
      if (timer.unref) {
        timer.unref();
      }
      // 立即执行一次
      check();
    },

    stop(): void {
      if (timer) {
        clearInterval(timer);
        timer = null;
        logger.info("SLA monitor stopped");
      }
    },

    getBreaches(): SLABreach[] {
      return [...breaches];
    },
  };
}
