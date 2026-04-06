// ============================================================================
// CronScheduler — 定时任务调度
// ============================================================================

import * as fs from "node:fs";
import * as path from "node:path";
import type { CronConfig, CronJobConfig, EventBus, IncomingMessage } from "@superclaw/types";
import type { Logger } from "pino";

/** Cron 依赖 */
export interface CronDeps {
  eventBus: EventBus;
  logger: Logger;
}

/** Cron 任务运行状态 */
export interface CronJobStatus {
  id: string;
  schedule: string;
  agentId: string;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
}

/** Cron 调度器接口 */
export interface CronScheduler {
  start(): void;
  stop(): void;
  getJobs(): CronJobStatus[];
  addJob(job: CronJobConfig): void;
  removeJob(jobId: string): void;
}

/** 持久化格式 */
interface CronStore {
  lastRuns: Record<string, string>; // jobId -> ISO timestamp
}

/**
 * 解析简单 cron 表达式
 * 支持两种格式：
 * - `* /N` (无空格) 分钟 — 每 N 分钟执行一次
 * - `HH:MM` — 每天在指定时间执行
 *
 * 返回：当前分钟是否应该触发
 */
function shouldFire(schedule: string, now: Date, lastRun: Date | undefined): boolean {
  const trimmed = schedule.trim();

  // 格式 1: */N — 每 N 分钟
  const intervalMatch = trimmed.match(/^\*\/(\d+)$/);
  if (intervalMatch) {
    const intervalMinutes = parseInt(intervalMatch[1]!, 10);
    if (intervalMinutes <= 0) return false;
    if (!lastRun) return true; // 首次立即触发
    const elapsed = (now.getTime() - lastRun.getTime()) / 60_000;
    return elapsed >= intervalMinutes;
  }

  // 格式 2: HH:MM — 每天定时
  const timeMatch = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (timeMatch) {
    const hour = parseInt(timeMatch[1]!, 10);
    const minute = parseInt(timeMatch[2]!, 10);
    if (now.getHours() === hour && now.getMinutes() === minute) {
      // 避免同一分钟重复触发
      if (lastRun) {
        const lastMinute = lastRun.getHours() * 60 + lastRun.getMinutes();
        const nowMinute = now.getHours() * 60 + now.getMinutes();
        const lastDay = lastRun.toDateString();
        const nowDay = now.toDateString();
        if (lastDay === nowDay && lastMinute === nowMinute) return false;
      }
      return true;
    }
    return false;
  }

  return false;
}

function loadStore(storePath: string): CronStore {
  try {
    const raw = fs.readFileSync(storePath, "utf-8");
    return JSON.parse(raw) as CronStore;
  } catch {
    return { lastRuns: {} };
  }
}

function saveStore(storePath: string, store: CronStore): void {
  const dir = path.dirname(storePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(storePath, JSON.stringify(store, null, 2), "utf-8");
}

let cronMsgCounter = 0;

/**
 * 创建 Cron 调度器
 */
export function createCronScheduler(config: CronConfig, deps: CronDeps): CronScheduler {
  const { eventBus, logger } = deps;
  const log = logger.child({ module: "cron" });

  const jobs = new Map<string, CronJobConfig>();
  const lastRuns = new Map<string, Date>();
  let timer: ReturnType<typeof setInterval> | null = null;

  // 初始化 jobs
  if (config.jobs) {
    for (const job of config.jobs) {
      jobs.set(job.id, job);
    }
  }

  // 加载持久化状态
  if (config.store) {
    const store = loadStore(config.store);
    for (const [jobId, ts] of Object.entries(store.lastRuns)) {
      lastRuns.set(jobId, new Date(ts));
    }
  }

  function persistLastRuns(): void {
    if (!config.store) return;
    const store: CronStore = { lastRuns: {} };
    for (const [jobId, date] of lastRuns) {
      store.lastRuns[jobId] = date.toISOString();
    }
    try {
      saveStore(config.store, store);
    } catch (err) {
      log.error({ err }, "Failed to persist cron store");
    }
  }

  function tick(): void {
    const now = new Date();
    for (const [jobId, job] of jobs) {
      if (job.enabled === false) continue;
      const last = lastRuns.get(jobId);
      if (shouldFire(job.schedule, now, last)) {
        log.info({ jobId, agentId: job.agent }, "Cron job fired");
        lastRuns.set(jobId, now);

        const message: IncomingMessage = {
          id: `cron-${jobId}-${++cronMsgCounter}`,
          channelType: "internal",
          accountId: "system",
          sourceType: "cron",
          senderId: "cron",
          senderName: `cron:${jobId}`,
          content: job.message,
          timestamp: now,
          metadata: { cronJobId: jobId },
        };

        eventBus.emit("cron:fired", { jobId, agentId: job.agent });
        eventBus.emit("message:received", { message });

        persistLastRuns();
      }
    }
  }

  return {
    start(): void {
      if (timer) return;
      log.info("Cron scheduler started");
      // 每 60 秒检查一次
      timer = setInterval(tick, 60_000);
      // 启动时也立即检查一次
      tick();
    },

    stop(): void {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      log.info("Cron scheduler stopped");
    },

    getJobs(): CronJobStatus[] {
      const result: CronJobStatus[] = [];
      for (const [_jobId, job] of jobs) {
        result.push({
          id: job.id,
          schedule: job.schedule,
          agentId: job.agent,
          enabled: job.enabled !== false,
          lastRun: lastRuns.get(job.id),
          nextRun: undefined, // 简单实现不计算 nextRun
        });
      }
      return result;
    },

    addJob(job: CronJobConfig): void {
      jobs.set(job.id, job);
      log.info({ jobId: job.id }, "Cron job added");
    },

    removeJob(jobId: string): void {
      jobs.delete(jobId);
      lastRuns.delete(jobId);
      log.info({ jobId }, "Cron job removed");
    },
  };
}
