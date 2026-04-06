// ============================================================================
// Converter — OpenClaw → SuperClaw 配置转换
// ============================================================================

import type { SuperClawConfig } from "@superclaw-ai/types";
import type { OpenClawConfig, OpenClawAgent } from "./openclaw-parser.js";

/** 转换警告信息 */
export interface ConvertWarning {
  field: string;
  message: string;
}

/** 转换结果 */
export interface ConvertResult {
  config: SuperClawConfig;
  warnings: ConvertWarning[];
  stats: {
    agentCount: number;
    executiveCount: number;
    workerCount: number;
    bindingCount: number;
    channelCount: number;
    providerCount: number;
  };
}

/**
 * 将 OpenClawConfig 转换为 SuperClawConfig
 */
export function convertToSuperClaw(openclaw: OpenClawConfig): ConvertResult {
  const warnings: ConvertWarning[] = [];

  // ─── providers ──────────────────────────────────────────────────────
  const providers: SuperClawConfig["providers"] = {};
  const ocProviders = openclaw.models?.providers ?? {};
  let providerCount = 0;

  for (const [key, p] of Object.entries(ocProviders)) {
    providers[key] = {
      id: key,
      baseUrl: p.baseUrl,
      apiKey: p.apiKey,
      api: normalizeApi(p.api),
      models: p.models,
    };
    providerCount++;
  }

  // ─── agents ─────────────────────────────────────────────────────────
  const agentList = openclaw.agents?.list ?? [];
  const agentDefaults = openclaw.agents?.defaults;

  // Build subagent lookup for tier inference
  const agentsWithSubagents = new Set<string>();
  const subagentOf = new Map<string, string>();

  for (const agent of agentList) {
    if (agent.subagents?.allowAgents && agent.subagents.allowAgents.length > 0) {
      agentsWithSubagents.add(agent.id);
      for (const sub of agent.subagents.allowAgents) {
        subagentOf.set(sub, agent.id);
      }
    }
  }

  let executiveCount = 0;
  let workerCount = 0;

  const agents: SuperClawConfig["agents"] = agentList.map((agent) => {
    const tier = inferTier(agent, agentsWithSubagents);
    const lifecycle = agent.agentDir ? "persistent" as const : "ephemeral" as const;
    const team = inferTeam(agent.id, subagentOf);

    if (tier === "executive") executiveCount++;
    else workerCount++;

    if (!agent.agentDir) {
      warnings.push({
        field: `agents.${agent.id}`,
        message: `Agent "${agent.id}" has no agentDir — mapped as ephemeral`,
      });
    }

    const defaultModel = agentDefaults?.model;
    const model = agent.model ?? defaultModel;

    return {
      id: agent.id,
      name: agent.name,
      soul: agent.agentDir ? "SOUL.md" : "",
      tier,
      lifecycle,
      model: {
        primary: model?.primary ?? "",
        fallbacks: model?.fallbacks,
      },
      tools: undefined, // tools 需要在 SuperClaw 中重新适配格式
      team,
      agentDir: agent.agentDir,
      workspace: agent.workspace,
      delegation: agent.subagents?.allowAgents
        ? { allowAgents: agent.subagents.allowAgents }
        : undefined,
      sandbox: agent.sandbox
        ? {
            allowedPaths: agent.sandbox.allowedPaths,
            allowedDomains: agent.sandbox.allowedDomains,
            maxExecutionTime: agent.sandbox.maxExecutionTime,
            maxMemory: agent.sandbox.maxMemory,
          }
        : undefined,
    };
  });

  // ─── bindings ───────────────────────────────────────────────────────
  const bindings: SuperClawConfig["bindings"] = (openclaw.bindings ?? []).map(
    (b) => ({
      channel: b.match.channel,
      account: b.match.accountId,
      agent: b.agentId,
    }),
  );

  // ─── channels ───────────────────────────────────────────────────────
  const channels: SuperClawConfig["channels"] = {};
  let channelCount = 0;

  for (const [key, ch] of Object.entries(openclaw.channels ?? {})) {
    const accounts: Record<string, { id: string; token?: string; dmPolicy?: "allow" | "deny" | "allowlist"; groupPolicy?: "mention" | "all" | "none"; allowFrom?: string[]; extra?: Record<string, unknown> }> = {};

    for (const [accKey, acc] of Object.entries(ch.accounts ?? {})) {
      const { id: _id, token, dmPolicy, groupPolicy, allowFrom, ...rest } = acc;
      accounts[accKey] = {
        id: accKey,
        token,
        dmPolicy: dmPolicy as "allow" | "deny" | "allowlist" | undefined,
        groupPolicy: groupPolicy as "mention" | "all" | "none" | undefined,
        allowFrom,
        extra: Object.keys(rest).length > 0 ? rest : undefined,
      };
    }

    channels[key] = {
      type: key,
      enabled: ch.enabled ?? true,
      accounts,
    };
    channelCount++;
  }

  // ─── gateway ────────────────────────────────────────────────────────
  const gateway: SuperClawConfig["gateway"] = openclaw.gateway
    ? {
        port: openclaw.gateway.port,
        mode: normalizeMode(openclaw.gateway.mode),
        authToken: openclaw.gateway.auth,
      }
    : undefined;

  // ─── cron ───────────────────────────────────────────────────────────
  const cron: SuperClawConfig["cron"] = openclaw.cron
    ? {
        enabled: openclaw.cron.enabled,
        store: openclaw.cron.store,
      }
    : undefined;

  // ─── router (from messages.queue.debounceMsByChannel) ───────────────
  const debounce = openclaw.messages?.queue?.debounceMsByChannel;
  const router: SuperClawConfig["router"] = debounce
    ? { debounce }
    : undefined;

  // ─── plugins (flatten entries) ──────────────────────────────────────
  const plugins: SuperClawConfig["plugins"] = openclaw.plugins?.entries
    ? openclaw.plugins.entries
    : undefined;

  // ─── mcp ────────────────────────────────────────────────────────────
  const mcpServers = openclaw.mcp?.servers;
  const mcp: SuperClawConfig["mcp"] =
    Array.isArray(mcpServers) && mcpServers.length > 0
      ? {
          servers: mcpServers.map((s: unknown) => {
            const srv = s as Record<string, unknown>;
            return {
              id: String(srv.id ?? srv.name ?? ""),
              command: String(srv.command ?? ""),
              args: Array.isArray(srv.args)
                ? srv.args.map((a: unknown) => String(a))
                : undefined,
              env: srv.env && typeof srv.env === "object"
                ? (srv.env as Record<string, string>)
                : undefined,
            };
          }),
        }
      : undefined;

  if (!mcpServers || (Array.isArray(mcpServers) && mcpServers.length === 0)) {
    warnings.push({
      field: "mcp.servers",
      message: "MCP servers: empty (skipped)",
    });
  }

  // ─── browser ────────────────────────────────────────────────────────
  const browser: SuperClawConfig["browser"] = openclaw.browser
    ? {
        headless: openclaw.browser.headless,
        proxy: openclaw.browser.proxy,
      }
    : undefined;

  // ─── agentDefaults ──────────────────────────────────────────────────
  const agentDefaultsConfig: SuperClawConfig["agentDefaults"] = agentDefaults
    ? {
        model: agentDefaults.model,
        tools: agentDefaults.tools,
        sandbox: agentDefaults.sandbox,
      }
    : undefined;

  // ─── 组装最终配置 ───────────────────────────────────────────────────
  const config: SuperClawConfig = {
    version: "1.0.0",
    name: "superclaw-migrated",
    providers,
    agents,
    agentDefaults: agentDefaultsConfig,
    channels,
    bindings,
    mcp,
    gateway,
    router,
    cron,
    browser,
    plugins,
  };

  return {
    config,
    warnings,
    stats: {
      agentCount: agents.length,
      executiveCount,
      workerCount,
      bindingCount: bindings.length,
      channelCount,
      providerCount,
    },
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function inferTier(
  agent: OpenClawAgent,
  agentsWithSubagents: Set<string>,
): "executive" | "coordinator" | "worker" {
  if (agentsWithSubagents.has(agent.id)) return "executive";
  return "worker";
}

function inferTeam(
  agentId: string,
  subagentOf: Map<string, string>,
): string | undefined {
  return subagentOf.get(agentId);
}

function normalizeApi(
  api: string | undefined,
): "openai" | "anthropic" | "custom" | undefined {
  if (!api) return undefined;
  const lower = api.toLowerCase();
  if (lower === "openai") return "openai";
  if (lower === "anthropic") return "anthropic";
  return "custom";
}

function normalizeMode(
  mode: string | undefined,
): "development" | "production" | undefined {
  if (!mode) return undefined;
  if (mode === "development" || mode === "production") return mode;
  return undefined;
}
