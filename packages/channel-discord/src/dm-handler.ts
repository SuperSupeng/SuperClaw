// ============================================================================
// DM Handler — DM 策略处理
// ============================================================================

import type { Message } from "discord.js";
import type { ChannelAccountConfig } from "@superclaw/types";

/**
 * 判断是否应该处理该 DM 消息
 */
export function shouldHandleDM(
  message: Message,
  account: ChannelAccountConfig,
): boolean {
  // 忽略 Bot 发的消息
  if (message.author.bot) return false;

  const policy = account.dmPolicy ?? "allow";

  switch (policy) {
    case "allow":
      return true;
    case "deny":
      return false;
    case "allowlist":
      return account.allowFrom?.includes(message.author.id) ?? false;
    default:
      return false;
  }
}
