// ============================================================================
// Config Schema — Zod 校验
// ============================================================================

import { z } from "zod";
import type { SuperClawConfig } from "@superclaw-ai/types";

// ─── 子 Schema ─────────────────────────────────────────────────────────────────

const providerConfigSchema = z.object({
  id: z.string(),
  baseUrl: z.string(),
  apiKey: z.string(),
  api: z.enum(["openai", "anthropic", "custom"]).optional(),
  models: z.array(z.string()),
});

const modelConfigSchema = z.object({
  primary: z.string(),
  fallbacks: z.array(z.string()).optional(),
});

const sandboxConfigSchema = z.object({
  allowedPaths: z.array(z.string()).optional(),
  allowedDomains: z.array(z.string()).optional(),
  maxExecutionTime: z.number().optional(),
  maxMemory: z.number().optional(),
});

const delegationConfigSchema = z.object({
  allowAgents: z.array(z.string()),
  requireContextDigest: z.boolean().optional(),
});

const knowledgeSourceConfigSchema = z.object({
  type: z.string(),
  name: z.string(),
  sync: z.enum(["realtime", "daily", "manual"]),
  config: z.record(z.unknown()),
});

const functionToolConfigSchema = z.object({
  type: z.literal("function"),
  name: z.string(),
  description: z.string(),
  parameters: z.record(z.unknown()),
  handler: z.string(),
});

const builtinToolConfigSchema = z.object({
  type: z.literal("builtin"),
  name: z.string(),
});

const mcpToolConfigSchema = z.object({
  type: z.literal("mcp"),
  server: z.string(),
  tools: z.array(z.string()).optional(),
});

const cliSubcommandConfigSchema = z.object({
  name: z.string(),
  description: z.string(),
  args: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
        required: z.boolean().optional(),
        type: z.enum(["string", "number", "boolean"]).optional(),
        default: z.string().optional(),
      }),
    )
    .optional(),
  outputFormat: z.enum(["json", "text", "table"]).optional(),
});

const cliToolConfigSchema = z.object({
  type: z.literal("cli"),
  name: z.string(),
  description: z.string(),
  command: z.string(),
  subcommands: z.array(cliSubcommandConfigSchema).optional(),
  installCheck: z.string().optional(),
  installHint: z.string().optional(),
  outputFormat: z.enum(["json", "text"]).optional(),
  globalArgs: z.array(z.string()).optional(),
  timeout: z.number().optional(),
});

const toolConfigSchema = z.discriminatedUnion("type", [
  functionToolConfigSchema,
  builtinToolConfigSchema,
  mcpToolConfigSchema,
  cliToolConfigSchema,
]);

const agentConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  soul: z.string(),
  tier: z.enum(["executive", "coordinator", "worker"]),
  lifecycle: z.enum(["persistent", "ephemeral"]),
  model: modelConfigSchema,
  tools: z.array(toolConfigSchema).optional(),
  includeBuiltins: z.boolean().optional(),
  knowledge: z.array(knowledgeSourceConfigSchema).optional(),
  team: z.string().optional(),
  agentDir: z.string().optional(),
  workspace: z.string().optional(),
  delegation: delegationConfigSchema.optional(),
  sandbox: sandboxConfigSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
});

const teamConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  lead: z.string(),
  members: z.array(z.string()),
  parentTeam: z.string().optional(),
  allowDelegation: z.array(z.string()).optional(),
  description: z.string().optional(),
});

const channelAccountConfigSchema = z.object({
  id: z.string(),
  token: z.string().optional(),
  dmPolicy: z.enum(["allow", "deny", "allowlist"]).optional(),
  groupPolicy: z.enum(["mention", "all", "none"]).optional(),
  allowFrom: z.array(z.string()).optional(),
  extra: z.record(z.unknown()).optional(),
});

const channelConfigSchema = z.object({
  type: z.string(),
  enabled: z.boolean(),
  accounts: z.record(channelAccountConfigSchema),
});

const bindingFilterSchema = z.object({
  sourceTypes: z.array(z.enum(["dm", "group", "channel"])).optional(),
  groupIds: z.array(z.string()).optional(),
  senderIds: z.array(z.string()).optional(),
  contentPattern: z.string().optional(),
});

const bindingConfigSchema = z.object({
  channel: z.string(),
  account: z.string(),
  agent: z.string(),
  filter: bindingFilterSchema.optional(),
  priority: z.number().optional(),
});

const signalTypeConfigSchema = z.object({
  type: z.string(),
  description: z.string(),
  defaultPriority: z.enum(["critical", "high", "normal", "low"]).optional(),
  defaultSla: z.string().optional(),
  defaultTtl: z.string().optional(),
});

const mcpServerConfigSchema = z.object({
  id: z.string(),
  command: z.string(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
  validateSchema: z.boolean().optional(),
});

const gatewayConfigSchema = z.object({
  port: z.number().optional(),
  mode: z.enum(["development", "production"]).optional(),
  authToken: z.string().optional(),
  healthPath: z.string().optional(),
  dashboardDir: z.string().optional(),
});

const routerConfigSchema = z.object({
  debounce: z.record(z.number()).optional(),
  maxQueueSize: z.number().optional(),
});

const agentDefaultsConfigSchema = z.object({
  model: z
    .object({
      primary: z.string(),
      fallbacks: z.array(z.string()).optional(),
    })
    .optional(),
  tools: z.array(z.string()).optional(),
  sandbox: z
    .object({
      maxExecutionTime: z.number().optional(),
      maxMemory: z.number().optional(),
    })
    .optional(),
});

const cronJobConfigSchema = z.object({
  id: z.string(),
  schedule: z.string(),
  agent: z.string(),
  message: z.string(),
  enabled: z.boolean().optional(),
});

const cronConfigSchema = z.object({
  enabled: z.boolean().optional(),
  store: z.string().optional(),
  jobs: z.array(cronJobConfigSchema).optional(),
});

const browserConfigSchema = z.object({
  headless: z.boolean().optional(),
  proxy: z.string().optional(),
});

// ─── 完整配置 Schema ────────────────────────────────────────────────────────────

const superClawConfigSchema = z.object({
  version: z.string(),
  name: z.string().optional(),
  providers: z.record(providerConfigSchema),
  agents: z.array(agentConfigSchema),
  agentDefaults: agentDefaultsConfigSchema.optional(),
  teams: z.array(teamConfigSchema).optional(),
  channels: z.record(channelConfigSchema),
  bindings: z.array(bindingConfigSchema),
  signalTypes: z.array(signalTypeConfigSchema).optional(),
  mcp: z
    .object({
      servers: z.array(mcpServerConfigSchema),
    })
    .optional(),
  gateway: gatewayConfigSchema.optional(),
  router: routerConfigSchema.optional(),
  cron: cronConfigSchema.optional(),
  browser: browserConfigSchema.optional(),
  plugins: z.record(z.record(z.unknown())).optional(),
});

/**
 * 校验原始配置对象，返回类型安全的 SuperClawConfig
 *
 * @param raw - 从 JSON/YAML 解析的原始对象
 * @returns 校验后的配置
 * @throws 校验失败时抛出友好错误信息
 */
export function validateConfig(raw: unknown): SuperClawConfig {
  const result = superClawConfigSchema.safeParse(raw);

  if (!result.success) {
    const issues = result.error.issues.map((issue) => {
      const path = issue.path.join(".");
      return `  - ${path || "(root)"}: ${issue.message} (expected: ${issue.code})`;
    });
    throw new Error(
      `Config validation failed:\n${issues.join("\n")}`,
    );
  }

  return result.data as SuperClawConfig;
}
