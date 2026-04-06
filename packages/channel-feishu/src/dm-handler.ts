// ============================================================================
// DM Handler — DM 策略处理
// ============================================================================

import type { ChannelAccountConfig } from "@superclaw/types";
import type { FeishuMessageEvent } from "./client-manager.js";

/**
 * 判断是否应该处理该 DM 消息
 */
export function shouldHandleDM(
  event: FeishuMessageEvent,
  account: ChannelAccountConfig,
): boolean {
  // 忽略 Bot 发的消息
  if (event.sender.sender_type === "app") return false;

  const policy = account.dmPolicy ?? "allow";

  switch (policy) {
    case "allow":
      return true;
    case "deny":
      return false;
    case "allowlist":
      return (
        account.allowFrom?.includes(event.sender.sender_id.open_id) ?? false
      );
    default:
      return false;
  }
}
