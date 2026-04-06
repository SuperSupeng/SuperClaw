// ============================================================================
// LaneManager — 执行上下文隔离
// ============================================================================

import type { Logger } from "pino";

/** Lane 名称 */
export type LaneName = "main" | "subagent" | "team" | "cron";

/** Lane 占用句柄 */
export interface LaneHandle {
  lane: LaneName;
  agentId: string;
  release(): void;
}

/** Lane Manager 接口 */
export interface LaneManager {
  acquire(lane: LaneName, agentId: string): LaneHandle;
  getActiveLanes(): Map<LaneName, string[]>;
  getLaneForAgent(agentId: string): LaneName | undefined;
}

/** 默认每个 Lane 最多 10 个并行 Agent */
const DEFAULT_MAX_CONCURRENCY = 10;

/**
 * 创建 Lane Manager
 */
export function createLaneManager(
  logger: Logger,
  maxConcurrency: number = DEFAULT_MAX_CONCURRENCY,
): LaneManager {
  const log = logger.child({ module: "lane" });

  // lane -> set of agentIds
  const lanes = new Map<LaneName, Set<string>>([
    ["main", new Set()],
    ["subagent", new Set()],
    ["team", new Set()],
    ["cron", new Set()],
  ]);

  // agentId -> lane (反向索引)
  const agentLane = new Map<string, LaneName>();

  return {
    acquire(lane: LaneName, agentId: string): LaneHandle {
      // 检查 agent 是否已在另一个 lane 中
      const existing = agentLane.get(agentId);
      if (existing) {
        throw new Error(
          `Agent ${agentId} is already in lane "${existing}", cannot acquire lane "${lane}"`,
        );
      }

      const laneSet = lanes.get(lane)!;
      if (laneSet.size >= maxConcurrency) {
        throw new Error(
          `Lane "${lane}" has reached max concurrency (${maxConcurrency})`,
        );
      }

      laneSet.add(agentId);
      agentLane.set(agentId, lane);
      log.debug({ lane, agentId }, "Lane acquired");

      let released = false;
      return {
        lane,
        agentId,
        release(): void {
          if (released) return;
          released = true;
          laneSet.delete(agentId);
          agentLane.delete(agentId);
          log.debug({ lane, agentId }, "Lane released");
        },
      };
    },

    getActiveLanes(): Map<LaneName, string[]> {
      const result = new Map<LaneName, string[]>();
      for (const [name, agents] of lanes) {
        result.set(name, [...agents]);
      }
      return result;
    },

    getLaneForAgent(agentId: string): LaneName | undefined {
      return agentLane.get(agentId);
    },
  };
}
