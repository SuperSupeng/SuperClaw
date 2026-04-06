// ============================================================================
// CLI Channel Adapter — 终端交互渠道
// ============================================================================
// 让用户在终端直接和 Agent 对话。这也是 `superclaw dev` 模式的默认渠道。
// ============================================================================

import { createInterface } from "node:readline";
import { randomUUID } from "node:crypto";
import type {
  MessageAdapter,
  ChannelConfig,
  IncomingMessage,
  OutgoingMessage,
  MessageTarget,
} from "@superclaw-ai/types";

interface Logger {
  info(msg: string, ...args: unknown[]): void;
  warn(msg: string, ...args: unknown[]): void;
  error(msg: string, ...args: unknown[]): void;
  debug(msg: string, ...args: unknown[]): void;
  child(bindings: Record<string, unknown>): Logger;
}

export function createCLIAdapter(
  config: ChannelConfig,
  logger: Logger,
): MessageAdapter {
  const adapterLogger = logger.child({ channel: "cli" });
  const messageHandlers: Array<(message: IncomingMessage) => void> = [];
  let rl: ReturnType<typeof createInterface> | null = null;
  let running = false;

  const defaultAccountId =
    Object.keys(config.accounts)[0] ?? "default";

  function prompt(): void {
    if (!running || !rl) return;
    rl.question("\n> ", (input) => {
      if (!running) return;
      const trimmed = input.trim();
      if (!trimmed) {
        prompt();
        return;
      }

      // 特殊命令
      if (trimmed === "/quit" || trimmed === "/exit") {
        console.log("\nGoodbye!");
        process.exit(0);
      }

      const incoming: IncomingMessage = {
        id: randomUUID(),
        channelType: "cli",
        accountId: defaultAccountId,
        sourceType: "cli",
        senderId: "cli-user",
        senderName: "User",
        content: trimmed,
        timestamp: new Date(),
        metadata: {},
      };

      for (const handler of messageHandlers) {
        try {
          handler(incoming);
        } catch (err) {
          adapterLogger.error(`Message handler error: ${err}`);
        }
      }
    });
  }

  return {
    channelType: "cli",

    async connect(): Promise<void> {
      running = true;
      rl = createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: true,
      });

      rl.on("close", () => {
        running = false;
      });

      adapterLogger.info("CLI channel connected");
      console.log(
        "\nType your message and press Enter. Type /quit to exit.\n",
      );
      prompt();
    },

    async disconnect(): Promise<void> {
      running = false;
      if (rl) {
        rl.close();
        rl = null;
      }
      adapterLogger.info("CLI channel disconnected");
    },

    async sendMessage(
      _accountId: string,
      _target: MessageTarget,
      message: OutgoingMessage,
    ): Promise<void> {
      // 输出 Agent 回复
      console.log(`\n${message.content}`);

      // 如果有 nextActions，显示选项
      if (message.nextActions && message.nextActions.length > 0) {
        console.log("\nAvailable actions:");
        for (const action of message.nextActions) {
          console.log(`  [${action.action}] ${action.label}`);
        }
      }

      // 继续提示输入
      prompt();
    },

    onMessage(handler: (message: IncomingMessage) => void): void {
      messageHandlers.push(handler);
    },

    getConnectedAccounts(): string[] {
      return running ? [defaultAccountId] : [];
    },
  };
}
