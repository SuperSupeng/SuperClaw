// ============================================================================
// Group Handler — 群组策略处理
// ============================================================================

import type { Context } from "grammy";
import type { ChannelAccountConfig } from "@superclaw-ai/types";

/**
 * 判断是否应该处理该群组消息
 */
export function shouldHandleGroup(
  ctx: Context,
  account: ChannelAccountConfig,
  botUsername: string,
): boolean {
  // 忽略 Bot 发的消息
  if (ctx.from?.is_bot) return false;

  // 检查群组白名单
  const chatIds = account.extra?.chatIds as string[] | undefined;
  if (chatIds && !chatIds.includes(String(ctx.chat?.id))) {
    return false;
  }

  const policy = account.groupPolicy ?? "mention";

  switch (policy) {
    case "mention":
      return isBotMentioned(ctx, botUsername);
    case "all":
      return true;
    case "none":
      return false;
    default:
      return false;
  }
}

/**
 * 检查消息是否 @ 了 Bot 或回复了 Bot 的消息
 */
function isBotMentioned(ctx: Context, botUsername: string): boolean {
  const message = ctx.message;
  if (!message) return false;

  // 检查 entities 中是否有 @bot 的 mention
  if (message.entities && message.text) {
    const mentionTag = `@${botUsername}`;
    const hasMention = message.entities.some(
      (e) =>
        e.type === "mention" &&
        message.text!.substring(e.offset, e.offset + e.length) === mentionTag,
    );
    if (hasMention) return true;
  }

  // 检查是否回复了 Bot 的消息
  if (message.reply_to_message?.from?.username === botUsername) {
    return true;
  }

  return false;
}
