// ============================================================================
// Events — 事件系统
// ============================================================================
// SuperClaw 内部事件总线的事件类型定义。
// 所有模块通过事件解耦：渠道收到消息 → 路由分发 → Agent 处理 → 回复发送
// ============================================================================

import type { IncomingMessage, OutgoingMessage } from "./message.js";
import type { Signal } from "./signal.js";
import type { AgentStatus } from "./agent.js";

/** 所有事件类型映射 */
export interface EventMap {
  // ─── 消息生命周期 ─────────────────────────────────────
  /** 渠道收到原始消息 */
  "message:received": { message: IncomingMessage };
  /** 消息被路由到 Agent */
  "message:routed": { message: IncomingMessage; agentId: string };
  /** Agent 开始处理消息 */
  "message:processing": { messageId: string; agentId: string };
  /** Agent 处理完毕，产出回复 */
  "message:responded": {
    messageId: string;
    agentId: string;
    response: OutgoingMessage;
  };
  /** 回复已发送到渠道 */
  "message:sent": { messageId: string; channelType: string; accountId: string };
  /** 消息处理出错 */
  "message:error": { messageId: string; agentId: string; error: Error };

  // ─── Agent 生命周期 ────────────────────────────────────
  /** Agent 状态变更 */
  "agent:status": { agentId: string; status: AgentStatus; previousStatus: AgentStatus };
  /** Agent 启动完成 */
  "agent:ready": { agentId: string };
  /** Agent 发生错误 */
  "agent:error": { agentId: string; error: Error };

  // ─── 信号 ──────────────────────────────────────────────
  /** 新信号产生 */
  "signal:created": { signal: Signal };
  /** 信号被消费 */
  "signal:consumed": { signal: Signal };
  /** 信号超时 */
  "signal:expired": { signal: Signal };
  /** 信号 SLA 超时告警 */
  "signal:sla-breach": { signal: Signal };

  // ─── 系统 ──────────────────────────────────────────────
  /** 配置文件变更 */
  "config:changed": { path: string };
  /** 系统就绪（所有 Agent 启动完毕） */
  "system:ready": { agentCount: number };
  /** 系统关闭 */
  "system:shutdown": { reason: string };
  /** 健康检查 */
  "system:health": { status: "healthy" | "degraded" | "unhealthy" };
}

/** 事件名称类型 */
export type EventName = keyof EventMap;

/** 事件处理器 */
export type EventHandler<E extends EventName> = (data: EventMap[E]) => void | Promise<void>;

/** 事件总线接口 */
export interface EventBus {
  on<E extends EventName>(event: E, handler: EventHandler<E>): void;
  off<E extends EventName>(event: E, handler: EventHandler<E>): void;
  emit<E extends EventName>(event: E, data: EventMap[E]): void;
  once<E extends EventName>(event: E, handler: EventHandler<E>): void;
}
