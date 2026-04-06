// ============================================================================
// OpenClaw Config Parser — 解析 OpenClaw 原始配置
// ============================================================================

// ─── OpenClaw 类型定义 ───────────────────────────────────────────────────────

/** OpenClaw 模型 Provider */
export interface OpenClawProvider {
  baseUrl: string;
  apiKey: string;
  api?: string;
  models: string[];
}

/** OpenClaw Agent 模型配置 */
export interface OpenClawAgentModel {
  primary: string;
  fallbacks?: string[];
}

/** OpenClaw Agent 子 Agent 配置 */
export interface OpenClawSubagents {
  allowAgents?: string[];
}

/** OpenClaw Agent 沙箱配置 */
export interface OpenClawSandbox {
  allowedPaths?: string[];
  allowedDomains?: string[];
  maxExecutionTime?: number;
  maxMemory?: number;
}

/** OpenClaw Agent 配置 */
export interface OpenClawAgent {
  id: string;
  name: string;
  workspace?: string;
  agentDir?: string;
  model?: OpenClawAgentModel;
  subagents?: OpenClawSubagents;
  tools?: unknown[];
  sandbox?: OpenClawSandbox;
}

/** OpenClaw Agent 默认配置 */
export interface OpenClawAgentDefaults {
  model?: OpenClawAgentModel;
  tools?: string[];
  sandbox?: {
    maxExecutionTime?: number;
    maxMemory?: number;
  };
  memorySearch?: Record<string, unknown>;
  compaction?: Record<string, unknown>;
}

/** OpenClaw 绑定配置 */
export interface OpenClawBinding {
  agentId: string;
  match: {
    channel: string;
    accountId: string;
  };
}

/** OpenClaw 渠道账号 */
export interface OpenClawChannelAccount {
  id?: string;
  token?: string;
  dmPolicy?: string;
  groupPolicy?: string;
  guilds?: unknown;
  allowFrom?: string[];
  [key: string]: unknown;
}

/** OpenClaw 渠道配置 */
export interface OpenClawChannel {
  enabled?: boolean;
  accounts?: Record<string, OpenClawChannelAccount>;
  [key: string]: unknown;
}

/** OpenClaw Gateway 配置 */
export interface OpenClawGateway {
  port?: number;
  mode?: string;
  auth?: string;
  [key: string]: unknown;
}

/** OpenClaw Cron 配置 */
export interface OpenClawCron {
  enabled?: boolean;
  store?: string;
  jobs?: unknown[];
  [key: string]: unknown;
}

/** OpenClaw Messages 配置 */
export interface OpenClawMessages {
  queue?: {
    debounceMsByChannel?: Record<string, number>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/** OpenClaw Tools 配置 */
export interface OpenClawTools {
  web?: Record<string, unknown>;
  exec?: Record<string, unknown>;
  [key: string]: unknown;
}

/** OpenClaw Plugins 配置 */
export interface OpenClawPlugins {
  entries?: Record<string, Record<string, unknown>>;
  [key: string]: unknown;
}

/** OpenClaw MCP 配置 */
export interface OpenClawMCP {
  servers?: unknown[];
  [key: string]: unknown;
}

/** OpenClaw Browser 配置 */
export interface OpenClawBrowser {
  headless?: boolean;
  proxy?: string;
  [key: string]: unknown;
}

/** OpenClaw Hooks 配置 */
export interface OpenClawHooks {
  internal?: {
    entries?: Record<string, unknown>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/** OpenClaw 完整配置 */
export interface OpenClawConfig {
  models?: {
    providers?: Record<string, OpenClawProvider>;
    [key: string]: unknown;
  };
  agents?: {
    list?: OpenClawAgent[];
    defaults?: OpenClawAgentDefaults;
    [key: string]: unknown;
  };
  bindings?: OpenClawBinding[];
  channels?: Record<string, OpenClawChannel>;
  gateway?: OpenClawGateway;
  cron?: OpenClawCron;
  messages?: OpenClawMessages;
  tools?: OpenClawTools;
  plugins?: OpenClawPlugins;
  mcp?: OpenClawMCP;
  browser?: OpenClawBrowser;
  hooks?: OpenClawHooks;
}

// ─── Parser ─────────────────────────────────────────────────────────────────

/**
 * 解析 OpenClaw 原始配置对象，返回类型安全的 OpenClawConfig。
 * 未知字段不会报错，只做结构化提取。
 */
export function parseOpenClawConfig(raw: unknown): OpenClawConfig {
  if (raw === null || raw === undefined || typeof raw !== "object") {
    throw new Error("Invalid OpenClaw config: expected an object");
  }

  const obj = raw as Record<string, unknown>;

  const config: OpenClawConfig = {};

  // models
  if (obj.models && typeof obj.models === "object") {
    const models = obj.models as Record<string, unknown>;
    config.models = {
      providers: parseProviders(models.providers),
    };
  }

  // agents
  if (obj.agents && typeof obj.agents === "object") {
    const agents = obj.agents as Record<string, unknown>;
    config.agents = {
      list: parseAgentList(agents.list),
      defaults: parseAgentDefaults(agents.defaults),
    };
  }

  // bindings
  if (Array.isArray(obj.bindings)) {
    config.bindings = obj.bindings.map(parseBinding);
  }

  // channels
  if (obj.channels && typeof obj.channels === "object") {
    config.channels = obj.channels as Record<string, OpenClawChannel>;
  }

  // gateway
  if (obj.gateway && typeof obj.gateway === "object") {
    config.gateway = obj.gateway as OpenClawGateway;
  }

  // cron
  if (obj.cron && typeof obj.cron === "object") {
    config.cron = obj.cron as OpenClawCron;
  }

  // messages
  if (obj.messages && typeof obj.messages === "object") {
    config.messages = obj.messages as OpenClawMessages;
  }

  // tools
  if (obj.tools && typeof obj.tools === "object") {
    config.tools = obj.tools as OpenClawTools;
  }

  // plugins
  if (obj.plugins && typeof obj.plugins === "object") {
    config.plugins = obj.plugins as OpenClawPlugins;
  }

  // mcp
  if (obj.mcp && typeof obj.mcp === "object") {
    config.mcp = obj.mcp as OpenClawMCP;
  }

  // browser
  if (obj.browser && typeof obj.browser === "object") {
    config.browser = obj.browser as OpenClawBrowser;
  }

  // hooks
  if (obj.hooks && typeof obj.hooks === "object") {
    config.hooks = obj.hooks as OpenClawHooks;
  }

  return config;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseProviders(
  raw: unknown,
): Record<string, OpenClawProvider> | undefined {
  if (!raw || typeof raw !== "object") return undefined;

  const result: Record<string, OpenClawProvider> = {};
  const providers = raw as Record<string, unknown>;

  for (const [key, value] of Object.entries(providers)) {
    if (value && typeof value === "object") {
      const p = value as Record<string, unknown>;
      result[key] = {
        baseUrl: String(p.baseUrl ?? ""),
        apiKey: String(p.apiKey ?? ""),
        api: p.api ? String(p.api) : undefined,
        models: Array.isArray(p.models)
          ? p.models.map((m: unknown) => String(m))
          : [],
      };
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

function parseAgentList(raw: unknown): OpenClawAgent[] | undefined {
  if (!Array.isArray(raw)) return undefined;

  return raw.map((item: unknown) => {
    const a = (item ?? {}) as Record<string, unknown>;
    return {
      id: String(a.id ?? ""),
      name: String(a.name ?? ""),
      workspace: a.workspace ? String(a.workspace) : undefined,
      agentDir: a.agentDir ? String(a.agentDir) : undefined,
      model: a.model && typeof a.model === "object"
        ? {
            primary: String((a.model as Record<string, unknown>).primary ?? ""),
            fallbacks: Array.isArray((a.model as Record<string, unknown>).fallbacks)
              ? ((a.model as Record<string, unknown>).fallbacks as unknown[]).map(
                  (f: unknown) => String(f),
                )
              : undefined,
          }
        : undefined,
      subagents: a.subagents && typeof a.subagents === "object"
        ? {
            allowAgents: Array.isArray(
              (a.subagents as Record<string, unknown>).allowAgents,
            )
              ? (
                  (a.subagents as Record<string, unknown>)
                    .allowAgents as unknown[]
                ).map((s: unknown) => String(s))
              : undefined,
          }
        : undefined,
      tools: Array.isArray(a.tools) ? a.tools : undefined,
      sandbox: a.sandbox && typeof a.sandbox === "object"
        ? (a.sandbox as OpenClawSandbox)
        : undefined,
    };
  });
}

function parseAgentDefaults(raw: unknown): OpenClawAgentDefaults | undefined {
  if (!raw || typeof raw !== "object") return undefined;

  const d = raw as Record<string, unknown>;

  return {
    model: d.model && typeof d.model === "object"
      ? {
          primary: String((d.model as Record<string, unknown>).primary ?? ""),
          fallbacks: Array.isArray(
            (d.model as Record<string, unknown>).fallbacks,
          )
            ? ((d.model as Record<string, unknown>).fallbacks as unknown[]).map(
                (f: unknown) => String(f),
              )
            : undefined,
        }
      : undefined,
    tools: Array.isArray(d.tools)
      ? d.tools.map((t: unknown) => String(t))
      : undefined,
    sandbox: d.sandbox && typeof d.sandbox === "object"
      ? (d.sandbox as OpenClawAgentDefaults["sandbox"])
      : undefined,
    memorySearch: d.memorySearch && typeof d.memorySearch === "object"
      ? (d.memorySearch as Record<string, unknown>)
      : undefined,
    compaction: d.compaction && typeof d.compaction === "object"
      ? (d.compaction as Record<string, unknown>)
      : undefined,
  };
}

function parseBinding(raw: unknown): OpenClawBinding {
  const b = (raw ?? {}) as Record<string, unknown>;
  const match = (b.match ?? {}) as Record<string, unknown>;

  return {
    agentId: String(b.agentId ?? ""),
    match: {
      channel: String(match.channel ?? ""),
      accountId: String(match.accountId ?? ""),
    },
  };
}
