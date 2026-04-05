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
export { createKnowledgeLoader } from "./knowledge/knowledge-loader.js";
export { createSignalBus } from "./signal/signal-bus.js";
