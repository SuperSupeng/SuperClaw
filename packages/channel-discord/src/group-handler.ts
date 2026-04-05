// ============================================================================
// Group Handler — 群组策略处理
// ============================================================================

import type { Message } from "discord.js";
import type { ChannelAccountConfig } from "@superclaw/types";

/**
 * 判断是否应该处理该群组消息
 */
export function shouldHandleGroup(
  message: Message,
  account: ChannelAccountConfig,
  botUserId: string,
): boolean {
  // 忽略 Bot 发的消息
  if (message.author.bot) return false;

  // 检查 guild 白名单
  const guilds = account.extra?.guilds as string[] | undefined;
  if (guilds && message.guildId && !guilds.includes(message.guildId)) {
    return false;
  }

  const policy = account.groupPolicy ?? "mention";

  switch (policy) {
    case "mention":
      return message.mentions.has(botUserId);
    case "all":
      return true;
    case "none":
      return false;
    default:
      return false;
  }
}
