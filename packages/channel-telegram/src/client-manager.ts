// ============================================================================
// Client Manager — 多 Telegram Bot 管理
// ============================================================================

import { Bot, type Context } from "grammy";
import type { ChannelAccountConfig } from "@superclaw-ai/types";

interface Logger {
  info(msg: string, ...args: unknown[]): void;
  warn(msg: string, ...args: unknown[]): void;
  error(msg: string, ...args: unknown[]): void;
  debug(msg: string, ...args: unknown[]): void;
  child(bindings: Record<string, unknown>): Logger;
}

export interface TelegramClientManager {
  connectAll(): Promise<void>;
  disconnectAll(): Promise<void>;
  getBot(accountId: string): Bot | undefined;
  getAccount(accountId: string): ChannelAccountConfig | undefined;
  onMessage(accountId: string, handler: (ctx: Context) => void): void;
  getConnectedAccountIds(): string[];
}

/**
 * 为每个 account 创建独立的 grammy Bot 并管理其生命周期
 */
export function createClientManager(
  accounts: Record<string, ChannelAccountConfig>,
  logger: Logger,
): TelegramClientManager {
  const bots = new Map<string, Bot>();
  const connectedIds = new Set<string>();

  return {
    async connectAll() {
      const entries = Object.entries(accounts);
      const results = await Promise.allSettled(
        entries.map(async ([accountId, account]) => {
          const token = resolveToken(account);
          if (!token) {
            throw new Error(`No token configured for account ${accountId}`);
          }

          const bot = new Bot(token);

          // 注册错误处理
          bot.catch((err) => {
            logger.error(`Bot ${accountId} error: ${err.message}`);
          });

          // 初始化 bot info（获取 username 等）
          await bot.init();

          bots.set(accountId, bot);

          // 启动 long polling（不 await，在后台运行）
          bot.start({
            onStart: () => {
              logger.info(
                `Telegram bot ${accountId} (@${bot.botInfo.username}) polling started`,
              );
            },
          });

          connectedIds.add(accountId);
          logger.info(
            `Telegram client ${accountId} connected as @${bot.botInfo.username}`,
          );
        }),
      );

      for (let i = 0; i < results.length; i++) {
        const result = results[i]!;
        if (result.status === "rejected") {
          logger.error(
            `Failed to connect account ${entries[i]![0]}: ${(result as PromiseRejectedResult).reason}`,
          );
        }
      }
    },

    async disconnectAll() {
      for (const [accountId, bot] of bots) {
        try {
          await bot.stop();
          connectedIds.delete(accountId);
          logger.info(`Telegram client ${accountId} disconnected`);
        } catch (err) {
          logger.error(`Error disconnecting ${accountId}: ${err}`);
        }
      }
      bots.clear();
    },

    getBot(accountId: string) {
      return bots.get(accountId);
    },

    getAccount(accountId: string) {
      return accounts[accountId];
    },

    onMessage(accountId: string, handler: (ctx: Context) => void) {
      const bot = bots.get(accountId);
      if (!bot) {
        logger.warn(
          `Cannot register message handler: no bot for ${accountId}`,
        );
        return;
      }
      bot.on("message:text", handler);
    },

    getConnectedAccountIds() {
      return [...connectedIds];
    },
  };
}

/**
 * 解析 token（支持环境变量引用 $ENV_VAR）
 */
function resolveToken(account: ChannelAccountConfig): string | undefined {
  const token = account.token;
  if (!token) return undefined;
  if (token.startsWith("$")) {
    return process.env[token.slice(1)];
  }
  return token;
}
