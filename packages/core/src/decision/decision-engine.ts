// ============================================================================
// DecisionEngine — 双向门决策引擎
// ============================================================================
// Type 1 (不可逆): 需要人类审批，进入 pending 队列
// Type 2 (可逆): Agent 自主执行，不经过引擎
// ============================================================================

import type { EventBus, OutgoingMessage } from "@superclaw-ai/types";
import type { Logger } from "pino";

/** 决策引擎依赖 */
export interface DecisionDeps {
  eventBus: EventBus;
  logger: Logger;
}

/** 待审批决策 */
export interface PendingDecision {
  id: string;
  agentId: string;
  type: 1;
  description: string;
  options: string[];
  response: OutgoingMessage;
  createdAt: Date;
  resolvedAt?: Date;
  resolution?: string;
}

/** 决策引擎接口 */
export interface DecisionEngine {
  /** Agent 产出 Type 1 决策时调用，暂停等待人类审批 */
  requestApproval(agentId: string, response: OutgoingMessage): Promise<PendingDecision>;
  /** 人类审批通过 */
  approve(decisionId: string, choice?: string): void;
  /** 人类拒绝 */
  reject(decisionId: string, reason?: string): void;
  /** 获取所有待审批 */
  getPending(): PendingDecision[];
  /** 获取指定 agent 的待审批 */
  getPendingByAgent(agentId: string): PendingDecision[];
}

let decisionCounter = 0;

/**
 * 创建决策引擎
 */
export function createDecisionEngine(deps: DecisionDeps): DecisionEngine {
  const { eventBus, logger } = deps;
  const log = logger.child({ module: "decision" });

  const pending = new Map<string, PendingDecision>();
  // resolve/reject callbacks keyed by decisionId
  const callbacks = new Map<
    string,
    { resolve: (decision: PendingDecision) => void; reject: (err: Error) => void }
  >();

  return {
    requestApproval(agentId: string, response: OutgoingMessage): Promise<PendingDecision> {
      const id = `decision-${++decisionCounter}`;
      const description = response.content.slice(0, 200);
      const options = (response.nextActions ?? []).map((a) => a.label);

      const decision: PendingDecision = {
        id,
        agentId,
        type: 1,
        description,
        options,
        response,
        createdAt: new Date(),
      };

      pending.set(id, decision);

      log.info({ decisionId: id, agentId }, "Decision pending approval");
      eventBus.emit("decision:pending", {
        decisionId: id,
        agentId,
        description,
      });

      return new Promise<PendingDecision>((resolve, reject) => {
        callbacks.set(id, { resolve, reject });
      });
    },

    approve(decisionId: string, choice?: string): void {
      const decision = pending.get(decisionId);
      if (!decision) {
        log.warn({ decisionId }, "Approve called on unknown decision");
        return;
      }

      decision.resolvedAt = new Date();
      decision.resolution = choice ?? "approved";
      pending.delete(decisionId);

      log.info({ decisionId, agentId: decision.agentId }, "Decision approved");
      eventBus.emit("decision:resolved", {
        decisionId,
        agentId: decision.agentId,
        approved: true,
      });

      const cb = callbacks.get(decisionId);
      if (cb) {
        callbacks.delete(decisionId);
        cb.resolve(decision);
      }
    },

    reject(decisionId: string, reason?: string): void {
      const decision = pending.get(decisionId);
      if (!decision) {
        log.warn({ decisionId }, "Reject called on unknown decision");
        return;
      }

      decision.resolvedAt = new Date();
      decision.resolution = reason ?? "rejected";
      pending.delete(decisionId);

      log.info({ decisionId, agentId: decision.agentId, reason }, "Decision rejected");
      eventBus.emit("decision:resolved", {
        decisionId,
        agentId: decision.agentId,
        approved: false,
        reason,
      });

      const cb = callbacks.get(decisionId);
      if (cb) {
        callbacks.delete(decisionId);
        cb.reject(new Error(`Decision ${decisionId} rejected: ${reason ?? "no reason"}`));
      }
    },

    getPending(): PendingDecision[] {
      return [...pending.values()];
    },

    getPendingByAgent(agentId: string): PendingDecision[] {
      return [...pending.values()].filter((d) => d.agentId === agentId);
    },
  };
}
