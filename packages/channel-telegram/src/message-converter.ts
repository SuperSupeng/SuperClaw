// ============================================================================
// Message Converter — 消息格式转换
// ============================================================================

import type { Context } from "grammy";
import type {
  IncomingMessage,
  OutgoingMessage,
  MessageSourceType,
} from "@superclaw/types";

/** Telegram 消息最大字符数 */
const TELEGRAM_MAX_LENGTH = 4096;

/**
 * 将 Telegram 消息转换为统一 IncomingMessage
 */
export function telegramToIncoming(
  ctx: Context,
  accountId: string,
  botUsername: string,
): IncomingMessage {
  const message = ctx.message!;
  const chat = ctx.chat!;
  const from = ctx.from!;

  const isPrivate = chat.type === "private";
  const sourceType: MessageSourceType = isPrivate ? "dm" : "group";

  let content = message.text ?? "";

  // 在群组中去掉 @bot mention
  if (!isPrivate && botUsername) {
    const mentionTag = `@${botUsername}`;
    if (message.entities) {
      for (const entity of message.entities) {
        if (
          entity.type === "mention" &&
          content.substring(entity.offset, entity.offset + entity.length) ===
            mentionTag
        ) {
          content =
            content.slice(0, entity.offset) +
            content.slice(entity.offset + entity.length);
        }
      }
    }
    content = content.trim();
  }

  const senderName = from.last_name
    ? `${from.first_name} ${from.last_name}`
    : from.first_name;

  return {
    id: String(message.message_id),
    channelType: "telegram",
    accountId,
    sourceType,
    senderId: String(from.id),
    senderName,
    groupId: isPrivate ? undefined : String(chat.id),
    content,
    attachments: undefined,
    replyTo: message.reply_to_message?.message_id
      ? String(message.reply_to_message.message_id)
      : undefined,
    timestamp: new Date(message.date * 1000),
    metadata: {
      chatType: chat.type,
      chatTitle: "title" in chat ? chat.title : undefined,
      fromUsername: from.username,
      fromLanguageCode: from.language_code,
    },
  };
}

/**
 * 将 OutgoingMessage 转换为 Telegram 发送参数
 */
export function outgoingToTelegram(message: OutgoingMessage): {
  text: string;
  parseMode: undefined;
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
  if (content.length > TELEGRAM_MAX_LENGTH) {
    content = content.slice(0, TELEGRAM_MAX_LENGTH - 3) + "...";
  }

  return {
    text: content,
    parseMode: undefined,
  };
}
