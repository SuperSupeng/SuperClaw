// ============================================================================
// Errors — 错误类型
// ============================================================================
// 统一的错误分类，用于错误隔离和告警分级。
// ============================================================================

/** 错误严重级别 */
export type ErrorSeverity = "fatal" | "error" | "warning";

/** 错误来源模块 */
export type ErrorSource =
  | "config"
  | "agent"
  | "channel"
  | "router"
  | "model"
  | "tool"
  | "memory"
  | "signal"
  | "gateway"
  | "system";

/** SuperClaw 统一错误 */
export interface SuperClawError {
  /** 错误码（如 "AGENT_BOOT_FAILED", "MODEL_CALL_FAILED"） */
  code: string;
  /** 人类可读描述 */
  message: string;
  /** 严重级别 */
  severity: ErrorSeverity;
  /** 来源模块 */
  source: ErrorSource;
  /** 关联的 Agent ID */
  agentId?: string;
  /** 原始错误 */
  cause?: Error;
  /** 时间戳 */
  timestamp: Date;
}

// ─── 预定义错误码 ──────────────────────────────────────────────────────────

export const ErrorCodes = {
  // Config
  CONFIG_NOT_FOUND: "CONFIG_NOT_FOUND",
  CONFIG_INVALID: "CONFIG_INVALID",
  CONFIG_PROVIDER_MISSING: "CONFIG_PROVIDER_MISSING",

  // Agent
  AGENT_BOOT_FAILED: "AGENT_BOOT_FAILED",
  AGENT_SOUL_NOT_FOUND: "AGENT_SOUL_NOT_FOUND",
  AGENT_NOT_FOUND: "AGENT_NOT_FOUND",

  // Model
  MODEL_CALL_FAILED: "MODEL_CALL_FAILED",
  MODEL_ALL_FALLBACKS_FAILED: "MODEL_ALL_FALLBACKS_FAILED",
  MODEL_PROVIDER_NOT_FOUND: "MODEL_PROVIDER_NOT_FOUND",

  // Channel
  CHANNEL_CONNECT_FAILED: "CHANNEL_CONNECT_FAILED",
  CHANNEL_SEND_FAILED: "CHANNEL_SEND_FAILED",
  CHANNEL_ACCOUNT_NOT_FOUND: "CHANNEL_ACCOUNT_NOT_FOUND",

  // Tool
  TOOL_EXECUTION_FAILED: "TOOL_EXECUTION_FAILED",
  TOOL_SCHEMA_INVALID: "TOOL_SCHEMA_INVALID",
  TOOL_NOT_FOUND: "TOOL_NOT_FOUND",
  TOOL_CLI_NOT_INSTALLED: "TOOL_CLI_NOT_INSTALLED",

  // Router
  ROUTER_NO_BINDING: "ROUTER_NO_BINDING",
  ROUTER_AGENT_UNAVAILABLE: "ROUTER_AGENT_UNAVAILABLE",

  // Signal
  SIGNAL_DELIVERY_FAILED: "SIGNAL_DELIVERY_FAILED",
  SIGNAL_SLA_BREACH: "SIGNAL_SLA_BREACH",

  // System
  SYSTEM_SHUTDOWN: "SYSTEM_SHUTDOWN",
} as const;
