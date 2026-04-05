// ============================================================================
// Tool Registry — 工具注册中心
// ============================================================================

import type {
  ToolConfig,
  ToolDefinition,
  ToolExecutor,
  ToolResult,
} from "@superclaw/types";
import { ErrorCodes } from "@superclaw/types";
import type { Logger } from "pino";
import { createFunctionExecutor } from "./function-executor.js";
import { createCLIExecutor } from "./cli-executor.js";

/** Tool Registry 接口 */
export interface ToolRegistry {
  /** 执行工具 */
  execute(name: string, args: Record<string, unknown>): Promise<ToolResult>;
  /** 获取所有工具定义（同步，从缓存返回） */
  getToolDefinitions(): ToolDefinition[];
  /** 初始化所有执行器 */
  initialize(): Promise<void>;
  /** 清理资源 */
  dispose(): Promise<void>;
}

/**
 * 创建工具注册中心
 */
export function createToolRegistry(
  configs: ToolConfig[],
  logger: Logger,
): ToolRegistry {
  const log = logger.child({ module: "tool-registry" });
  const executors: ToolExecutor[] = [];
  let cachedDefinitions: ToolDefinition[] = [];
  let initialized = false;

  // 按类型分组并创建执行器
  const functionConfigs = configs.filter((c) => c.type === "function");
  const cliConfigs = configs.filter((c) => c.type === "cli");
  // MCP 暂不实现

  if (functionConfigs.length > 0) {
    executors.push(createFunctionExecutor(functionConfigs, log));
  }

  if (cliConfigs.length > 0) {
    executors.push(createCLIExecutor(cliConfigs, log));
  }

  return {
    async initialize(): Promise<void> {
      log.info("Initializing tool registry with %d executors", executors.length);
      for (const executor of executors) {
        try {
          await executor.initialize();
        } catch (err) {
          log.warn({ toolType: executor.toolType, error: err }, "Executor initialization failed");
        }
      }

      // 缓存工具定义
      const allDefs: ToolDefinition[] = [];
      for (const executor of executors) {
        try {
          const defs = await executor.getToolDefinitions();
          allDefs.push(...defs);
        } catch (err) {
          log.warn({ toolType: executor.toolType, error: err }, "Failed to get tool definitions");
        }
      }
      cachedDefinitions = allDefs;
      initialized = true;
      log.info("Tool registry initialized, %d tools available", cachedDefinitions.length);
    },

    getToolDefinitions(): ToolDefinition[] {
      return cachedDefinitions;
    },

    async execute(name: string, args: Record<string, unknown>): Promise<ToolResult> {
      if (!initialized) {
        throw new Error("Tool registry not initialized. Call initialize() first.");
      }

      const startTime = Date.now();
      log.debug({ tool: name, args }, "Executing tool");

      // 找到能处理这个工具的执行器
      for (const executor of executors) {
        const defs = await executor.getToolDefinitions();
        const found = defs.find((d) => d.name === name);
        if (found) {
          try {
            const result = await executor.execute(name, args);
            result.duration = Date.now() - startTime;
            log.debug(
              { tool: name, success: result.success, duration: result.duration },
              "Tool execution complete",
            );
            return result;
          } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            return {
              success: false,
              output: "",
              error: `${ErrorCodes.TOOL_EXECUTION_FAILED}: ${error.message}`,
              duration: Date.now() - startTime,
            };
          }
        }
      }

      return {
        success: false,
        output: "",
        error: `${ErrorCodes.TOOL_NOT_FOUND}: Tool "${name}" not found`,
        duration: Date.now() - startTime,
      };
    },

    async dispose(): Promise<void> {
      log.info("Disposing tool registry");
      for (const executor of executors) {
        try {
          await executor.dispose();
        } catch (err) {
          log.warn({ toolType: executor.toolType, error: err }, "Executor disposal failed");
        }
      }
      cachedDefinitions = [];
      initialized = false;
    },
  };
}
