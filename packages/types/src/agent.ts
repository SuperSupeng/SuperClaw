// ============================================================================
// Agent — 数字员工
// ============================================================================
// Agent 是 SuperClaw 的核心原语。每个 Agent 是一个常驻运行的 AI 角色。
// 三层分层：Executive（决策）→ Coordinator（协调）→ Worker（执行）
// ============================================================================

import type { ModelConfig } from "./model.js";
import type { ToolConfig } from "./tool.js";
import type { KnowledgeSourceConfig } from "./knowledge.js";

/** Agent 层级 */
export type AgentTier = "executive" | "coordinator" | "worker";

/** Agent 生命周期 */
export type AgentLifecycle = "persistent" | "ephemeral";

/** Agent 沙箱配置 */
export interface SandboxConfig {
  /** 允许的文件系统路径 */
  allowedPaths?: string[];
  /** 允许的网络域名 */
  allowedDomains?: string[];
  /** 最大执行时间（毫秒） */
  maxExecutionTime?: number;
  /** 最大内存（MB） */
  maxMemory?: number;
}

/** Agent 委托配置 */
export interface DelegationConfig {
  /** 可以委托给哪些 Agent */
  allowAgents: string[];
  /** 委托时是否必须附带 contextDigest（不外包理解原则） */
  requireContextDigest?: boolean;
}

/** Agent 配置（定义在配置文件中） */
export interface AgentConfig {
  /** 唯一标识 */
  id: string;
  /** 显示名称 */
  name: string;
  /** 人格定义文件路径，相对于 agentDir */
  soul: string;
  /** 层级 */
  tier: AgentTier;
  /** 生命周期 */
  lifecycle: AgentLifecycle;
  /** 模型配置 */
  model: ModelConfig;
  /** 可用工具 */
  tools?: ToolConfig[];
  /** 为 true 时自动注册全部框架内置工具（可与 tools 中的 builtin 项组合） */
  includeBuiltins?: boolean;
  /** 知识源 */
  knowledge?: KnowledgeSourceConfig[];
  /** 所属团队 ID */
  team?: string;
  /** Agent 工作目录（存放 SOUL.md, MEMORY.md 等） */
  agentDir?: string;
  /** 工作空间目录（Agent 的文件操作范围） */
  workspace?: string;
  /** 委托配置 */
  delegation?: DelegationConfig;
  /** 沙箱配置 */
  sandbox?: SandboxConfig;
  /** Agent 自定义元数据 */
  metadata?: Record<string, unknown>;
}

/** Agent 运行时状态 */
export type AgentStatus = "booting" | "ready" | "busy" | "error" | "shutdown";

/** Agent 运行时信息（运行中的 Agent 实例） */
export interface AgentInstance {
  /** Agent 配置 */
  config: AgentConfig;
  /** 当前状态 */
  status: AgentStatus;
  /** 启动时间 */
  bootedAt: Date | null;
  /** 处理的消息计数 */
  messageCount: number;
  /** 最后活跃时间 */
  lastActiveAt: Date | null;
  /** 当前错误（如果状态为 error） */
  error?: string;
}
