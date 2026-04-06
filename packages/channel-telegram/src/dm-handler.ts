// ============================================================================
// DM Handler — DM 策略处理
// ============================================================================

import type { Context } from "grammy";
import type { ChannelAccountConfig } from "@superclaw-ai/types";

/**
 * 判断是否应该处理该私聊消息
 */
export function shouldHandleDM(
  ctx: Context,
  account: ChannelAccountConfig,
): boolean {
  // 忽略 Bot 发的消息
  if (ctx.from?.is_bot) return false;

  const policy = account.dmPolicy ?? "allow";

  switch (policy) {
    case "allow":
      return true;
    case "deny":
      return false;
    case "allowlist":
      return account.allowFrom?.includes(String(ctx.from?.id)) ?? false;
    default:
      return false;
  }
}
