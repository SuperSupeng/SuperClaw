// ============================================================================
// Message Converter — 消息格式转换
// ============================================================================

import type { Message, MessageCreateOptions } from "discord.js";
import type {
  IncomingMessage,
  OutgoingMessage,
  Attachment,
  MessageSourceType,
} from "@superclaw-ai/types";

/** Discord 消息最大字符数 */
const DISCORD_MAX_LENGTH = 2000;

/**
 * 将 Discord 消息转换为统一 IncomingMessage
 */
export function discordToIncoming(
  message: Message,
  accountId: string,
): IncomingMessage {
  const isDM = message.channel.isDMBased();
  const botUserId = message.client.user?.id;

  // 去掉 @bot mention
  let content = message.content;
  if (botUserId) {
    content = content.replace(new RegExp(`<@!?${botUserId}>`, "g"), "").trim();
  }

  // 转换附件
  const attachments: Attachment[] = message.attachments.map((att) => {
    const type = resolveAttachmentType(att.contentType);
    return {
      type,
      url: att.url,
      name: att.name ?? undefined,
      mimeType: att.contentType ?? undefined,
      size: att.size,
    };
  });

  // 获取 channel 名称
  let channelName: string | undefined;
  if ("name" in message.channel && message.channel.name) {
    channelName = message.channel.name;
  }

  return {
    id: message.id,
    channelType: "discord",
    accountId,
    sourceType: (isDM ? "dm" : "group") as MessageSourceType,
    senderId: message.author.id,
    senderName: message.author.displayName ?? message.author.username,
    groupId: isDM ? undefined : message.channelId,
    content,
    attachments: attachments.length > 0 ? attachments : undefined,
    replyTo: message.reference?.messageId ?? undefined,
    timestamp: message.createdAt,
    metadata: {
      guildId: message.guildId ?? undefined,
      channelName,
    },
  };
}

/**
 * 将 OutgoingMessage 转换为 Discord MessageCreateOptions
 */
export function outgoingToDiscord(
  message: OutgoingMessage,
): MessageCreateOptions {
  let content = message.content;

  // 如果有 nextActions，追加按钮描述文字
  if (message.nextActions && message.nextActions.length > 0) {
    const actionsText = message.nextActions
      .map((a) => `> **${a.label}**${a.description ? ` — ${a.description}` : ""}`)
      .join("\n");
    content += `\n\n${actionsText}`;
  }

  // 截断超长消息
  if (content.length > DISCORD_MAX_LENGTH) {
    content = content.slice(0, DISCORD_MAX_LENGTH - 3) + "...";
  }

  const options: MessageCreateOptions = { content };

  // 处理附件
  if (message.attachments && message.attachments.length > 0) {
    options.files = message.attachments.map((att) => ({
      attachment: att.url,
      name: att.name ?? undefined,
    }));
  }

  return options;
}

/**
 * 根据 MIME 类型推断附件类型
 */
function resolveAttachmentType(
  contentType: string | null | undefined,
): Attachment["type"] {
  if (!contentType) return "file";
  if (contentType.startsWith("image/")) return "image";
  if (contentType.startsWith("audio/")) return "audio";
  if (contentType.startsWith("video/")) return "video";
  return "file";
}
