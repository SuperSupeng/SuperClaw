// ============================================================================
// Client Manager — 多钉钉 Bot 管理
// ============================================================================

import {
  DWClient,
  EventAck,
  TOPIC_ROBOT,
  type DWClientDownStream,
  type RobotMessage,
} from "dingtalk-stream";
import type { ChannelAccountConfig } from "@superclaw/types";

interface Logger {
  info(msg: string, ...args: unknown[]): void;
  warn(msg: string, ...args: unknown[]): void;
  error(msg: string, ...args: unknown[]): void;
  debug(msg: string, ...args: unknown[]): void;
  child(bindings: Record<string, unknown>): Logger;
}

/** 钉钉 Stream 回调中的机器人消息结构（扩展 SDK 的 RobotMessage） */
export interface DingTalkMessageEvent {
  msgtype: string;
  text?: { content: string };
  senderNick: string;
  senderId: string;
  conversationType: string;
  conversationId: string;
  chatbotUserId: string;
  chatbotCorpId?: string;
  msgId: string;
  createAt: number;
  senderStaffId: string;
  senderCorpId: string;
  conversationTitle?: string;
  isAdmin?: boolean;
  robotCode: string;
  sessionWebhook: string;
  sessionWebhookExpiredTime: number;
  atUsers?: Array<{
    dingtalkId: string;
    staffId?: string;
  }>;
}

/** 钉钉 Access Token 缓存条目 */
interface TokenEntry {
  accessToken: string;
  expiresAt: number;
}

export interface DingTalkClientManager {
  connectAll(): Promise<void>;
  disconnectAll(): Promise<void>;
  getAccount(accountId: string): ChannelAccountConfig | undefined;
  getAccessToken(accountId: string): Promise<string>;
  getRobotCode(accountId: string): string | undefined;
  onMessage(
    accountId: string,
    handler: (event: DingTalkMessageEvent) => void,
  ): void;
  getConnectedAccountIds(): string[];
}

export function createClientManager(
  accounts: Record<string, ChannelAccountConfig>,
  logger: Logger,
): DingTalkClientManager {
  const dwClients = new Map<string, DWClient>();
  const connectedIds = new Set<string>();
  const messageHandlers = new Map<
    string,
    Array<(event: DingTalkMessageEvent) => void>
  >();
  const tokenCache = new Map<string, TokenEntry>();

  function getCredentials(account: ChannelAccountConfig): {
    appKey: string;
    appSecret: string;
  } {
    const appKey = account.extra?.appKey as string | undefined;
    const appSecret = resolveToken(account);

    if (!appKey) {
      throw new Error(
        `No appKey (extra.appKey) configured for account ${account.id}`,
      );
    }
    if (!appSecret) {
      throw new Error(
        `No appSecret (token) configured for account ${account.id}`,
      );
    }

    return { appKey, appSecret };
  }

  return {
    async connectAll() {
      const entries = Object.entries(accounts);
      const results = await Promise.allSettled(
        entries.map(async ([accountId, account]) => {
          const { appKey, appSecret } = getCredentials(account);

          const handlers: Array<(event: DingTalkMessageEvent) => void> = [];
          messageHandlers.set(accountId, handlers);

          const client = new DWClient({
            clientId: appKey,
            clientSecret: appSecret,
          });

          client.registerCallbackListener(
            TOPIC_ROBOT,
            (res: DWClientDownStream) => {
              try {
                const data = JSON.parse(res.data) as RobotMessage;
                const event: DingTalkMessageEvent = {
                  ...data,
                  atUsers: (
                    data as RobotMessage & {
                      atUsers?: Array<{
                        dingtalkId: string;
                        staffId?: string;
                      }>;
                    }
                  ).atUsers,
                  conversationTitle: (
                    data as RobotMessage & { conversationTitle?: string }
                  ).conversationTitle,
                };

                const accountHandlers = messageHandlers.get(accountId);
                if (accountHandlers) {
                  for (const handler of accountHandlers) {
                    try {
                      handler(event);
                    } catch (err) {
                      logger.error(`DingTalk message handler error: ${err}`);
                    }
                  }
                }
              } catch (err) {
                logger.error(
                  `Failed to parse DingTalk stream message: ${err}`,
                );
              }

              client.socketCallBackResponse(res.headers.messageId, {
                status: EventAck.SUCCESS,
              });
            },
          );

          await client.connect();
          dwClients.set(accountId, client);
          connectedIds.add(accountId);
          logger.info(`DingTalk client ${accountId} connected`);
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
      for (const [accountId, client] of dwClients) {
        try {
          client.disconnect();
          connectedIds.delete(accountId);
          logger.info(`DingTalk client ${accountId} disconnected`);
        } catch (err) {
          logger.error(`Error disconnecting ${accountId}: ${err}`);
        }
      }
      dwClients.clear();
      messageHandlers.clear();
      tokenCache.clear();
    },

    getAccount(accountId: string) {
      return accounts[accountId];
    },

    async getAccessToken(accountId: string): Promise<string> {
      const cached = tokenCache.get(accountId);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.accessToken;
      }

      const account = accounts[accountId];
      if (!account) {
        throw new Error(`Unknown account ${accountId}`);
      }

      const { appKey, appSecret } = getCredentials(account);

      const res = await fetch(
        "https://api.dingtalk.com/v1.0/oauth2/accessToken",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ appKey, appSecret }),
        },
      );

      if (!res.ok) {
        throw new Error(
          `Failed to get DingTalk access token: ${res.status} ${res.statusText}`,
        );
      }

      const body = (await res.json()) as {
        accessToken: string;
        expireIn: number;
      };

      const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;
      tokenCache.set(accountId, {
        accessToken: body.accessToken,
        expiresAt: Date.now() + body.expireIn * 1000 - TOKEN_REFRESH_BUFFER_MS,
      });

      return body.accessToken;
    },

    getRobotCode(accountId: string): string | undefined {
      const account = accounts[accountId];
      return account?.extra?.robotCode as string | undefined;
    },

    onMessage(
      accountId: string,
      handler: (event: DingTalkMessageEvent) => void,
    ) {
      const handlers = messageHandlers.get(accountId);
      if (!handlers) {
        logger.warn(
          `Cannot register message handler: no client for ${accountId}`,
        );
        return;
      }
      handlers.push(handler);
    },

    getConnectedAccountIds() {
      return [...connectedIds];
    },
  };
}

function resolveToken(account: ChannelAccountConfig): string | undefined {
  const token = account.token;
  if (!token) return undefined;
  if (token.startsWith("$")) {
    return process.env[token.slice(1)];
  }
  return token;
}
