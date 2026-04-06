// ============================================================================
// @superclaw/core — 统一导出
// ============================================================================

// Agent Runtime (Agent 1)
export { createAgentRuntime } from "./agent/agent-loop.js";
export type { AgentDeps } from "./agent/agent-loop.js";
export { runBootSequence } from "./agent/boot-sequence.js";
export type { BootDeps } from "./agent/boot-sequence.js";
export { createAgentManager } from "./agent/agent-manager.js";
export type { AgentManager, AgentManagerDeps } from "./agent/agent-manager.js";
export { createModelRouter } from "./model/model-router.js";
export type { ModelRouter, ModelProvider, ModelProviderFactory } from "./model/model-router.js";
export { createOpenAICompatibleProvider } from "./model/providers/openai-compatible.js";
export { createToolRegistry } from "./tool/tool-registry.js";
export type { ToolRegistry } from "./tool/tool-registry.js";

// Gateway + Router + Config (Agent 2)
export { loadConfig } from "./config/loader.js";
export { validateConfig } from "./config/schema.js";
export { diffConfig } from "./config/diff.js";
export type { ConfigDiff } from "./config/diff.js";
export { createConfigWatcher } from "./config/watcher.js";
export type { ConfigWatcher } from "./config/watcher.js";
export { createGatewayServer } from "./gateway/server.js";
export type { GatewayServer } from "./gateway/server.js";
export { createBindingTable } from "./router/binding-table.js";
export type { BindingTable } from "./router/binding-table.js";
export { createMessageQueue } from "./router/message-queue.js";
export type { MessageQueue } from "./router/message-queue.js";
export { createRouter } from "./router/router.js";
export type { Router, RouterDeps } from "./router/router.js";
export { createEventBus } from "./event-bus.js";
export { createApp } from "./app.js";

// Memory + Knowledge + Signal (Agent 5)
export { createMemoryManager } from "./memory/memory-manager.js";
export { createAutoDream } from "./memory/auto-dream.js";
export type { AutoDreamScheduler, AutoDreamDeps } from "./memory/auto-dream.js";
export { createHeartbeatExecutor } from "./memory/heartbeat-executor.js";
export type { HeartbeatExecutor, HeartbeatDeps } from "./memory/heartbeat-executor.js";
export { createKnowledgeLoader } from "./knowledge/knowledge-loader.js";
export { createSignalBus } from "./signal/signal-bus.js";

// Team + Delegation
export { createOrganizationTree } from "./team/organization-tree.js";
export type { OrganizationTree } from "./team/organization-tree.js";
export { createDelegationManager } from "./team/delegation.js";
export type { DelegationManager, DelegationTask } from "./team/delegation.js";

// Cron + Lane + Decision
export { createCronScheduler } from "./cron/cron-scheduler.js";
export type { CronScheduler, CronJobStatus } from "./cron/cron-scheduler.js";
export { createLaneManager } from "./lane/lane-manager.js";
export type { LaneManager, LaneHandle, LaneName } from "./lane/lane-manager.js";
export { createLaneExecutor } from "./lane/lane-executor.js";
export type { LaneExecutor } from "./lane/lane-executor.js";
export { createDecisionEngine } from "./decision/decision-engine.js";
export type { DecisionEngine, PendingDecision } from "./decision/decision-engine.js";

// SLA Monitor
export { createSLAMonitor } from "./signal/sla-monitor.js";

// MCP
export { createMCPClientManager } from "./mcp/mcp-client.js";
export type { MCPClientManager } from "./mcp/mcp-client.js";
export { validateToolSchema } from "./mcp/schema-validator.js";
export type { SchemaValidationResult } from "./mcp/schema-validator.js";

// Migration (OpenClaw → SuperClaw)
export { runMigration } from "./migrate/index.js";
export { parseOpenClawConfig } from "./migrate/openclaw-parser.js";
export { convertToSuperClaw } from "./migrate/converter.js";
export { migrateEnv } from "./migrate/env-migrator.js";
export type { MigrateOptions, MigrateResult } from "./migrate/index.js";
export type { OpenClawConfig } from "./migrate/openclaw-parser.js";
export type { ConvertResult, ConvertWarning } from "./migrate/converter.js";
