// ============================================================================
// Function Tool Executor — 动态 import JS 函数作为工具
// ============================================================================

import type {
  FunctionToolConfig,
  ToolConfig,
  ToolDefinition,
  ToolExecutor,
  ToolResult,
} from "@superclaw-ai/types";
import type { Logger } from "pino";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

/**
 * 创建函数工具执行器
 */
export function createFunctionExecutor(
  configs: ToolConfig[],
  logger: Logger,
): ToolExecutor {
  const log = logger.child({ module: "function-executor" });
  const functionConfigs = configs.filter(
    (c): c is FunctionToolConfig => c.type === "function",
  );

  // 缓存已加载的 handler
  const handlers = new Map<string, (args: Record<string, unknown>) => Promise<unknown>>();

  return {
    get toolType() {
      return "function" as const;
    },

    async initialize(): Promise<void> {
      log.info("Initializing function executor with %d tools", functionConfigs.length);
      // 预加载所有 handler
      for (const config of functionConfigs) {
        try {
          const handlerPath = resolve(config.handler);
          const handlerUrl = pathToFileURL(handlerPath).href;
          const mod = await import(handlerUrl);
          const handler = mod.default ?? mod.handler ?? mod.execute;
          if (typeof handler !== "function") {
            log.warn(
              { tool: config.name, handler: config.handler },
              "Handler module does not export a function",
            );
            continue;
          }
          handlers.set(config.name, handler as (args: Record<string, unknown>) => Promise<unknown>);
          log.debug({ tool: config.name }, "Handler loaded");
        } catch (err) {
          log.warn(
            { tool: config.name, handler: config.handler, error: err },
            "Failed to load handler, tool will be unavailable",
          );
        }
      }
    },

    async execute(name: string, args: Record<string, unknown>): Promise<ToolResult> {
      const handler = handlers.get(name);
      if (!handler) {
        return {
          success: false,
          output: "",
          error: `Handler for tool "${name}" not loaded`,
        };
      }

      try {
        const result = await handler(args);
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
      return functionConfigs
        .filter((c) => handlers.has(c.name))
        .map((c) => ({
          name: c.name,
          description: c.description,
          parameters: c.parameters,
          source: "function" as const,
        }));
    },

    async dispose(): Promise<void> {
      handlers.clear();
      log.debug("Function executor disposed");
    },
  };
}
