// ============================================================================
// Tool Registry — 工具注册中心
// ============================================================================

import { resolve } from "node:path";
import type {
  ToolConfig,
  MCPToolConfig,
  BuiltinToolConfig,
  ToolDefinition,
  ToolExecutor,
  ToolResult,
} from "@superclaw/types";
import { ErrorCodes } from "@superclaw/types";
import type { Logger } from "pino";
import { createFunctionExecutor } from "./function-executor.js";
import { createCLIExecutor } from "./cli-executor.js";
import { createBuiltinExecutor } from "./builtin-executor.js";
import type { MCPClientManager } from "../mcp/mcp-client.js";
import { validateToolSchema } from "../mcp/schema-validator.js";
import { allBuiltinToolNames } from "./builtins/index.js";

/** 创建 registry 时的运行时选项（内置工具需要工作区路径） */
export interface ToolRegistryOptions {
  /** 解析后的工作区绝对路径，供 read-file / write-file */
  workspaceRoot: string;
  /** 为 true 时注册全部框架内置工具 */
  includeBuiltins?: boolean;
  /** 来自 AgentConfig.sandbox.allowedDomains，供 web-fetch 域名限制 */
  allowedDomains?: string[];
}

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

function collectEnabledBuiltinNames(
  configs: ToolConfig[],
  includeBuiltinsFlag: boolean | undefined,
): Set<string> {
  const out = new Set<string>();
  for (const c of configs) {
    if ((c as BuiltinToolConfig).type === "builtin") {
      out.add((c as BuiltinToolConfig).name);
    }
  }
  if (includeBuiltinsFlag) {
    for (const n of allBuiltinToolNames) {
      out.add(n);
    }
  }
  return out;
}

/**
 * 创建工具注册中心
 */
export function createToolRegistry(
  configs: ToolConfig[],
  logger: Logger,
  mcpManager?: MCPClientManager,
  options?: ToolRegistryOptions,
): ToolRegistry {
  const log = logger.child({ module: "tool-registry" });
  const executors: ToolExecutor[] = [];
  let cachedDefinitions: ToolDefinition[] = [];
  let initialized = false;

  const workspaceRoot = resolve(options?.workspaceRoot ?? process.cwd());

  // MCP tool name → serverId mapping (for routing execute calls)
  const mcpToolServerMap = new Map<string, string>();

  const enabledBuiltinNames = collectEnabledBuiltinNames(
    configs,
    options?.includeBuiltins,
  );

  // 非内置条目交给 function / cli 执行器（builtin 仅用于声明启用哪些内置工具）
  const configsForDynamicExecutors = configs.filter((c) => c.type !== "builtin");

  if (enabledBuiltinNames.size > 0) {
    executors.push(
      createBuiltinExecutor(
        enabledBuiltinNames,
        {
          workspaceRoot,
          allowedDomains: options?.allowedDomains,
        },
        log,
      ),
    );
  }

  const functionConfigs = configsForDynamicExecutors.filter((c) => c.type === "function");
  const cliConfigs = configsForDynamicExecutors.filter((c) => c.type === "cli");
  const mcpConfigs = configsForDynamicExecutors.filter((c): c is MCPToolConfig => c.type === "mcp");

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

      // MCP 工具：从 mcpManager 获取，按 agent 配置过滤
      if (mcpManager && mcpConfigs.length > 0) {
        for (const mcpCfg of mcpConfigs) {
          const serverTools = mcpManager.getTools(mcpCfg.server);
          for (const tool of serverTools) {
            // 如果配置了 tools 白名单，则只暴露指定工具
            if (mcpCfg.tools && mcpCfg.tools.length > 0 && !mcpCfg.tools.includes(tool.name)) {
              continue;
            }
            // Schema 校验
            const validation = validateToolSchema(tool);
            if (!validation.valid) {
              log.warn(
                { server: mcpCfg.server, tool: tool.name, errors: validation.errors },
                "MCP tool schema validation failed, skipping",
              );
              continue;
            }
            allDefs.push(tool);
            mcpToolServerMap.set(tool.name, mcpCfg.server);
          }
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

      // MCP 工具路由
      const mcpServerId = mcpToolServerMap.get(name);
      if (mcpServerId && mcpManager) {
        try {
          const result = await mcpManager.execute(mcpServerId, name, args);
          result.duration = Date.now() - startTime;
          log.debug(
            { tool: name, success: result.success, duration: result.duration },
            "MCP tool execution complete",
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
      if (mcpManager) {
        try {
          await mcpManager.disconnectAll();
        } catch (err) {
          log.warn({ error: err }, "MCP manager disconnection failed");
        }
      }
      mcpToolServerMap.clear();
      cachedDefinitions = [];
      initialized = false;
    },
  };
}
