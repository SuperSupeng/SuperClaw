// ============================================================================
// Message — 统一消息格式
// ============================================================================
// 所有渠道的消息都转换为统一的 IncomingMessage / OutgoingMessage 格式。
// 核心设计：球权原则——每轮交互结束，球必须在某一方手里（nextActions）。
// ============================================================================

/** 消息来源类型 */
export type MessageSourceType = "dm" | "group" | "channel" | "cli" | "webhook" | "signal" | "cron";

/** 附件 */
export interface Attachment {
  /** 附件类型 */
  type: "image" | "file" | "audio" | "video" | "link";
  /** URL 或本地路径 */
  url: string;
  /** 文件名 */
  name?: string;
  /** MIME 类型 */
  mimeType?: string;
  /** 文件大小（字节） */
  size?: number;
}

/** 收到的消息（来自渠道） */
export interface IncomingMessage {
  /** 消息唯一 ID */
  id: string;
  /** 渠道类型 */
  channelType: string;
  /** Bot 账号 ID */
  accountId: string;
  /** 来源类型（DM / 群组 / CLI 等） */
  sourceType: MessageSourceType;
  /** 发送者 ID（渠道内的用户标识） */
  senderId: string;
  /** 发送者名称 */
  senderName?: string;
  /** 群组/频道 ID（仅 group/channel 类型） */
  groupId?: string;
  /** 文本内容 */
  content: string;
  /** 附件 */
  attachments?: Attachment[];
  /** 是否是回复某条消息 */
  replyTo?: string;
  /** 消息时间戳 */
  timestamp: Date;
  /** 渠道原始元数据 */
  metadata: Record<string, unknown>;
}

/** 下一步操作选项（球权原则） */
export interface NextAction {
  /** 操作标签（展示给用户） */
  label: string;
  /** 操作标识（用于程序处理） */
  action: string;
  /** 操作描述 */
  description?: string;
}

/** 决策类型（沙漏原则） */
export type DecisionType =
  | 1  // Type 1: 不可逆决策，需要人类审批
  | 2; // Type 2: 可逆决策，Agent 自主执行

/** 发出的消息（Agent 回复） */
export interface OutgoingMessage {
  /** 文本内容 */
  content: string;
  /** 附件 */
  attachments?: Attachment[];
  /** 球权：下一步操作选项（2-4 个） */
  nextActions?: NextAction[];
  /** 决策类型标记 */
  decisionType?: DecisionType;
  /** 回复目标消息 ID */
  replyTo?: string;
  /** 渠道特有元数据 */
  metadata?: Record<string, unknown>;
}

/** 消息发送目标 */
export interface MessageTarget {
  /** 目标类型 */
  type: "dm" | "group" | "channel";
  /** 目标 ID（用户 ID / 群组 ID / 频道 ID） */
  id: string;
}
