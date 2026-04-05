// ============================================================================
// Discord Adapter — 实现 MessageAdapter 接口
// ============================================================================

import type {
  MessageAdapter,
  ChannelConfig,
  IncomingMessage,
  OutgoingMessage,
  MessageTarget,
} from "@superclaw/types";
import { createClientManager } from "./client-manager.js";
import { discordToIncoming, outgoingToDiscord } from "./message-converter.js";
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
 * 创建 Discord 渠道适配器
 */
export function createDiscordAdapter(
  config: ChannelConfig,
  logger: Logger,
): MessageAdapter {
  const adapterLogger = logger.child({ channel: "discord" });
  const clientManager = createClientManager(config.accounts, adapterLogger);
  const messageHandlers: Array<(message: IncomingMessage) => void> = [];

  return {
    channelType: "discord",

    async connect() {
      await clientManager.connectAll();

      // 为每个已连接的 account 注册 messageCreate 事件
      for (const accountId of Object.keys(config.accounts)) {
        const client = clientManager.getClient(accountId);
        if (!client) continue;

        const account = config.accounts[accountId]!;
        const botUserId = client.user?.id;

        clientManager.onMessage(accountId, (message) => {
          // 忽略 Bot 自己发的消息
          if (message.author.id === client.user?.id) return;

          const isDM = message.channel.isDMBased();

          // 根据策略判断是否处理
          if (isDM) {
            if (!shouldHandleDM(message, account)) return;
          } else {
            if (!botUserId || !shouldHandleGroup(message, account, botUserId)) return;
          }

          // 转换并分发
          const incoming = discordToIncoming(message, accountId);
          for (const handler of messageHandlers) {
            try {
              handler(incoming);
            } catch (err) {
              adapterLogger.error(`Message handler error: ${err}`);
            }
          }
        });
      }

      adapterLogger.info("Discord adapter connected");
    },

    async disconnect() {
      await clientManager.disconnectAll();
      adapterLogger.info("Discord adapter disconnected");
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

      const options = outgoingToDiscord(message);

      if (target.type === "dm") {
        // DM: 获取用户 → 创建 DM channel → 发送
        const user = await client.users.fetch(target.id);
        const dmChannel = await user.createDM();

        if (message.replyTo) {
          try {
            const replyTarget = await dmChannel.messages.fetch(message.replyTo);
            await replyTarget.reply(options);
          } catch {
            // 如果找不到原消息，直接发送
            await dmChannel.send(options);
          }
        } else {
          await dmChannel.send(options);
        }
      } else {
        // group / channel: 获取 channel → 发送
        const channel = await client.channels.fetch(target.id);
        if (!channel || !channel.isTextBased()) {
          throw new Error(`Channel ${target.id} not found or not text-based`);
        }

        if ("send" in channel) {
          if (message.replyTo) {
            try {
              const replyTarget = await (channel as any).messages.fetch(
                message.replyTo,
              );
              await replyTarget.reply(options);
            } catch {
              // 如果找不到原消息，直接发送
              await (channel as any).send(options);
            }
          } else {
            await (channel as any).send(options);
          }
        } else {
          throw new Error(`Channel ${target.id} does not support sending messages`);
        }
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
