// ============================================================================
// Delegation Manager — 任务委托管理
// ============================================================================

import { randomUUID } from "node:crypto";
import type { EventBus } from "@superclaw/types";
import type { Logger } from "pino";
import type { OrganizationTree } from "./organization-tree.js";
import type { AgentManager } from "../agent/agent-manager.js";
import type { SignalBus } from "../signal/signal-bus.js";

/** 委托任务 */
export interface DelegationTask {
  id: string;
  from: string;
  to: string;
  task: string;
  contextDigest: string;
  status: "pending" | "in-progress" | "completed" | "failed";
  result?: string;
  createdAt: Date;
  completedAt?: Date;
}

/** Delegation Manager 依赖 */
export interface DelegationDeps {
  organizationTree: OrganizationTree;
  /** 使用 getter 以支持延迟绑定（打破循环初始化依赖） */
  getAgentManager: () => AgentManager;
  signalBus: SignalBus;
  eventBus: EventBus;
  logger: Logger;
}

/** Delegation Manager 接口 */
export interface DelegationManager {
  delegate(
    from: string,
    to: string,
    task: string,
    contextDigest: string,
  ): Promise<DelegationTask>;
  getTask(taskId: string): DelegationTask | undefined;
  getTasksByAgent(agentId: string): DelegationTask[];
  completeTask(taskId: string, result: string): void;
  failTask(taskId: string, error: string): void;
}

/**
 * 创建委托管理器
 */
export function createDelegationManager(
  deps: DelegationDeps,
): DelegationManager {
  const { organizationTree, getAgentManager, signalBus, eventBus, logger } = deps;
  const log = logger.child({ module: "delegation" });

  const tasks = new Map<string, DelegationTask>();

  return {
    async delegate(
      from: string,
      to: string,
      task: string,
      contextDigest: string,
    ): Promise<DelegationTask> {
      // 1. 权限检查
      if (!organizationTree.canDelegate(from, to)) {
        throw new Error(
          `Agent "${from}" is not allowed to delegate to agent "${to}"`,
        );
      }

      // 2. 检查目标 agent 是否存在
      const toAgent = getAgentManager().getAgent(to);
      if (!toAgent) {
        throw new Error(`Target agent "${to}" not found`);
      }

      // 3. 创建任务
      const delegationTask: DelegationTask = {
        id: randomUUID(),
        from,
        to,
        task,
        contextDigest,
        status: "pending",
        createdAt: new Date(),
      };

      tasks.set(delegationTask.id, delegationTask);

      log.info(
        { taskId: delegationTask.id, from, to },
        "Delegation task created",
      );

      // 4. 通过信号总线发送委托请求
      signalBus.send(from, [to], "delegation-request", {
        taskId: delegationTask.id,
        task,
        contextDigest,
      }, {
        priority: "high",
        sla: "5m",
      });

      eventBus.emit("delegation:created", {
        taskId: delegationTask.id,
        from,
        to,
      });

      return delegationTask;
    },

    getTask(taskId: string): DelegationTask | undefined {
      return tasks.get(taskId);
    },

    getTasksByAgent(agentId: string): DelegationTask[] {
      const result: DelegationTask[] = [];
      for (const t of tasks.values()) {
        if (t.from === agentId || t.to === agentId) {
          result.push(t);
        }
      }
      return result;
    },

    completeTask(taskId: string, result: string): void {
      const t = tasks.get(taskId);
      if (!t) {
        throw new Error(`Delegation task "${taskId}" not found`);
      }
      t.status = "completed";
      t.result = result;
      t.completedAt = new Date();

      log.info({ taskId, from: t.from, to: t.to }, "Delegation task completed");

      // 通知委托方
      signalBus.send(t.to, [t.from], "delegation-result", {
        taskId,
        status: "completed",
        result,
      });

      eventBus.emit("delegation:completed", { taskId, from: t.from, to: t.to, result });
    },

    failTask(taskId: string, error: string): void {
      const t = tasks.get(taskId);
      if (!t) {
        throw new Error(`Delegation task "${taskId}" not found`);
      }
      t.status = "failed";
      t.result = error;
      t.completedAt = new Date();

      log.warn({ taskId, from: t.from, to: t.to, error }, "Delegation task failed");

      signalBus.send(t.to, [t.from], "delegation-result", {
        taskId,
        status: "failed",
        error,
      });

      eventBus.emit("delegation:failed", { taskId, from: t.from, to: t.to, error });
    },
  };
}
