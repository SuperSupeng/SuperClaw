// ============================================================================
// DM Handler — DM 策略处理
// ============================================================================

import type { ChannelAccountConfig } from "@superclaw/types";
import type { DingTalkMessageEvent } from "./client-manager.js";

/**
 * 判断是否应该处理该 DM 消息
 */
export function shouldHandleDM(
  event: DingTalkMessageEvent,
  account: ChannelAccountConfig,
): boolean {
  const policy = account.dmPolicy ?? "allow";

  switch (policy) {
    case "allow":
      return true;
    case "deny":
      return false;
    case "allowlist": {
      const senderId = event.senderStaffId ?? event.senderId;
      return account.allowFrom?.includes(senderId) ?? false;
    }
    default:
      return false;
  }
}
