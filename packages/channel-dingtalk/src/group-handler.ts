// ============================================================================
// Group Handler — 群组策略处理
// ============================================================================

import type { ChannelAccountConfig } from "@superclaw/types";
import type { DingTalkMessageEvent } from "./client-manager.js";

/**
 * 判断是否应该处理该群组消息
 */
export function shouldHandleGroup(
  event: DingTalkMessageEvent,
  account: ChannelAccountConfig,
  botUserId: string,
): boolean {
  const allowedGroups = account.extra?.conversationIds as string[] | undefined;
  if (allowedGroups && !allowedGroups.includes(event.conversationId)) {
    return false;
  }

  const policy = account.groupPolicy ?? "mention";

  switch (policy) {
    case "mention":
      return isBotMentioned(event, botUserId);
    case "all":
      return true;
    case "none":
      return false;
    default:
      return false;
  }
}

/**
 * 检查钉钉消息是否 @ 了 Bot
 *
 * 钉钉通过 atUsers 列表或消息文本中的 @botName 来标识
 */
function isBotMentioned(
  event: DingTalkMessageEvent,
  botUserId: string,
): boolean {
  if (event.atUsers && event.atUsers.length > 0) {
    return event.atUsers.some((u) => u.dingtalkId === botUserId);
  }
  return false;
}
