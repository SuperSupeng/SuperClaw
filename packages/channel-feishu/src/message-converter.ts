// ============================================================================
// Message Converter — 消息格式转换
// ============================================================================

import type {
  IncomingMessage,
  OutgoingMessage,
  MessageSourceType,
} from "@superclaw-ai/types";
import type { FeishuMessageEvent } from "./client-manager.js";

/** 飞书消息最大字符数（实际限制更大，这里设一个安全值） */
const FEISHU_MAX_LENGTH = 4000;

/**
 * 将飞书消息事件转换为统一 IncomingMessage
 */
export function feishuToIncoming(
  event: FeishuMessageEvent,
  accountId: string,
): IncomingMessage {
  const msg = event.message;
  const sender = event.sender;

  const isDM = msg.chat_type === "p2p";
  const sourceType: MessageSourceType = isDM ? "dm" : "group";

  // 解析飞书消息 content（JSON 格式）
  let content = "";
  try {
    const parsed = JSON.parse(msg.content) as { text?: string };
    content = parsed.text ?? msg.content;
  } catch {
    content = msg.content;
  }

  // 去掉 @bot mention 文本（飞书中 @bot 形如 @_user_1）
  if (msg.mentions && msg.mentions.length > 0) {
    for (const mention of msg.mentions) {
      content = content.replace(mention.key, "").trim();
    }
  }

  return {
    id: msg.message_id,
    channelType: "feishu",
    accountId,
    sourceType,
    senderId: sender.sender_id.open_id,
    senderName: undefined,
    groupId: isDM ? undefined : msg.chat_id,
    content,
    attachments: undefined,
    replyTo: msg.parent_id ?? undefined,
    timestamp: new Date(Number(msg.create_time)),
    metadata: {
      chatId: msg.chat_id,
      chatType: msg.chat_type,
      messageType: msg.message_type,
      mentions: msg.mentions,
      rootId: msg.root_id,
      tenantKey: sender.tenant_key,
    },
  };
}

/**
 * 将 OutgoingMessage 转换为飞书消息发送参数
 */
export function outgoingToFeishu(message: OutgoingMessage): {
  content: string;
  msg_type: string;
} {
  let content = message.content;

  // 如果有 nextActions，追加描述文字
  if (message.nextActions && message.nextActions.length > 0) {
    const actionsText = message.nextActions
      .map(
        (a) =>
          `- ${a.label}${a.description ? ` — ${a.description}` : ""}`,
      )
      .join("\n");
    content += `\n\n${actionsText}`;
  }

  // 截断超长消息
  if (content.length > FEISHU_MAX_LENGTH) {
    content = content.slice(0, FEISHU_MAX_LENGTH - 3) + "...";
  }

  return {
    content: JSON.stringify({ text: content }),
    msg_type: "text",
  };
}
