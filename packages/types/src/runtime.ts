// ============================================================================
// Runtime — 运行时核心接口
// ============================================================================
// 定义 Agent Runtime、Boot Sequence、SuperClaw App 的核心接口。
// 这些接口由 packages/core 实现。
// ============================================================================

import type { AgentConfig, AgentInstance } from "./agent.js";
import type { IncomingMessage, OutgoingMessage } from "./message.js";
import type { SuperClawConfig } from "./config.js";
import type { EventBus } from "./events.js";

/** Agent Boot Sequence 的 8 个步骤 */
export type BootStep =
  | "load-company-state"   // 1. 加载组织状态
  | "load-soul"            // 2. 加载角色定义
  | "load-knowledge"       // 3. 加载知识库协议
  | "load-user-profile"    // 4. 加载人类档案
  | "load-focus"           // 5. 加载当前焦点
  | "load-signals"         // 6. 扫描信号收件箱
  | "cleanup-expired"      // 7. 清理过期记忆
  | "ready";               // 8. 开始工作

/** Boot Sequence 进度回调 */
export interface BootProgress {
  step: BootStep;
  stepIndex: number;
  totalSteps: number;
  message: string;
}

/** Agent 运行时接口——由 core 实现 */
export interface AgentRuntime {
  /** Agent 配置 */
  readonly config: AgentConfig;
  /** 运行时实例信息 */
  readonly instance: AgentInstance;

  /**
   * 执行 Boot Sequence
   * @param onProgress - 进度回调
   */
  boot(onProgress?: (progress: BootProgress) => void): Promise<void>;

  /**
   * 处理收到的消息，返回回复
   * 这是 Agent Loop 的核心：
   * 1. 构建上下文（记忆 + 知识 + 历史）
   * 2. 调用模型
   * 3. 如果模型请求工具调用 → 执行工具 → 再调用模型
   * 4. 返回最终回复
   */
  handleMessage(message: IncomingMessage): Promise<OutgoingMessage>;

  /** 关闭 Agent，释放资源 */
  shutdown(): Promise<void>;
}

/** SuperClaw 应用实例接口——顶层编排 */
export interface SuperClawApp {
  /** 当前配置 */
  readonly config: SuperClawConfig;
  /** 事件总线 */
  readonly events: EventBus;

  /** 启动应用：加载配置 → 初始化渠道 → 启动 Agent → 就绪 */
  start(): Promise<void>;
  /** 关闭应用 */
  stop(): Promise<void>;
  /** 获取 Agent 实例 */
  getAgent(agentId: string): AgentRuntime | undefined;
  /** 获取所有 Agent 实例 */
  getAllAgents(): AgentRuntime[];
}
