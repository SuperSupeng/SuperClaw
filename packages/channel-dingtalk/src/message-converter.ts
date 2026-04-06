// ============================================================================
// Message Converter — 消息格式转换
// ============================================================================

import type {
  IncomingMessage,
  OutgoingMessage,
  MessageSourceType,
} from "@superclaw/types";
import type { DingTalkMessageEvent } from "./client-manager.js";

/** 钉钉消息最大字符数（安全值） */
const DINGTALK_MAX_LENGTH = 6000;

/**
 * 将钉钉消息事件转换为统一 IncomingMessage
 */
export function dingtalkToIncoming(
  event: DingTalkMessageEvent,
  accountId: string,
): IncomingMessage {
  const isDM = event.conversationType === "1";
  const sourceType: MessageSourceType = isDM ? "dm" : "group";

  let content = "";
  if (event.text?.content) {
    content = event.text.content.trim();
  }

  return {
    id: event.msgId,
    channelType: "dingtalk",
    accountId,
    sourceType,
    senderId: event.senderStaffId ?? event.senderId,
    senderName: event.senderNick,
    groupId: isDM ? undefined : event.conversationId,
    content,
    attachments: undefined,
    replyTo: undefined,
    timestamp: new Date(event.createAt),
    metadata: {
      conversationType: event.conversationType,
      conversationId: event.conversationId,
      conversationTitle: event.conversationTitle,
      chatbotUserId: event.chatbotUserId,
      msgtype: event.msgtype,
      atUsers: event.atUsers,
      senderCorpId: event.senderCorpId,
      sessionWebhook: event.sessionWebhook,
      robotCode: event.robotCode,
    },
  };
}

/**
 * 将 OutgoingMessage 转换为钉钉发送参数
 */
export function outgoingToDingTalk(message: OutgoingMessage): {
  msgKey: string;
  msgParam: string;
} {
  let content = message.content;

  if (message.nextActions && message.nextActions.length > 0) {
    const actionsText = message.nextActions
      .map(
        (a) =>
          `- ${a.label}${a.description ? ` — ${a.description}` : ""}`,
      )
      .join("\n");
    content += `\n\n${actionsText}`;
  }

  if (content.length > DINGTALK_MAX_LENGTH) {
    content = content.slice(0, DINGTALK_MAX_LENGTH - 3) + "...";
  }

  return {
    msgKey: "sampleText",
    msgParam: JSON.stringify({ content }),
  };
}
