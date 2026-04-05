// ============================================================================
// Binding — 绑定
// ============================================================================
// Channel Account ↔ Agent 的映射规则。
// 决定"哪个渠道的哪个 Bot 由哪个 Agent 驱动"。
// ============================================================================

/** 绑定过滤规则 */
export interface BindingFilter {
  /** 只匹配特定来源类型 */
  sourceTypes?: ("dm" | "group" | "channel")[];
  /** 只匹配特定群组 */
  groupIds?: string[];
  /** 只匹配特定发送者 */
  senderIds?: string[];
  /** 正则匹配消息内容 */
  contentPattern?: string;
}

/** 绑定配置 */
export interface BindingConfig {
  /** 渠道类型（如 "discord", "feishu", "cli"） */
  channel: string;
  /** 渠道内的 Bot 账号 ID */
  account: string;
  /** 绑定的 Agent ID */
  agent: string;
  /** 可选过滤规则（不设则匹配所有消息） */
  filter?: BindingFilter;
  /** 优先级（多条 binding 匹配时取最高） */
  priority?: number;
}
