// ============================================================================
// Tool — 工具系统
// ============================================================================
// SuperClaw 的工具系统支持三种类型：
// 1. function — 内置 JS 函数
// 2. mcp     — MCP 协议工具（外部进程）
// 3. cli     — CLI 命令工具（拥抱 CLI 趋势：feishu-cli, gh, vercel, etc.）
//
// 设计理念：未来越来越多产品会提供 CLI 模式（飞书已开源 CLI），
// Agent 通过 CLI 操作各种产品是必然趋势。SuperClaw 在 Tool 层原生支持。
// ============================================================================

/** 工具配置——联合类型，按 type 区分 */
export type ToolConfig = FunctionToolConfig | MCPToolConfig | CLIToolConfig;

/** 内置函数工具 */
export interface FunctionToolConfig {
  type: "function";
  /** 工具名称 */
  name: string;
  /** 工具描述（给 LLM 看） */
  description: string;
  /** 参数 JSON Schema */
  parameters: Record<string, unknown>;
  /** handler 模块路径（相对于项目根目录） */
  handler: string;
}

/** MCP 协议工具 */
export interface MCPToolConfig {
  type: "mcp";
  /** MCP Server 标识（对应 config 中的 mcp.servers 条目） */
  server: string;
  /** 只暴露 server 中的特定工具（空 = 全部） */
  tools?: string[];
}

/** CLI 命令工具 */
export interface CLIToolConfig {
  type: "cli";
  /** 工具名称 */
  name: string;
  /** 工具描述 */
  description: string;
  /** CLI 可执行文件名或路径 */
  command: string;
  /** 可用的子命令定义 */
  subcommands?: CLISubcommandConfig[];
  /** 安装检查命令（如 "gh --version"） */
  installCheck?: string;
  /** 安装提示 */
  installHint?: string;
  /** 默认输出格式 */
  outputFormat?: "json" | "text";
  /** 全局参数（每次调用都附加） */
  globalArgs?: string[];
  /** 超时时间（毫秒） */
  timeout?: number;
}

/** CLI 子命令配置 */
export interface CLISubcommandConfig {
  /** 子命令名称（如 "pr create"） */
  name: string;
  /** 描述 */
  description: string;
  /** 参数定义 */
  args?: CLIArgConfig[];
  /** 该子命令的输出格式 */
  outputFormat?: "json" | "text" | "table";
}

/** CLI 参数配置 */
export interface CLIArgConfig {
  /** 参数名（如 "--title"） */
  name: string;
  /** 描述 */
  description: string;
  /** 是否必填 */
  required?: boolean;
  /** 参数类型 */
  type?: "string" | "number" | "boolean";
  /** 默认值 */
  default?: string;
}

// ─── 运行时接口 ───────────────────────────────────────────────────────────────

/** 工具执行结果 */
export interface ToolResult {
  /** 是否成功 */
  success: boolean;
  /** 输出内容 */
  output: string;
  /** 结构化数据（如 JSON 解析后的结果） */
  data?: unknown;
  /** 错误信息 */
  error?: string;
  /** 执行耗时（毫秒） */
  duration?: number;
}

/** 工具定义（注册到 LLM 的格式） */
export interface ToolDefinition {
  /** 工具名称 */
  name: string;
  /** 描述 */
  description: string;
  /** 参数 JSON Schema */
  parameters: Record<string, unknown>;
  /** 来源类型 */
  source: "function" | "mcp" | "cli";
}

/**
 * ToolExecutor 接口——每种工具类型必须实现
 *
 * 由 packages/core 中的具体类实现：
 * - FunctionToolExecutor
 * - MCPToolExecutor
 * - CLIToolExecutor
 */
export interface ToolExecutor {
  readonly toolType: ToolConfig["type"];
  /** 初始化（校验安装状态等） */
  initialize(): Promise<void>;
  /** 执行工具调用 */
  execute(name: string, args: Record<string, unknown>): Promise<ToolResult>;
  /** 列出可用工具定义 */
  getToolDefinitions(): Promise<ToolDefinition[]>;
  /** 清理资源 */
  dispose(): Promise<void>;
}
