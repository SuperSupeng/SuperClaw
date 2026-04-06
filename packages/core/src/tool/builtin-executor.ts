// ============================================================================
// Builtin Tool Executor — 框架内置工具（无动态 import）
// ============================================================================

import type { ToolDefinition, ToolExecutor, ToolResult } from "@superclaw-ai/types";
import type { Logger } from "pino";
import {
  allBuiltinToolNames,
  getBuiltinModule,
  type BuiltinExecutionContext,
} from "./builtins/index.js";

export interface BuiltinExecutorOptions {
  workspaceRoot: string;
  /** 来自 AgentConfig.sandbox.allowedDomains；非空时 web-fetch 仅允许这些主机 */
  allowedDomains?: string[];
}

/**
 * 创建内置工具执行器（由 tool-registry 在存在可用内置工具时注册）
 */
export function createBuiltinExecutor(
  enabledNames: Set<string>,
  options: BuiltinExecutorOptions,
  logger: Logger,
): ToolExecutor {
  const log = logger.child({ module: "builtin-executor" });
  const ctx: BuiltinExecutionContext = {
    workspaceRoot: options.workspaceRoot,
    allowedDomains: options.allowedDomains,
  };

  const resolvedNames = new Set<string>();
  for (const name of enabledNames) {
    if (getBuiltinModule(name)) {
      resolvedNames.add(name);
    } else {
      log.warn({ name }, "Unknown builtin tool name, skipping");
    }
  }

  return {
    get toolType() {
      return "builtin" as const;
    },

    async initialize(): Promise<void> {
      log.info("Builtin executor ready with %d tools", resolvedNames.size);
    },

    async execute(name: string, args: Record<string, unknown>): Promise<ToolResult> {
      const mod = getBuiltinModule(name);
      if (!mod || !resolvedNames.has(name)) {
        return {
          success: false,
          output: "",
          error: `Builtin tool "${name}" is not enabled or unknown`,
        };
      }

      try {
        const result = await mod.execute(args, ctx);
        const output =
          typeof result === "string" ? result : JSON.stringify(result, null, 2);
        return {
          success: true,
          output,
          data: result,
        };
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        return {
          success: false,
          output: "",
          error: error.message,
        };
      }
    },

    async getToolDefinitions(): Promise<ToolDefinition[]> {
      const order = new Map(allBuiltinToolNames.map((n, i) => [n, i]));
      return builtinDefinitionsForNames(resolvedNames).sort(
        (a, b) => (order.get(a.name) ?? 0) - (order.get(b.name) ?? 0),
      );
    },

    async dispose(): Promise<void> {
      log.debug("Builtin executor disposed");
    },
  };
}

function builtinDefinitionsForNames(names: Set<string>): ToolDefinition[] {
  const out: ToolDefinition[] = [];
  for (const name of names) {
    const mod = getBuiltinModule(name);
    if (mod) out.push(mod.definition);
  }
  return out;
}
