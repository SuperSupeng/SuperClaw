// ============================================================================
// Client Manager — 多 Bot 管理
// ============================================================================

import {
  Client,
  GatewayIntentBits,
  Partials,
  type Message,
} from "discord.js";
import type { ChannelAccountConfig } from "@superclaw/types";

interface Logger {
  info(msg: string, ...args: unknown[]): void;
  warn(msg: string, ...args: unknown[]): void;
  error(msg: string, ...args: unknown[]): void;
  debug(msg: string, ...args: unknown[]): void;
  child(bindings: Record<string, unknown>): Logger;
}

export interface ClientManager {
  connectAll(): Promise<void>;
  disconnectAll(): Promise<void>;
  getClient(accountId: string): Client | undefined;
  getAccount(accountId: string): ChannelAccountConfig | undefined;
  onMessage(accountId: string, handler: (message: Message) => void): void;
  getConnectedAccountIds(): string[];
}

/**
 * 为每个 account 创建独立的 discord.js Client 并管理其生命周期
 */
export function createClientManager(
  accounts: Record<string, ChannelAccountConfig>,
  logger: Logger,
): ClientManager {
  const clients = new Map<string, Client>();
  const connectedIds = new Set<string>();

  // 为每个 account 创建 Client
  for (const [accountId, account] of Object.entries(accounts)) {
    const client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent,
      ],
      partials: [Partials.Channel, Partials.Message],
    });

    // 自动重连：监听 error 和 shardDisconnect 事件
    client.on("error", (error) => {
      logger.error(`Client ${accountId} error: ${error.message}`);
      attemptReconnect(accountId, account, client);
    });

    client.on("shardDisconnect", (_event, shardId) => {
      logger.warn(`Client ${accountId} shard ${shardId} disconnected`);
      attemptReconnect(accountId, account, client);
    });

    clients.set(accountId, client);
  }

  async function attemptReconnect(
    accountId: string,
    account: ChannelAccountConfig,
    client: Client,
  ): Promise<void> {
    const token = resolveToken(account);
    if (!token) return;

    try {
      logger.info(`Attempting reconnect for ${accountId}...`);
      await client.login(token);
      connectedIds.add(accountId);
      logger.info(`Reconnected ${accountId} successfully`);
    } catch (err) {
      logger.error(`Reconnect failed for ${accountId}: ${err}`);
    }
  }

  return {
    async connectAll() {
      const entries = Object.entries(accounts);
      const results = await Promise.allSettled(
        entries.map(async ([accountId, account]) => {
          const client = clients.get(accountId);
          if (!client) throw new Error(`No client for ${accountId}`);

          const token = resolveToken(account);
          if (!token) {
            throw new Error(`No token configured for account ${accountId}`);
          }

          await client.login(token);
          connectedIds.add(accountId);
          logger.info(`Discord client ${accountId} connected`);
        }),
      );

      // 记录失败但不抛出异常（部分失败不影响其他）
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result.status === "rejected") {
          logger.error(
            `Failed to connect account ${entries[i][0]}: ${result.reason}`,
          );
        }
      }
    },

    async disconnectAll() {
      for (const [accountId, client] of clients) {
        try {
          client.destroy();
          connectedIds.delete(accountId);
          logger.info(`Discord client ${accountId} disconnected`);
        } catch (err) {
          logger.error(`Error disconnecting ${accountId}: ${err}`);
        }
      }
    },

    getClient(accountId: string) {
      return clients.get(accountId);
    },

    getAccount(accountId: string) {
      return accounts[accountId];
    },

    onMessage(accountId: string, handler: (message: Message) => void) {
      const client = clients.get(accountId);
      if (!client) {
        logger.warn(`Cannot register message handler: no client for ${accountId}`);
        return;
      }
      client.on("messageCreate", handler);
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
