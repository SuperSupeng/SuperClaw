// ============================================================================
// Agent Manager — 管理多个 Agent 的启动、关闭和查询
// ============================================================================

import type {
  AgentConfig,
  AgentRuntime,
  BootProgress,
  EventBus,
  MemoryManager,
} from "@superclaw/types";
import type { Logger } from "pino";
import type { ModelRouter } from "../model/model-router.js";
import type { ToolRegistry } from "../tool/tool-registry.js";
import type { DelegationManager } from "../team/delegation.js";
import { createAgentRuntime } from "./agent-loop.js";
import type { AgentDeps } from "./agent-loop.js";

/** Agent Manager 依赖 */
export interface AgentManagerDeps {
  modelRouter: ModelRouter;
  toolRegistryFactory: (config: AgentConfig) => ToolRegistry;
  memoryManager: MemoryManager;
  eventBus: EventBus;
  logger: Logger;
  /** 可选的委托管理器 */
  delegationManager?: DelegationManager;
}

/** Agent Manager 接口 */
export interface AgentManager {
  /** 并行启动所有 Agent */
  bootAll(onProgress?: (agentId: string, progress: BootProgress) => void): Promise<void>;
  /** 关闭所有 Agent */
  shutdownAll(): Promise<void>;
  /** 获取指定 Agent */
  getAgent(id: string): AgentRuntime | undefined;
  /** 获取所有 Agent */
  getAllAgents(): AgentRuntime[];
}

/** 启动结果 */
interface BootResult {
  agentId: string;
  success: boolean;
  error?: string;
}

/**
 * 创建 Agent 管理器
 */
export function createAgentManager(
  agents: AgentConfig[],
  deps: AgentManagerDeps,
): AgentManager {
  const { modelRouter, toolRegistryFactory, memoryManager, eventBus, logger, delegationManager } = deps;
  const log = logger.child({ module: "agent-manager" });

  const runtimeMap = new Map<string, AgentRuntime>();

  return {
    async bootAll(
      onProgress?: (agentId: string, progress: BootProgress) => void,
    ): Promise<void> {
      log.info("Booting %d agents...", agents.length);

      // 为每个 Agent 创建运行时
      for (const agentConfig of agents) {
        const toolRegistry = toolRegistryFactory(agentConfig);
        const agentDeps: AgentDeps = {
          modelRouter,
          toolRegistry,
          memoryManager,
          eventBus,
          logger: logger.child({ agentId: agentConfig.id }),
          delegationManager,
        };
        const runtime = createAgentRuntime(agentConfig, agentDeps);
        runtimeMap.set(agentConfig.id, runtime);
      }

      // 并行启动
      const results = await Promise.allSettled(
        Array.from(runtimeMap.entries()).map(async ([agentId, runtime]) => {
          try {
            await runtime.boot((progress) => {
              onProgress?.(agentId, progress);
            });
            return { agentId, success: true } satisfies BootResult;
          } catch (err) {
            const error = err instanceof Error ? err.message : String(err);
            log.error({ agentId, error }, "Agent boot failed");
            return { agentId, success: false, error } satisfies BootResult;
          }
        }),
      );

      // 汇总结果
      let successCount = 0;
      let failCount = 0;
      for (const result of results) {
        if (result.status === "fulfilled") {
          if (result.value.success) {
            successCount++;
          } else {
            failCount++;
          }
        } else {
          failCount++;
        }
      }

      log.info(
        "Boot complete: %d succeeded, %d failed out of %d agents",
        successCount,
        failCount,
        agents.length,
      );

      eventBus.emit("system:ready", { agentCount: successCount });
    },

    async shutdownAll(): Promise<void> {
      log.info("Shutting down all agents...");
      const promises = Array.from(runtimeMap.values()).map(async (runtime) => {
        try {
          await runtime.shutdown();
        } catch (err) {
          log.error(
            { agentId: runtime.config.id, error: err },
            "Agent shutdown failed",
          );
        }
      });
      await Promise.allSettled(promises);
      runtimeMap.clear();
      log.info("All agents shut down");
    },

    getAgent(id: string): AgentRuntime | undefined {
      return runtimeMap.get(id);
    },

    getAllAgents(): AgentRuntime[] {
      return Array.from(runtimeMap.values());
    },
  };
}
