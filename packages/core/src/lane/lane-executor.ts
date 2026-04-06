// ============================================================================
// LaneExecutor — 在指定 Lane 中执行函数（自动 acquire/release + 异常隔离）
// ============================================================================

import type { Logger } from "pino";
import type { LaneManager, LaneName } from "./lane-manager.js";

/** Lane Executor 接口 */
export interface LaneExecutor {
  execute<T>(lane: LaneName, agentId: string, fn: () => Promise<T>): Promise<T>;
}

/**
 * 创建 Lane Executor
 */
export function createLaneExecutor(laneManager: LaneManager, logger: Logger): LaneExecutor {
  const log = logger.child({ module: "lane-executor" });

  return {
    async execute<T>(lane: LaneName, agentId: string, fn: () => Promise<T>): Promise<T> {
      const handle = laneManager.acquire(lane, agentId);
      try {
        return await fn();
      } catch (err) {
        // 异常隔离：记录但不传播到其他 lane
        log.error(
          { lane, agentId, err },
          "Error in lane execution (isolated)",
        );
        throw err;
      } finally {
        handle.release();
      }
    },
  };
}
