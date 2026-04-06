// ============================================================================
// Client Manager — 多飞书 App 管理
// ============================================================================

import * as lark from "@larksuiteoapi/node-sdk";
import type { ChannelAccountConfig } from "@superclaw-ai/types";

interface Logger {
  info(msg: string, ...args: unknown[]): void;
  warn(msg: string, ...args: unknown[]): void;
  error(msg: string, ...args: unknown[]): void;
  debug(msg: string, ...args: unknown[]): void;
  child(bindings: Record<string, unknown>): Logger;
}

/** 飞书事件中的消息结构 */
export interface FeishuMessageEvent {
  sender: {
    sender_id: {
      open_id: string;
      user_id?: string;
      union_id?: string;
    };
    sender_type?: string;
    tenant_key?: string;
  };
  message: {
    message_id: string;
    root_id?: string;
    parent_id?: string;
    create_time: string;
    chat_id: string;
    chat_type: string;
    message_type: string;
    content: string;
    mentions?: Array<{
      key: string;
      id: {
        open_id: string;
        user_id?: string;
        union_id?: string;
      };
      name: string;
      tenant_key?: string;
    }>;
  };
}

export interface FeishuClientManager {
  connectAll(): Promise<void>;
  disconnectAll(): Promise<void>;
  getClient(accountId: string): lark.Client | undefined;
  getAccount(accountId: string): ChannelAccountConfig | undefined;
  onMessage(
    accountId: string,
    handler: (event: FeishuMessageEvent) => void,
  ): void;
  getConnectedAccountIds(): string[];
}

/**
 * 为每个 account 创建独立的 lark.Client 并管理其生命周期
 */
export function createClientManager(
  accounts: Record<string, ChannelAccountConfig>,
  logger: Logger,
): FeishuClientManager {
  const clients = new Map<string, lark.Client>();
  const eventDispatchers = new Map<string, lark.EventDispatcher>();
  const wsClients = new Map<string, lark.WSClient>();
  const connectedIds = new Set<string>();

  return {
    async connectAll() {
      const entries = Object.entries(accounts);
      const results = await Promise.allSettled(
        entries.map(async ([accountId, account]) => {
          const appSecret = resolveToken(account);
          const appId = account.extra?.appId as string | undefined;

          if (!appSecret) {
            throw new Error(
              `No appSecret (token) configured for account ${accountId}`,
            );
          }
          if (!appId) {
            throw new Error(
              `No appId (extra.appId) configured for account ${accountId}`,
            );
          }

          const client = new lark.Client({
            appId,
            appSecret,
            disableTokenCache: false,
          });

          clients.set(accountId, client);

          // 创建事件分发器
          const dispatcher = new lark.EventDispatcher({});
          eventDispatchers.set(accountId, dispatcher);

          // 使用 WebSocket 模式连接
          const wsClient = new lark.WSClient({
            appId,
            appSecret,
            eventDispatcher: dispatcher,
            loggerLevel: lark.LoggerLevel.WARN,
          });

          wsClients.set(accountId, wsClient);
          await wsClient.start();

          connectedIds.add(accountId);
          logger.info(`Feishu client ${accountId} connected`);
        }),
      );

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result!.status === "rejected") {
          logger.error(
            `Failed to connect account ${entries[i]![0]}: ${(result as PromiseRejectedResult).reason}`,
          );
        }
      }
    },

    async disconnectAll() {
      for (const [accountId] of wsClients) {
        try {
          connectedIds.delete(accountId);
          logger.info(`Feishu client ${accountId} disconnected`);
        } catch (err) {
          logger.error(`Error disconnecting ${accountId}: ${err}`);
        }
      }
      wsClients.clear();
      eventDispatchers.clear();
      clients.clear();
    },

    getClient(accountId: string) {
      return clients.get(accountId);
    },

    getAccount(accountId: string) {
      return accounts[accountId];
    },

    onMessage(
      accountId: string,
      handler: (event: FeishuMessageEvent) => void,
    ) {
      const dispatcher = eventDispatchers.get(accountId);
      if (!dispatcher) {
        logger.warn(
          `Cannot register message handler: no dispatcher for ${accountId}`,
        );
        return;
      }

      dispatcher.register({
        "im.message.receive_v1": (data: unknown) => {
          try {
            handler(data as FeishuMessageEvent);
          } catch (err) {
            logger.error(`Feishu message handler error: ${err}`);
          }
        },
      } as Record<string, (data: unknown) => void | Record<string, unknown>>);
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
