// ============================================================================
// Group Handler — 群组策略处理
// ============================================================================

import type { ChannelAccountConfig } from "@superclaw-ai/types";
import type { FeishuMessageEvent } from "./client-manager.js";

/**
 * 判断是否应该处理该群组消息
 */
export function shouldHandleGroup(
  event: FeishuMessageEvent,
  account: ChannelAccountConfig,
  botOpenId: string,
): boolean {
  // 忽略 Bot 发的消息
  if (event.sender.sender_type === "app") return false;

  // 检查群组白名单
  const chatIds = account.extra?.chatIds as string[] | undefined;
  if (chatIds && !chatIds.includes(event.message.chat_id)) {
    return false;
  }

  const policy = account.groupPolicy ?? "mention";

  switch (policy) {
    case "mention":
      // 飞书群组中 @ 机器人：检查 mentions 中是否有 bot 的 open_id
      return isBotMentioned(event, botOpenId);
    case "all":
      return true;
    case "none":
      return false;
    default:
      return false;
  }
}

/**
 * 检查飞书消息是否 @ 了 Bot
 */
function isBotMentioned(
  event: FeishuMessageEvent,
  botOpenId: string,
): boolean {
  const mentions = event.message.mentions;
  if (!mentions || mentions.length === 0) return false;

  return mentions.some((m) => m.id.open_id === botOpenId);
}
