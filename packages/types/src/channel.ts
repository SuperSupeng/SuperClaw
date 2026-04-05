// ============================================================================
// Channel — 渠道
// ============================================================================
// 外部通信渠道的抽象。所有渠道实现统一的 MessageAdapter 接口。
// 内置渠道类型：discord, feishu, dingtalk, telegram, cli, webhook
//
// CLI 也是一等渠道——用户在终端直接和 Agent 对话。
// ============================================================================

import type { IncomingMessage, OutgoingMessage, MessageTarget } from "./message.js";

/** 内置渠道类型 */
export type BuiltinChannelType =
  | "discord"
  | "feishu"
  | "dingtalk"
  | "telegram"
  | "cli"
  | "webhook";

/** 渠道账号配置（一个渠道可以有多个 Bot 账号） */
export interface ChannelAccountConfig {
  /** 账号 ID */
  id: string;
  /** 认证 token（支持环境变量引用） */
  token?: string;
  /** DM 消息策略 */
  dmPolicy?: "allow" | "deny" | "allowlist";
  /** 群组消息策略 */
  groupPolicy?: "mention" | "all" | "none";
  /** 允许的发送者 ID 列表（白名单） */
  allowFrom?: string[];
  /** 渠道特有配置 */
  extra?: Record<string, unknown>;
}

/** 渠道配置 */
export interface ChannelConfig {
  /** 渠道类型 */
  type: string;
  /** 是否启用 */
  enabled: boolean;
  /** 该渠道下的 Bot 账号 */
  accounts: Record<string, ChannelAccountConfig>;
}

// ─── 运行时接口 ───────────────────────────────────────────────────────────────

/**
 * MessageAdapter 接口——每个渠道必须实现
 *
 * 这是 Channel 层的核心抽象。Discord、飞书、CLI 等渠道
 * 各自实现这个接口，对 Router 层暴露统一的消息收发能力。
 */
export interface MessageAdapter {
  /** 渠道类型标识 */
  readonly channelType: string;

  /**
   * 连接渠道（启动 Bot、建立 WebSocket 等）
   * 对于 CLI 渠道，启动 stdin 监听
   */
  connect(): Promise<void>;

  /** 断开连接 */
  disconnect(): Promise<void>;

  /**
   * 发送消息到指定目标
   * @param accountId - 使用哪个 Bot 账号发送
   * @param target - 发送目标（用户 DM / 群组 / 频道）
   * @param message - 消息内容
   */
  sendMessage(
    accountId: string,
    target: MessageTarget,
    message: OutgoingMessage,
  ): Promise<void>;

  /**
   * 注册消息处理器
   * 当渠道收到新消息时，调用 handler
   */
  onMessage(handler: (message: IncomingMessage) => void): void;

  /** 获取所有已连接的账号 ID */
  getConnectedAccounts(): string[];
}
