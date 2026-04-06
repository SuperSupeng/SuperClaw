// ============================================================================
// Telegram Adapter — 实现 MessageAdapter 接口
// ============================================================================

import type {
  MessageAdapter,
  ChannelConfig,
  IncomingMessage,
  OutgoingMessage,
  MessageTarget,
} from "@superclaw-ai/types";
import { createClientManager } from "./client-manager.js";
import { telegramToIncoming, outgoingToTelegram } from "./message-converter.js";
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
 * 创建 Telegram 渠道适配器
 */
export function createTelegramAdapter(
  config: ChannelConfig,
  logger: Logger,
): MessageAdapter {
  const adapterLogger = logger.child({ channel: "telegram" });
  const clientManager = createClientManager(config.accounts, adapterLogger);
  const messageHandlers: Array<(message: IncomingMessage) => void> = [];

  return {
    channelType: "telegram",

    async connect() {
      await clientManager.connectAll();

      // 为每个已连接的 account 注册消息处理
      for (const accountId of Object.keys(config.accounts)) {
        const bot = clientManager.getBot(accountId);
        if (!bot) continue;

        const account = config.accounts[accountId]!;
        const botUsername = bot.botInfo.username;

        clientManager.onMessage(accountId, (ctx) => {
          // 忽略 Bot 自己发的消息
          if (ctx.from?.id === bot.botInfo.id) return;

          const isPrivate = ctx.chat?.type === "private";

          // 根据策略判断是否处理
          if (isPrivate) {
            if (!shouldHandleDM(ctx, account)) return;
          } else {
            if (!shouldHandleGroup(ctx, account, botUsername)) return;
          }

          // 转换并分发
          const incoming = telegramToIncoming(ctx, accountId, botUsername);
          for (const handler of messageHandlers) {
            try {
              handler(incoming);
            } catch (err) {
              adapterLogger.error(`Message handler error: ${err}`);
            }
          }
        });
      }

      adapterLogger.info("Telegram adapter connected");
    },

    async disconnect() {
      await clientManager.disconnectAll();
      adapterLogger.info("Telegram adapter disconnected");
    },

    async sendMessage(
      accountId: string,
      target: MessageTarget,
      message: OutgoingMessage,
    ) {
      const bot = clientManager.getBot(accountId);
      if (!bot) {
        throw new Error(`No connected bot for account ${accountId}`);
      }

      const telegramMsg = outgoingToTelegram(message);
      const chatId = target.id;

      if (message.replyTo) {
        try {
          await bot.api.sendMessage(chatId, telegramMsg.text, {
            reply_parameters: {
              message_id: Number(message.replyTo),
            },
          });
        } catch {
          // 如果回复失败（原消息不存在等），fallback 到直接发送
          adapterLogger.debug(
            `Reply to ${message.replyTo} failed, falling back to direct send`,
          );
          await bot.api.sendMessage(chatId, telegramMsg.text);
        }
      } else {
        await bot.api.sendMessage(chatId, telegramMsg.text);
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
