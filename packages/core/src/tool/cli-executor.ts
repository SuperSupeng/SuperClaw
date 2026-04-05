// ============================================================================
// CLI Tool Executor — 通过 child_process 执行 CLI 命令
// ============================================================================

import type {
  CLIArgConfig,
  CLISubcommandConfig,
  CLIToolConfig,
  ToolConfig,
  ToolDefinition,
  ToolExecutor,
  ToolResult,
} from "@superclaw/types";
import type { Logger } from "pino";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** 默认超时：30 秒 */
const DEFAULT_TIMEOUT = 30_000;

/**
 * 创建 CLI 工具执行器
 */
export function createCLIExecutor(
  configs: ToolConfig[],
  logger: Logger,
): ToolExecutor {
  const log = logger.child({ module: "cli-executor" });
  const cliConfigs = configs.filter(
    (c): c is CLIToolConfig => c.type === "cli",
  );

  // 工具名 → { cliConfig, subcommand } 的映射
  const toolMap = new Map<
    string,
    { config: CLIToolConfig; subcommand?: CLISubcommandConfig }
  >();

  // 安装状态
  const installStatus = new Map<string, boolean>();

  /** 生成工具名：{cliName}_{subcommandName}（空格换下划线） */
  function makeToolName(cliName: string, subcommandName?: string): string {
    if (!subcommandName) {
      return cliName;
    }
    return `${cliName}_${subcommandName.replace(/\s+/g, "_")}`;
  }

  /** 根据 CLI 参数配置生成 JSON Schema */
  function argsToJsonSchema(
    args?: CLIArgConfig[],
  ): Record<string, unknown> {
    if (!args || args.length === 0) {
      return {
        type: "object",
        properties: {},
        additionalProperties: true,
      };
    }

    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const arg of args) {
      // 将 --name 格式转为参数名
      const paramName = arg.name.replace(/^-+/, "");
      const prop: Record<string, unknown> = {
        description: arg.description,
      };

      switch (arg.type) {
        case "number":
          prop["type"] = "number";
          break;
        case "boolean":
          prop["type"] = "boolean";
          break;
        default:
          prop["type"] = "string";
      }

      if (arg.default !== undefined) {
        prop["default"] = arg.default;
      }

      properties[paramName] = prop;

      if (arg.required) {
        required.push(paramName);
      }
    }

    return {
      type: "object",
      properties,
      ...(required.length > 0 ? { required } : {}),
    };
  }

  /** 将参数对象转为 CLI 参数数组 */
  function buildCliArgs(
    args: Record<string, unknown>,
    subcommand?: CLISubcommandConfig,
  ): string[] {
    const cliArgs: string[] = [];

    // 添加子命令名（可能包含空格，需要拆分）
    if (subcommand) {
      cliArgs.push(...subcommand.name.split(/\s+/));
    }

    // 将参数对象转为 CLI flags
    for (const [key, value] of Object.entries(args)) {
      if (value === undefined || value === null) continue;

      const flag = key.length === 1 ? `-${key}` : `--${key}`;

      if (typeof value === "boolean") {
        if (value) {
          cliArgs.push(flag);
        }
      } else {
        cliArgs.push(flag, String(value));
      }
    }

    return cliArgs;
  }

  return {
    get toolType() {
      return "cli" as const;
    },

    async initialize(): Promise<void> {
      log.info("Initializing CLI executor with %d CLI tools", cliConfigs.length);

      for (const config of cliConfigs) {
        // 检查安装状态
        if (config.installCheck) {
          try {
            const [cmd, ...checkArgs] = config.installCheck.split(/\s+/);
            await execFileAsync(cmd!, checkArgs, { timeout: 5000 });
            installStatus.set(config.name, true);
            log.debug({ cli: config.name }, "CLI tool installed");
          } catch {
            installStatus.set(config.name, false);
            log.warn(
              { cli: config.name, hint: config.installHint },
              "CLI tool not installed",
            );
            continue;
          }
        } else {
          // 没有检查命令，假设已安装
          installStatus.set(config.name, true);
        }

        // 注册子命令为独立工具
        if (config.subcommands && config.subcommands.length > 0) {
          for (const sub of config.subcommands) {
            const toolName = makeToolName(config.name, sub.name);
            toolMap.set(toolName, { config, subcommand: sub });
          }
        } else {
          // 没有子命令，注册整个 CLI 为一个工具
          toolMap.set(config.name, { config });
        }
      }

      log.info("CLI executor initialized, %d tools registered", toolMap.size);
    },

    async execute(name: string, args: Record<string, unknown>): Promise<ToolResult> {
      const entry = toolMap.get(name);
      if (!entry) {
        return {
          success: false,
          output: "",
          error: `CLI tool "${name}" not found`,
        };
      }

      const { config, subcommand } = entry;

      // 检查安装状态
      if (!installStatus.get(config.name)) {
        return {
          success: false,
          output: "",
          error: `CLI tool "${config.command}" is not installed. ${config.installHint ?? ""}`,
        };
      }

      const timeout = config.timeout ?? DEFAULT_TIMEOUT;
      const globalArgs = config.globalArgs ?? [];
      const cliArgs = [...globalArgs, ...buildCliArgs(args, subcommand)];
      const outputFormat = subcommand?.outputFormat ?? config.outputFormat ?? "text";

      // 如果期望 JSON 输出，自动追加 --json 标志（如果还没有）
      if (outputFormat === "json" && !cliArgs.includes("--json")) {
        cliArgs.push("--json");
      }

      log.debug({ cli: config.command, args: cliArgs }, "Executing CLI command");

      try {
        const { stdout, stderr } = await execFileAsync(config.command, cliArgs, {
          timeout,
          maxBuffer: 10 * 1024 * 1024, // 10MB
          env: { ...process.env },
        });

        const output = stdout.trim() || stderr.trim();

        // 尝试 JSON 解析
        let data: unknown;
        if (outputFormat === "json") {
          try {
            data = JSON.parse(output);
          } catch {
            // JSON 解析失败，保持原始输出
            data = undefined;
          }
        }

        return {
          success: true,
          output,
          data,
        };
      } catch (err) {
        const error = err as Error & { stdout?: string; stderr?: string; code?: string; killed?: boolean };

        // 超时处理
        if (error.killed) {
          return {
            success: false,
            output: error.stdout ?? "",
            error: `Command timed out after ${timeout}ms`,
          };
        }

        // 命令执行失败但有输出
        const output = error.stdout ?? error.stderr ?? "";
        return {
          success: false,
          output,
          error: error.message,
        };
      }
    },

    async getToolDefinitions(): Promise<ToolDefinition[]> {
      const definitions: ToolDefinition[] = [];

      for (const [toolName, entry] of toolMap) {
        const { config, subcommand } = entry;

        // 跳过未安装的工具
        if (!installStatus.get(config.name)) continue;

        const description = subcommand
          ? `${config.description} — ${subcommand.description}`
          : config.description;

        const parameters = subcommand
          ? argsToJsonSchema(subcommand.args)
          : { type: "object", properties: {}, additionalProperties: true };

        definitions.push({
          name: toolName,
          description,
          parameters,
          source: "cli",
        });
      }

      return definitions;
    },

    async dispose(): Promise<void> {
      toolMap.clear();
      installStatus.clear();
      log.debug("CLI executor disposed");
    },
  };
}
