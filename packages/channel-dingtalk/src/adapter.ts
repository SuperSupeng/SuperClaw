// ============================================================================
// DingTalk Adapter — 实现 MessageAdapter 接口
// ============================================================================

import type {
  MessageAdapter,
  ChannelConfig,
  IncomingMessage,
  OutgoingMessage,
  MessageTarget,
} from "@superclaw-ai/types";
import { createClientManager } from "./client-manager.js";
import { dingtalkToIncoming, outgoingToDingTalk } from "./message-converter.js";
import { shouldHandleDM } from "./dm-handler.js";
import { shouldHandleGroup } from "./group-handler.js";

interface Logger {
  info(msg: string, ...args: unknown[]): void;
  warn(msg: string, ...args: unknown[]): void;
  error(msg: string, ...args: unknown[]): void;
  debug(msg: string, ...args: unknown[]): void;
  child(bindings: Record<string, unknown>): Logger;
}

/**
 * 创建钉钉渠道适配器
 */
export function createDingTalkAdapter(
  config: ChannelConfig,
  logger: Logger,
): MessageAdapter {
  const adapterLogger = logger.child({ channel: "dingtalk" });
  const clientManager = createClientManager(config.accounts, adapterLogger);
  const messageHandlers: Array<(message: IncomingMessage) => void> = [];

  async function sendDMMessage(
    accountId: string,
    target: MessageTarget,
    msg: { msgKey: string; msgParam: string },
  ): Promise<void> {
    const accessToken = await clientManager.getAccessToken(accountId);
    const robotCode = clientManager.getRobotCode(accountId);

    if (!robotCode) {
      throw new Error(
        `No robotCode configured for account ${accountId}, required for sending DM`,
      );
    }

    const res = await fetch(
      "https://api.dingtalk.com/v1.0/robot/oToMessages/batchSend",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-acs-dingtalk-access-token": accessToken,
        },
        body: JSON.stringify({
          robotCode,
          userIds: [target.id],
          msgKey: msg.msgKey,
          msgParam: msg.msgParam,
        }),
      },
    );

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`DingTalk DM send failed: ${res.status} ${body}`);
    }
  }

  async function sendGroupMessage(
    accountId: string,
    target: MessageTarget,
    msg: { msgKey: string; msgParam: string },
  ): Promise<void> {
    const accessToken = await clientManager.getAccessToken(accountId);
    const robotCode = clientManager.getRobotCode(accountId);

    if (!robotCode) {
      throw new Error(
        `No robotCode configured for account ${accountId}, required for sending group message`,
      );
    }

    const res = await fetch(
      "https://api.dingtalk.com/v1.0/robot/groupMessages/send",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-acs-dingtalk-access-token": accessToken,
        },
        body: JSON.stringify({
          robotCode,
          openConversationId: target.id,
          msgKey: msg.msgKey,
          msgParam: msg.msgParam,
        }),
      },
    );

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`DingTalk group send failed: ${res.status} ${body}`);
    }
  }

  return {
    channelType: "dingtalk",

    async connect() {
      await clientManager.connectAll();

      for (const accountId of Object.keys(config.accounts)) {
        const account = config.accounts[accountId]!;
        const botUserId = (account.extra?.robotCode as string) ?? "";

        clientManager.onMessage(accountId, (event) => {
          const isDM = event.conversationType === "1";

          if (isDM) {
            if (!shouldHandleDM(event, account)) return;
          } else {
            if (!shouldHandleGroup(event, account, botUserId)) return;
          }

          const incoming = dingtalkToIncoming(event, accountId);
          for (const handler of messageHandlers) {
            try {
              handler(incoming);
            } catch (err) {
              adapterLogger.error(`Message handler error: ${err}`);
            }
          }
        });
      }

      adapterLogger.info("DingTalk adapter connected");
    },

    async disconnect() {
      await clientManager.disconnectAll();
      adapterLogger.info("DingTalk adapter disconnected");
    },

    async sendMessage(
      accountId: string,
      target: MessageTarget,
      message: OutgoingMessage,
    ) {
      const dtMsg = outgoingToDingTalk(message);

      if (target.type === "dm") {
        await sendDMMessage(accountId, target, dtMsg);
      } else {
        await sendGroupMessage(accountId, target, dtMsg);
      }

      adapterLogger.debug(
        `Message sent via ${accountId} to ${target.type}:${target.id}`,
      );
    },

    onMessage(handler: (message: IncomingMessage) => void) {
      messageHandlers.push(handler);
    },

    getConnectedAccounts() {
      return clientManager.getConnectedAccountIds();
    },
  };
}
