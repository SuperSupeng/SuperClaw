// ============================================================================
// Signal — 信号
// ============================================================================
// 异步跨 Agent 消息，是团队协作的核心通信机制。
// 设计原则：异步优于实时。每个信号有 SLA，超时告警。
// ============================================================================

/** 信号优先级 */
export type SignalPriority = "critical" | "high" | "normal" | "low";

/** 信号状态 */
export type SignalStatus = "pending" | "delivered" | "consumed" | "expired" | "failed";

/** 信号定义（配置文件中定义信号类型） */
export interface SignalTypeConfig {
  /** 信号类型标识 */
  type: string;
  /** 描述 */
  description: string;
  /** 默认优先级 */
  defaultPriority?: SignalPriority;
  /** 默认 SLA（如 "5m", "1h", "1d"） */
  defaultSla?: string;
  /** 默认过期时间 */
  defaultTtl?: string;
}

/** 信号实例（运行时产生的信号） */
export interface Signal {
  /** 信号唯一 ID */
  id: string;
  /** 信号类型 */
  type: string;
  /** 发送者 Agent ID */
  from: string;
  /** 接收者 Agent ID 列表 */
  to: string[];
  /** 优先级 */
  priority: SignalPriority;
  /** 信号内容 */
  payload: unknown;
  /** 状态 */
  status: SignalStatus;
  /** 创建时间 */
  createdAt: Date;
  /** 过期时间 */
  expiresAt?: Date;
  /** SLA 截止时间 */
  slaDeadline?: Date;
  /** 被消费的时间 */
  consumedAt?: Date;
  /** 消费者 Agent ID */
  consumedBy?: string;
}
