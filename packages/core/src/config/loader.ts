// ============================================================================
// Config Loader — 配置文件加载与环境变量插值
// ============================================================================

import { readFileSync, existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { parse as parseYaml } from "yaml";
import { validateConfig } from "./schema.js";
import type { SuperClawConfig } from "@superclaw-ai/types";

/**
 * 加载 .env 文件并设置到 process.env
 * 自实现，不引入 dotenv 依赖
 */
function loadDotEnv(dir: string): void {
  const envPath = join(dir, ".env");
  if (!existsSync(envPath)) return;

  let content: string;
  try {
    content = readFileSync(envPath, "utf-8");
  } catch {
    return;
  }

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    // 跳过空行和注释
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    // 去除引号
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    // 不覆盖已存在的环境变量
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

/**
 * 环境变量插值：递归替换 ${ENV_VAR} 为 process.env.ENV_VAR
 */
function interpolateEnv(obj: unknown): unknown {
  if (typeof obj === "string") {
    return obj.replace(/\$\{([^}]+)\}/g, (_, envKey: string) => {
      return process.env[envKey] ?? "";
    });
  }
  if (Array.isArray(obj)) {
    return obj.map(interpolateEnv);
  }
  if (obj !== null && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = interpolateEnv(value);
    }
    return result;
  }
  return obj;
}

/** 配置文件名候选列表 */
const CONFIG_FILENAMES = [
  "superclaw.config.json",
  "superclaw.config.yaml",
  "superclaw.config.yml",
];

/**
 * 从指定目录向上查找配置文件
 */
function findConfigFile(startDir: string): string | null {
  let dir = resolve(startDir);
  const root = dirname(dir);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    for (const name of CONFIG_FILENAMES) {
      const candidate = join(dir, name);
      if (existsSync(candidate)) {
        return candidate;
      }
    }
    const parent = dirname(dir);
    if (parent === dir || parent === root) break;
    dir = parent;
  }
  return null;
}

/**
 * 加载 SuperClaw 配置
 *
 * @param path - 配置文件路径。未指定时自动从 cwd 向上查找
 * @returns 校验后的完整配置
 */
export async function loadConfig(path?: string): Promise<SuperClawConfig> {
  let configPath: string;

  if (path) {
    configPath = resolve(path);
  } else {
    const found = findConfigFile(process.cwd());
    if (!found) {
      throw new Error(
        "Cannot find superclaw.config.json or superclaw.config.yaml in current directory or parent directories",
      );
    }
    configPath = found;
  }

  // 加载 .env（从配置文件所在目录）
  loadDotEnv(dirname(configPath));

  // 读取配置文件
  const content = await readFile(configPath, "utf-8");

  // 解析
  let raw: unknown;
  if (configPath.endsWith(".json")) {
    raw = JSON.parse(content);
  } else {
    raw = parseYaml(content);
  }

  // 环境变量插值
  const interpolated = interpolateEnv(raw);

  // Zod 校验
  return validateConfig(interpolated);
}
