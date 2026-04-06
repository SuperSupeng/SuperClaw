// ============================================================================
// Config Diff — 配置变更差异比较
// ============================================================================

import type { AgentConfig, SuperClawConfig } from "@superclaw/types";

/** 配置变更差异 */
export interface ConfigDiff {
  /** 是否有任何变更 */
  hasChanges: boolean;
  /** Agent 变更 */
  agents: {
    added: AgentConfig[];
    removed: string[];
    modified: AgentConfig[];
  };
  /** Channel 变更 */
  channels: {
    added: string[];
    removed: string[];
    modified: string[];
  };
  /** Binding 变更 */
  bindings: { changed: boolean };
  /** Provider 变更 */
  providers: { changed: boolean };
  /** Gateway 变更 */
  gateway: { changed: boolean };
  /** Router 变更 */
  router: { changed: boolean };
}

/**
 * 比较两份配置，返回差异结果
 *
 * 使用 JSON.stringify 做深度比较，简单有效
 */
export function diffConfig(
  oldConfig: SuperClawConfig,
  newConfig: SuperClawConfig,
): ConfigDiff {
  // ─── Agents ────────────────────────────────────────────────────────────────

  const oldAgentMap = new Map(oldConfig.agents.map((a) => [a.id, a]));
  const newAgentMap = new Map(newConfig.agents.map((a) => [a.id, a]));

  const addedAgents: AgentConfig[] = [];
  const removedAgentIds: string[] = [];
  const modifiedAgents: AgentConfig[] = [];

  for (const [id, agent] of newAgentMap) {
    const oldAgent = oldAgentMap.get(id);
    if (!oldAgent) {
      addedAgents.push(agent);
    } else if (JSON.stringify(oldAgent) !== JSON.stringify(agent)) {
      modifiedAgents.push(agent);
    }
  }

  for (const id of oldAgentMap.keys()) {
    if (!newAgentMap.has(id)) {
      removedAgentIds.push(id);
    }
  }

  // ─── Channels ──────────────────────────────────────────────────────────────

  const oldChannelKeys = new Set(Object.keys(oldConfig.channels));
  const newChannelKeys = new Set(Object.keys(newConfig.channels));

  const addedChannels: string[] = [];
  const removedChannels: string[] = [];
  const modifiedChannels: string[] = [];

  for (const key of newChannelKeys) {
    if (!oldChannelKeys.has(key)) {
      addedChannels.push(key);
    } else if (
      JSON.stringify(oldConfig.channels[key]) !==
      JSON.stringify(newConfig.channels[key])
    ) {
      modifiedChannels.push(key);
    }
  }

  for (const key of oldChannelKeys) {
    if (!newChannelKeys.has(key)) {
      removedChannels.push(key);
    }
  }

  // ─── 其他模块：简单深度比较 ────────────────────────────────────────────────

  const bindingsChanged =
    JSON.stringify(oldConfig.bindings) !== JSON.stringify(newConfig.bindings);

  const providersChanged =
    JSON.stringify(oldConfig.providers) !== JSON.stringify(newConfig.providers);

  const gatewayChanged =
    JSON.stringify(oldConfig.gateway) !== JSON.stringify(newConfig.gateway);

  const routerChanged =
    JSON.stringify(oldConfig.router) !== JSON.stringify(newConfig.router);

  // ─── 汇总 ──────────────────────────────────────────────────────────────────

  const hasChanges =
    addedAgents.length > 0 ||
    removedAgentIds.length > 0 ||
    modifiedAgents.length > 0 ||
    addedChannels.length > 0 ||
    removedChannels.length > 0 ||
    modifiedChannels.length > 0 ||
    bindingsChanged ||
    providersChanged ||
    gatewayChanged ||
    routerChanged;

  return {
    hasChanges,
    agents: {
      added: addedAgents,
      removed: removedAgentIds,
      modified: modifiedAgents,
    },
    channels: {
      added: addedChannels,
      removed: removedChannels,
      modified: modifiedChannels,
    },
    bindings: { changed: bindingsChanged },
    providers: { changed: providersChanged },
    gateway: { changed: gatewayChanged },
    router: { changed: routerChanged },
  };
}
