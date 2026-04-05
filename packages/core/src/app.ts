// ============================================================================
// SuperClawApp — 应用入口
// ============================================================================

import pino from "pino";
import type {
  SuperClawApp,
  EventBus,
  MessageAdapter,
  AgentConfig,
} from "@superclaw/types";

import { loadConfig } from "./config/loader.js";
import { createEventBus } from "./event-bus.js";
import { createGatewayServer, type GatewayServer } from "./gateway/server.js";
import { createBindingTable, type BindingTable } from "./router/binding-table.js";
import { createMessageQueue, type MessageQueue } from "./router/message-queue.js";
import { createRouter, type Router } from "./router/router.js";
import { createModelRouter } from "./model/model-router.js";
import { createOpenAICompatibleProvider } from "./model/providers/openai-compatible.js";
import { createToolRegistry, type ToolRegistry } from "./tool/tool-registry.js";
import { createMemoryManager } from "./memory/memory-manager.js";
import { createAgentManager, type AgentManager } from "./agent/agent-manager.js";

/**
 * 尝试动态导入 channel adapter
 */
async function loadChannelAdapter(
  channelType: string,
  channelConfig: unknown,
  logger: pino.Logger,
): Promise<MessageAdapter | null> {
  try {
    // 尝试导入对应的 channel 包
    const mod = await import(`@superclaw/channel-${channelType}`);
    // 各 channel 包导出的工厂函数命名规则：create{Type}Adapter
    const factoryName = `create${channelType.charAt(0).toUpperCase()}${channelType.slice(1)}Adapter`;
    const factory = mod[factoryName] ?? mod.createAdapter ?? mod.default;
    if (typeof factory === "function") {
      return factory(channelConfig, logger) as MessageAdapter;
    }
    logger.warn({ channelType }, "Channel module found but no adapter factory exported");
    return null;
  } catch {
    logger.warn({ channelType }, "Channel adapter package not found");
    return null;
  }
}

/**
 * 创建 SuperClaw 应用实例
 */
export async function createApp(configPath?: string): Promise<SuperClawApp> {
  // 1. 加载配置
  const config = await loadConfig(configPath);

  // 2. 事件总线
  const eventBus: EventBus = createEventBus();

  // 3. Logger
  const logger = pino({
    level: config.gateway?.mode === "production" ? "info" : "debug",
    name: config.name ?? "superclaw",
  });

  // 4. Model Router
  const modelRouter = createModelRouter(
    config.providers,
    createOpenAICompatibleProvider,
    logger,
  );

  // 5. Memory Manager
  const memoryManager = createMemoryManager();

  // 6. Tool Registry Factory (每个 Agent 独立的工具集)
  const toolRegistryFactory = (agentConfig: AgentConfig): ToolRegistry => {
    return createToolRegistry(agentConfig.tools ?? [], logger);
  };

  // 7. Agent Manager
  const agentManager: AgentManager = createAgentManager(config.agents, {
    modelRouter,
    toolRegistryFactory,
    memoryManager,
    eventBus,
    logger,
  });

  // 8. Channel Adapters
  const channelAdapters = new Map<string, MessageAdapter>();
  for (const [key, channelConfig] of Object.entries(config.channels)) {
    if (!channelConfig.enabled) continue;
    const channelType = channelConfig.type || key;
    const adapter = await loadChannelAdapter(channelType, channelConfig, logger);
    if (adapter) {
      channelAdapters.set(channelType, adapter);
    }
  }

  // 9. Binding Table
  const bindingTable: BindingTable = createBindingTable(config.bindings);

  // 10. Message Queue + Router
  const messageQueue: MessageQueue = createMessageQueue(config.router ?? {}, logger);
  const router: Router = createRouter({
    bindingTable,
    messageQueue,
    agentManager,
    channelAdapters,
    eventBus,
    logger,
  });

  // 11. Gateway Server
  const gateway: GatewayServer = createGatewayServer(config.gateway ?? {}, {
    eventBus,
    logger,
  });

  gateway.setAgentProvider(() => agentManager.getAllAgents());

  // ─── App 实例 ───────────────────────────────────────────────────────────────

  let started = false;

  const app: SuperClawApp = {
    config,
    events: eventBus,

    async start() {
      if (started) return;
      started = true;

      logger.info("Starting SuperClaw...");

      // Boot all agents
      await agentManager.bootAll();

      // Connect all channels
      for (const [channelType, adapter] of channelAdapters) {
        try {
          await adapter.connect();
          adapter.onMessage((msg) => {
            router.handleIncoming(msg).catch((err: unknown) => {
              logger.error({ err, channelType }, "Error handling incoming message");
            });
          });
          logger.info({ channelType }, "Channel connected");
        } catch (err) {
          logger.error({ err, channelType }, "Failed to connect channel");
        }
      }

      // Start router
      router.start();

      // Start gateway
      await gateway.start();

      const agentCount = agentManager.getAllAgents().length;
      eventBus.emit("system:ready", { agentCount });
      logger.info({ agentCount }, "SuperClaw ready");
    },

    async stop() {
      if (!started) return;
      started = false;

      logger.info("Shutting down SuperClaw...");
      eventBus.emit("system:shutdown", { reason: "app.stop() called" });

      await gateway.stop();
      router.stop();

      for (const [channelType, adapter] of channelAdapters) {
        try {
          await adapter.disconnect();
          logger.info({ channelType }, "Channel disconnected");
        } catch (err) {
          logger.error({ err, channelType }, "Error disconnecting channel");
        }
      }

      await agentManager.shutdownAll();

      logger.info("SuperClaw stopped");
    },

    getAgent(agentId: string) {
      return agentManager.getAgent(agentId);
    },

    getAllAgents() {
      return agentManager.getAllAgents();
    },
  };

  // 优雅关闭
  const shutdownHandler = () => {
    app.stop().catch((err: unknown) => {
      logger.error({ err }, "Error during graceful shutdown");
      process.exit(1);
    });
  };

  process.on("SIGINT", shutdownHandler);
  process.on("SIGTERM", shutdownHandler);

  return app;
}
