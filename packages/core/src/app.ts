// ============================================================================
// SuperClawApp — 应用入口
// ============================================================================

import { resolve } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import pino from "pino";
import type {
  SuperClawApp,
  EventBus,
  MessageAdapter,
  AgentConfig,
} from "@superclaw/types";

import { loadConfig } from "./config/loader.js";
import { createConfigWatcher, type ConfigWatcher } from "./config/watcher.js";
import type { ConfigDiff } from "./config/diff.js";
import { createEventBus } from "./event-bus.js";
import { createGatewayServer, type GatewayServer } from "./gateway/server.js";
import { createBindingTable, type BindingTable } from "./router/binding-table.js";
import { createMessageQueue, type MessageQueue } from "./router/message-queue.js";
import { createRouter, type Router } from "./router/router.js";
import { createModelRouter } from "./model/model-router.js";
import { createOpenAICompatibleProvider } from "./model/providers/openai-compatible.js";
import { createToolRegistry, type ToolRegistry, type ToolRegistryOptions } from "./tool/tool-registry.js";
import { createMCPClientManager, type MCPClientManager } from "./mcp/mcp-client.js";
import { createMemoryManager } from "./memory/memory-manager.js";
import { createAgentManager, type AgentManager } from "./agent/agent-manager.js";
import { createSignalBus } from "./signal/signal-bus.js";
import { createSLAMonitor } from "./signal/sla-monitor.js";
import { createOrganizationTree } from "./team/organization-tree.js";
import { createDelegationManager, type DelegationManager } from "./team/delegation.js";
import { createCronScheduler, type CronScheduler } from "./cron/cron-scheduler.js";
import { createLaneManager } from "./lane/lane-manager.js";

function toolRegistryOptionsForAgent(agent: AgentConfig): ToolRegistryOptions {
  const base = agent.workspace ?? agent.agentDir;
  return {
    workspaceRoot: base ? resolve(base) : resolve(process.cwd()),
    includeBuiltins: agent.includeBuiltins,
    allowedDomains: agent.sandbox?.allowedDomains,
  };
}
import { createDecisionEngine } from "./decision/decision-engine.js";
import { createAutoDream } from "./memory/auto-dream.js";
import { createHeartbeatExecutor } from "./memory/heartbeat-executor.js";

/**
 * 尝试动态导入 channel adapter。
 * 先用调用方传入的 resolveFrom 上下文解析（覆盖独立安装场景），
 * 再回退到当前模块自身的 import（覆盖 monorepo 场景）。
 */
async function loadChannelAdapter(
  channelType: string,
  channelConfig: unknown,
  logger: pino.Logger,
  resolveFrom?: string,
): Promise<MessageAdapter | null> {
  const specifier = `@superclaw/channel-${channelType}`;
  const factoryName = `create${channelType.charAt(0).toUpperCase()}${channelType.slice(1)}Adapter`;

  async function tryImport(mod: Record<string, unknown>): Promise<MessageAdapter | null> {
    const factory = mod[factoryName] ?? mod.createAdapter ?? mod.default;
    if (typeof factory === "function") {
      return factory(channelConfig, logger) as MessageAdapter;
    }
    logger.warn({ channelType }, "Channel module found but no adapter factory exported");
    return null;
  }

  // Strategy 1: resolve from caller's package context (e.g. CLI)
  if (resolveFrom) {
    try {
      const parentPath = resolveFrom.startsWith("file://")
        ? fileURLToPath(resolveFrom)
        : resolveFrom;
      const req = createRequire(parentPath);
      const resolved = pathToFileURL(req.resolve(specifier)).href;
      const mod = await import(resolved);
      return await tryImport(mod);
    } catch {
      // fall through to strategy 2
    }
  }

  // Strategy 2: direct ESM import (works in monorepo / hoisted node_modules)
  try {
    const mod = await import(specifier);
    return await tryImport(mod);
  } catch {
    logger.warn({ channelType }, "Channel adapter package not found");
    return null;
  }
}

export interface CreateAppOptions {
  configPath?: string;
  /** import.meta.url of the caller — used to resolve channel adapter packages */
  resolveModulesFrom?: string;
}

/**
 * 创建 SuperClaw 应用实例
 */
export async function createApp(
  configPathOrOpts?: string | CreateAppOptions,
): Promise<SuperClawApp> {
  const opts: CreateAppOptions =
    typeof configPathOrOpts === "string"
      ? { configPath: configPathOrOpts }
      : configPathOrOpts ?? {};
  const configPath = opts.configPath;
  const resolveModulesFrom = opts.resolveModulesFrom;
  // 解析配置文件绝对路径（供 watcher 使用）
  const resolvedConfigPath = configPath ? resolve(configPath) : undefined;

  // 1. 加载配置
  const config = await loadConfig(resolvedConfigPath);

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

  // 5.5 MCP Client Manager (optional)
  let mcpManager: MCPClientManager | undefined;
  if (config.mcp?.servers && config.mcp.servers.length > 0) {
    mcpManager = createMCPClientManager(config.mcp.servers, logger);
  }

  // 6. Tool Registry Factory (每个 Agent 独立的工具集)
  const toolRegistryFactory = (agentConfig: AgentConfig): ToolRegistry => {
    return createToolRegistry(agentConfig.tools ?? [], logger, mcpManager, toolRegistryOptionsForAgent(agentConfig));
  };

  // 7. Signal Bus + Team Layer (optional)
  const signalBus = createSignalBus(eventBus);
  const slaMonitor = createSLAMonitor(signalBus, eventBus, logger);

  let delegationManager: DelegationManager | undefined;
  let _lazyAgentManager: AgentManager | undefined;

  if (config.teams && config.teams.length > 0) {
    const organizationTree = createOrganizationTree(config.teams, config.agents);
    delegationManager = createDelegationManager({
      organizationTree,
      getAgentManager: () => {
        if (!_lazyAgentManager) throw new Error("AgentManager not yet initialized");
        return _lazyAgentManager;
      },
      signalBus,
      eventBus,
      logger,
    });
    logger.info(
      { teamCount: config.teams.length },
      "Organization tree and delegation manager created",
    );
  }

  // 8. Agent Manager
  const agentManager: AgentManager = createAgentManager(config.agents, {
    modelRouter,
    toolRegistryFactory,
    memoryManager,
    eventBus,
    logger,
    delegationManager,
  });

  // 完成延迟绑定
  _lazyAgentManager = agentManager;

  // 8.5 Lane Manager — 执行上下文隔离
  const laneManager = createLaneManager(logger);

  // 8.6 Decision Engine — 双向门决策引擎
  const decisionEngine = createDecisionEngine({ eventBus, logger });

  // 8.7 AutoDream — 记忆自动整理
  const autoDream = createAutoDream({
    memoryManager,
    modelRouter,
    agentConfigs: config.agents,
    eventBus,
    logger,
  });

  // 8.8 Heartbeat Executor — HEARTBEAT.md 定时执行
  const heartbeatExecutor = createHeartbeatExecutor({
    memoryManager,
    agentConfigs: config.agents,
    eventBus,
    logger,
  });

  // 8.9 Cron Scheduler — 定时任务
  let cronScheduler: CronScheduler | undefined;
  if (config.cron?.enabled !== false && config.cron?.jobs && config.cron.jobs.length > 0) {
    cronScheduler = createCronScheduler(config.cron, { eventBus, logger });
    logger.info({ jobCount: config.cron.jobs.length }, "Cron scheduler created");
  }

  // 9. Channel Adapters
  const channelAdapters = new Map<string, MessageAdapter>();
  for (const [key, channelConfig] of Object.entries(config.channels)) {
    if (!channelConfig.enabled) continue;
    const channelType = channelConfig.type || key;
    const adapter = await loadChannelAdapter(channelType, channelConfig, logger, resolveModulesFrom);
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
  gateway.setMessageHandler((msg) => router.handleIncoming(msg));

  // Wire decision engine: listen for Type 1 decisions from agent responses
  eventBus.on("message:responded", ({ agentId, response }) => {
    if (response.metadata?.decisionType === 1) {
      decisionEngine.requestApproval(agentId, response).catch((err: unknown) => {
        logger.error({ err, agentId }, "Decision approval flow error");
      });
    }
  });

  // Wire lane isolation: track which lane each agent is in during message processing
  const activeLaneHandles = new Map<string, ReturnType<typeof laneManager.acquire>>();

  eventBus.on("message:processing", ({ agentId, messageId }) => {
    const laneName = messageId.startsWith("cron-") ? "cron" as const : "main" as const;
    try {
      const handle = laneManager.acquire(laneName, agentId);
      activeLaneHandles.set(messageId, handle);
    } catch {
      logger.warn({ agentId, lane: laneName }, "Could not acquire lane, proceeding without isolation");
    }
  });

  eventBus.on("message:responded", ({ messageId }) => {
    const handle = activeLaneHandles.get(messageId);
    if (handle) { handle.release(); activeLaneHandles.delete(messageId); }
  });

  eventBus.on("message:error", ({ messageId }) => {
    const handle = activeLaneHandles.get(messageId);
    if (handle) { handle.release(); activeLaneHandles.delete(messageId); }
  });

  // ─── Config Watcher + 热更新 ─────────────────────────────────────────────────

  let configWatcher: ConfigWatcher | null = null;

  /**
   * 根据 ConfigDiff 做增量热更新
   */
  async function handleConfigDiff(diff: ConfigDiff, changedPath: string): Promise<void> {
    const log = logger.child({ module: "hot-reload" });

    // Providers 变更 → 重建 model router
    if (diff.providers.changed) {
      log.info("Providers changed, rebuilding model router");
      const freshConfig = await loadConfig(changedPath);
      const newModelRouter = createModelRouter(
        freshConfig.providers,
        createOpenAICompatibleProvider,
        logger,
      );
      // AgentManager 需要用新的 modelRouter，重建
      const newToolRegistryFactory = (agentCfg: AgentConfig): ToolRegistry => {
        return createToolRegistry(agentCfg.tools ?? [], logger, mcpManager, toolRegistryOptionsForAgent(agentCfg));
      };
      const newAgentManager = createAgentManager(freshConfig.agents, {
        modelRouter: newModelRouter,
        toolRegistryFactory: newToolRegistryFactory,
        memoryManager,
        eventBus,
        logger,
        delegationManager,
      });
      // 关闭旧 Agent，启动新 Agent
      await agentManager.shutdownAll();
      Object.assign(agentManager, newAgentManager);
      await agentManager.bootAll();
      log.info("Agents rebooted with new providers");
      return; // providers 变更通常需要全量重建，后续 diff 无需再处理
    }

    // Agents 变更 → 增量处理
    if (
      diff.agents.added.length > 0 ||
      diff.agents.removed.length > 0 ||
      diff.agents.modified.length > 0
    ) {
      log.info(
        {
          added: diff.agents.added.map((a) => a.id),
          removed: diff.agents.removed,
          modified: diff.agents.modified.map((a) => a.id),
        },
        "Agents changed, performing incremental update",
      );

      // 移除旧的
      for (const agentId of diff.agents.removed) {
        const runtime = agentManager.getAgent(agentId);
        if (runtime) {
          await runtime.shutdown();
          log.info({ agentId }, "Agent removed");
        }
      }

      // 重启修改的
      for (const agentCfg of diff.agents.modified) {
        const runtime = agentManager.getAgent(agentCfg.id);
        if (runtime) {
          await runtime.shutdown();
          log.info({ agentId: agentCfg.id }, "Agent stopped for reconfiguration");
        }
      }

      // 重建 AgentManager（包含 added + modified + 未变更的）
      const freshConfig = await loadConfig(changedPath);
      const newAgentManager = createAgentManager(freshConfig.agents, {
        modelRouter,
        toolRegistryFactory,
        memoryManager,
        eventBus,
        logger,
        delegationManager,
      });
      await agentManager.shutdownAll();
      Object.assign(agentManager, newAgentManager);
      await agentManager.bootAll();
      log.info("Agent manager rebuilt with updated agents");
    }

    // Channels 变更 → 断开旧的 / 连接新的
    if (
      diff.channels.added.length > 0 ||
      diff.channels.removed.length > 0 ||
      diff.channels.modified.length > 0
    ) {
      log.info("Channels changed, reconnecting affected channels");

      // 断开已移除 / 已修改的
      for (const key of [...diff.channels.removed, ...diff.channels.modified]) {
        const adapter = channelAdapters.get(key);
        if (adapter) {
          try {
            await adapter.disconnect();
            channelAdapters.delete(key);
            log.info({ channelType: key }, "Channel disconnected (removed/modified)");
          } catch (err) {
            log.error({ err, channelType: key }, "Error disconnecting channel");
          }
        }
      }

      // 连接新增 / 已修改的
      const freshConfig = await loadConfig(changedPath);
      for (const key of [...diff.channels.added, ...diff.channels.modified]) {
        const channelConfig = freshConfig.channels[key];
        if (!channelConfig?.enabled) continue;
        const channelType = channelConfig.type || key;
        const adapter = await loadChannelAdapter(channelType, channelConfig, logger, resolveModulesFrom);
        if (adapter) {
          channelAdapters.set(key, adapter);
          try {
            await adapter.connect();
            adapter.onMessage((msg) => {
              router.handleIncoming(msg).catch((err: unknown) => {
                logger.error({ err, channelType: key }, "Error handling incoming message");
              });
            });
            log.info({ channelType: key }, "Channel connected (added/modified)");
          } catch (err) {
            log.error({ err, channelType: key }, "Failed to connect channel");
          }
        }
      }
    }

    // Bindings 变更 → 重建 binding table
    if (diff.bindings.changed) {
      log.info("Bindings changed, rebuilding binding table");
      const freshConfig = await loadConfig(changedPath);
      const newBindingTable = createBindingTable(freshConfig.bindings);
      Object.assign(bindingTable, newBindingTable);
      log.info("Binding table rebuilt");
    }

    // Gateway / Router 变更 → 日志提示（需要重启）
    if (diff.gateway.changed) {
      log.warn("Gateway config changed — restart required for gateway changes to take effect");
    }

    if (diff.router.changed) {
      log.warn("Router config changed — restart required for router changes to take effect");
    }
  }

  // ─── App 实例 ───────────────────────────────────────────────────────────────

  let started = false;

  const app: SuperClawApp = {
    config,
    events: eventBus,

    async start() {
      if (started) return;
      started = true;

      logger.info("Starting SuperClaw...");

      // Connect MCP servers (before booting agents, so tools are available)
      if (mcpManager) {
        await mcpManager.connectAll();
        logger.info("MCP servers connected");
      }

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

      // Start SLA monitor
      slaMonitor.start();

      // Start cron scheduler
      if (cronScheduler) {
        cronScheduler.start();
        logger.info("Cron scheduler started");
      }

      // Start heartbeat executor
      heartbeatExecutor.start();
      logger.info("Heartbeat executor started");

      // Start autoDream memory consolidation
      autoDream.start();
      logger.info("AutoDream memory consolidation started");

      // Start router
      router.start();

      // Start gateway
      await gateway.start();

      // Start config watcher for hot-reload
      if (resolvedConfigPath) {
        configWatcher = createConfigWatcher(
          resolvedConfigPath,
          eventBus,
          logger,
          handleConfigDiff,
        );
        configWatcher.start();
        logger.info("Config watcher started for hot-reload");
      }

      const agentCount = agentManager.getAllAgents().length;
      eventBus.emit("system:ready", { agentCount });
      logger.info({ agentCount }, "SuperClaw ready");
    },

    async stop() {
      if (!started) return;
      started = false;

      logger.info("Shutting down SuperClaw...");
      eventBus.emit("system:shutdown", { reason: "app.stop() called" });

      // Stop config watcher
      if (configWatcher) {
        configWatcher.stop();
        configWatcher = null;
      }

      // Stop SLA monitor
      slaMonitor.stop();

      // Stop cron scheduler
      if (cronScheduler) {
        cronScheduler.stop();
      }

      // Stop heartbeat executor
      heartbeatExecutor.stop();

      // Stop autoDream
      autoDream.stop();

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

      // Disconnect MCP servers
      if (mcpManager) {
        await mcpManager.disconnectAll();
        logger.info("MCP servers disconnected");
      }

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
