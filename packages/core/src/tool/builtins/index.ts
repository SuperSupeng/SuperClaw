import type { ToolDefinition } from "@superclaw/types";
import * as getCurrentTime from "./get-current-time.js";
import * as readFile from "./read-file.js";
import * as writeFile from "./write-file.js";
import * as webFetch from "./web-fetch.js";

/** 单条内置工具：定义 + 执行函数 */
export interface BuiltinToolModule {
  definition: ToolDefinition;
  execute: (
    args: Record<string, unknown>,
    ctx: BuiltinExecutionContext,
  ) => Promise<unknown>;
}

/** 执行内置工具时的上下文（由 BuiltinExecutor 注入） */
export interface BuiltinExecutionContext {
  workspaceRoot: string;
  allowedDomains?: string[];
}

const modules: BuiltinToolModule[] = [
  { definition: getCurrentTime.definition, execute: getCurrentTime.execute },
  {
    definition: readFile.definition,
    execute: (args, ctx) => readFile.execute(args, ctx),
  },
  {
    definition: writeFile.definition,
    execute: (args, ctx) => writeFile.execute(args, ctx),
  },
  {
    definition: webFetch.definition,
    execute: (args, ctx) => webFetch.execute(args, ctx),
  },
];

/** 所有内置工具的 ToolDefinition（供 LLM 注册） */
export const builtinToolDefinitions: ToolDefinition[] = modules.map((m) => m.definition);

/** 内置工具名称列表 */
export const allBuiltinToolNames: string[] = modules.map((m) => m.definition.name);

const byName = new Map<string, BuiltinToolModule>();
for (const m of modules) {
  byName.set(m.definition.name, m);
}

export function getBuiltinModule(name: string): BuiltinToolModule | undefined {
  return byName.get(name);
}
