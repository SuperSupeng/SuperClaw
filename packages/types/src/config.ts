// ============================================================================
// Config — 完整配置文件 Schema
// ============================================================================
// superclaw.config.json / superclaw.config.yaml 的完整类型定义。
// 这是用户和框架之间的核心合同。
// ============================================================================

import type { AgentConfig } from "./agent.js";
import type { TeamConfig } from "./team.js";
import type { ChannelConfig } from "./channel.js";
import type { BindingConfig } from "./binding.js";
import type { ProviderConfig } from "./model.js";
import type { SignalTypeConfig } from "./signal.js";

/** MCP Server 配置 */
export interface MCPServerConfig {
  /** MCP Server 标识 */
  id: string;
  /** 启动命令 */
  command: string;
  /** 启动参数 */
  args?: string[];
  /** 环境变量 */
  env?: Record<string, string>;
  /** Schema 校验：是否在注册时校验工具定义合规性 */
  validateSchema?: boolean;
}

/** Gateway 配置 */
export interface GatewayConfig {
  /** 端口 */
  port?: number;
  /** 运行模式 */
  mode?: "development" | "production";
  /** 认证 token */
  authToken?: string;
  /** 健康检查路径 */
  healthPath?: string;
}

/** Router 配置 */
export interface RouterConfig {
  /** 按渠道类型设置消息去重延迟（毫秒） */
  debounce?: Record<string, number>;
  /** 消息队列最大长度 */
  maxQueueSize?: number;
}

/** Agent 默认配置（全局默认，可被单个 Agent 覆盖） */
export interface AgentDefaultsConfig {
  /** 默认模型 */
  model?: {
    primary: string;
    fallbacks?: string[];
  };
  /** 默认工具 */
  tools?: string[];
  /** 默认沙箱配置 */
  sandbox?: {
    maxExecutionTime?: number;
    maxMemory?: number;
  };
}

/** Cron 调度配置 */
export interface CronConfig {
  /** 是否启用 */
  enabled?: boolean;
  /** Cron 状态持久化路径 */
  store?: string;
  /** Cron 任务定义 */
  jobs?: CronJobConfig[];
}

/** Cron 任务配置 */
export interface CronJobConfig {
  /** 任务 ID */
  id: string;
  /** Cron 表达式 */
  schedule: string;
  /** 触发的 Agent ID */
  agent: string;
  /** 触发时发送的消息内容 */
  message: string;
  /** 是否启用 */
  enabled?: boolean;
}

/** 浏览器配置（用于 web 工具） */
export interface BrowserConfig {
  /** 是否无头模式 */
  headless?: boolean;
  /** 代理 */
  proxy?: string;
}

/** 完整配置文件类型 */
export interface SuperClawConfig {
  /** 配置版本号 */
  version: string;

  /** 项目名称 */
  name?: string;

  /** 模型 Provider 列表 */
  providers: Record<string, ProviderConfig>;

  /** Agent 列表 */
  agents: AgentConfig[];

  /** Agent 全局默认配置 */
  agentDefaults?: AgentDefaultsConfig;

  /** 团队定义 */
  teams?: TeamConfig[];

  /** 渠道配置 */
  channels: Record<string, ChannelConfig>;

  /** 绑定规则 */
  bindings: BindingConfig[];

  /** 信号类型定义 */
  signalTypes?: SignalTypeConfig[];

  /** MCP Servers */
  mcp?: {
    servers: MCPServerConfig[];
  };

  /** Gateway 配置 */
  gateway?: GatewayConfig;

  /** Router 配置 */
  router?: RouterConfig;

  /** Cron 配置 */
  cron?: CronConfig;

  /** 浏览器配置 */
  browser?: BrowserConfig;

  /** 插件 */
  plugins?: Record<string, Record<string, unknown>>;
}
