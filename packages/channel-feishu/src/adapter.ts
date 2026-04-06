// ============================================================================
// Feishu Adapter — 实现 MessageAdapter 接口
// ============================================================================

import type {
  MessageAdapter,
  ChannelConfig,
  IncomingMessage,
  OutgoingMessage,
  MessageTarget,
} from "@superclaw/types";
import type * as lark from "@larksuiteoapi/node-sdk";
import { createClientManager } from "./client-manager.js";
import { feishuToIncoming, outgoingToFeishu } from "./message-converter.js";
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
 * 创建飞书渠道适配器
 */
export function createFeishuAdapter(
  config: ChannelConfig,
  logger: Logger,
): MessageAdapter {
  const adapterLogger = logger.child({ channel: "feishu" });
  const clientManager = createClientManager(config.accounts, adapterLogger);
  const messageHandlers: Array<(message: IncomingMessage) => void> = [];

  /** 缓存每个 account 对应 Bot 的 open_id */
  const botOpenIds = new Map<string, string>();

  /** 通过 create API 发送消息 */
  async function createMessage(
    client: lark.Client,
    target: MessageTarget,
    feishuMsg: { content: string; msg_type: string },
  ): Promise<void> {
    const receiveIdType = target.type === "dm" ? "open_id" : "chat_id";
    await client.im.message.create({
      params: { receive_id_type: receiveIdType },
      data: {
        receive_id: target.id,
        content: feishuMsg.content,
        msg_type: feishuMsg.msg_type,
      },
    });
  }

  return {
    channelType: "feishu",

    async connect() {
      await clientManager.connectAll();

      // 为每个已连接的 account 获取 bot open_id 并注册消息事件
      for (const accountId of Object.keys(config.accounts)) {
        const client = clientManager.getClient(accountId);
        if (!client) continue;

        const account = config.accounts[accountId]!;

        // 获取 Bot 自身信息以拿到 open_id
        try {
          const botInfo = await client.contact.user.get({
            params: { user_id_type: "open_id" },
            path: { user_id: "" },
          });
          // 如果上面不行，尝试用 bot.info
          if (botInfo?.data?.user?.open_id) {
            botOpenIds.set(accountId, botInfo.data.user.open_id);
          }
        } catch {
          // Bot info 获取失败不阻塞启动，open_id 可以从事件 mentions 中获取
          adapterLogger.debug(
            `Could not fetch bot info for ${accountId}, will rely on mentions for bot detection`,
          );
        }

        // 如果 extra 中配置了 botOpenId，优先使用
        const configBotOpenId = account.extra?.botOpenId as string | undefined;
        if (configBotOpenId) {
          botOpenIds.set(accountId, configBotOpenId);
        }

        clientManager.onMessage(accountId, (event) => {
          // 忽略 Bot 自己发的消息
          if (event.sender.sender_type === "app") return;

          const isDM = event.message.chat_type === "p2p";
          const botOpenId = botOpenIds.get(accountId) ?? "";

          // 根据策略判断是否处理
          if (isDM) {
            if (!shouldHandleDM(event, account)) return;
          } else {
            if (!shouldHandleGroup(event, account, botOpenId)) return;
          }

          // 转换并分发
          const incoming = feishuToIncoming(event, accountId);
          for (const handler of messageHandlers) {
            try {
              handler(incoming);
            } catch (err) {
              adapterLogger.error(`Message handler error: ${err}`);
            }
          }
        });
      }

      adapterLogger.info("Feishu adapter connected");
    },

    async disconnect() {
      await clientManager.disconnectAll();
      botOpenIds.clear();
      adapterLogger.info("Feishu adapter disconnected");
    },

    async sendMessage(
      accountId: string,
      target: MessageTarget,
      message: OutgoingMessage,
    ) {
      const client = clientManager.getClient(accountId);
      if (!client) {
        throw new Error(`No connected client for account ${accountId}`);
      }

      const feishuMsg = outgoingToFeishu(message);

      if (message.replyTo) {
        // 回复某条消息：使用 reply API
        try {
          await client.im.message.reply({
            path: { message_id: message.replyTo },
            data: {
              content: feishuMsg.content,
              msg_type: feishuMsg.msg_type,
            },
          });
        } catch {
          // 如果回复失败（原消息不存在等），fallback 到 create
          adapterLogger.debug(
            `Reply to ${message.replyTo} failed, falling back to create`,
          );
          await createMessage(client, target, feishuMsg);
        }
      } else {
        await createMessage(client, target, feishuMsg);
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
