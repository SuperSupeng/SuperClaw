// ============================================================================
// Migration Orchestrator — 一键迁移入口
// ============================================================================

import { readFile, writeFile, mkdir, cp } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { homedir } from "node:os";

import { parseOpenClawConfig } from "./openclaw-parser.js";
import { convertToSuperClaw } from "./converter.js";
import { migrateEnv } from "./env-migrator.js";

import type { ConvertWarning } from "./converter.js";

// ─── 公共类型 ────────────────────────────────────────────────────────────────

export interface MigrateOptions {
  /** 源配置路径，默认 ~/.openclaw/openclaw.json */
  from?: string;
  /** 输出目录，默认 ~/.superclaw/ */
  outputDir?: string;
  /** 是否复制 agent 目录 */
  copyAgents?: boolean;
  /** 只预览不执行 */
  dryRun?: boolean;
  /** 迁移后立即启动 */
  start?: boolean;
}

export interface MigrateResult {
  /** 是否成功 */
  success: boolean;
  /** 生成的配置文件路径 */
  configPath: string;
  /** .env 迁移的变量数量 */
  envVarCount: number;
  /** 复制的 agent 目录数量 */
  copiedAgentDirs: number;
  /** 转换统计 */
  stats: {
    agentCount: number;
    executiveCount: number;
    workerCount: number;
    bindingCount: number;
    channelCount: number;
    providerCount: number;
  };
  /** 警告 */
  warnings: ConvertWarning[];
  /** 是否为 dry-run */
  dryRun: boolean;
}

// ─── Re-exports ─────────────────────────────────────────────────────────────

export { parseOpenClawConfig } from "./openclaw-parser.js";
export type { OpenClawConfig } from "./openclaw-parser.js";
export { convertToSuperClaw } from "./converter.js";
export type { ConvertWarning, ConvertResult } from "./converter.js";
export { migrateEnv } from "./env-migrator.js";

// ─── Main ───────────────────────────────────────────────────────────────────

/**
 * 执行 OpenClaw → SuperClaw 一键迁移
 */
export async function runMigration(
  options: MigrateOptions = {},
): Promise<MigrateResult> {
  const home = homedir();
  const from = resolve(options.from ?? join(home, ".openclaw", "openclaw.json"));
  const outputDir = resolve(options.outputDir ?? join(home, ".superclaw"));
  const dryRun = options.dryRun ?? false;
  const copyAgents = options.copyAgents ?? false;

  // 1. 读取 openclaw.json
  if (!existsSync(from)) {
    throw new Error(`OpenClaw config not found: ${from}`);
  }

  const rawJson = await readFile(from, "utf-8");
  let raw: unknown;
  try {
    raw = JSON.parse(rawJson);
  } catch {
    throw new Error(`Failed to parse JSON: ${from}`);
  }

  // 2. 解析为 OpenClawConfig
  const openclawConfig = parseOpenClawConfig(raw);

  // 3. 转换为 SuperClawConfig
  const { config, warnings, stats } = convertToSuperClaw(openclawConfig);

  // 4. 写入 superclaw.config.json
  const configPath = join(outputDir, "superclaw.config.json");

  if (!dryRun) {
    if (!existsSync(outputDir)) {
      await mkdir(outputDir, { recursive: true });
    }
    await writeFile(configPath, JSON.stringify(config, null, 2), "utf-8");
  }

  // 5. 迁移 .env
  const sourceDir = dirname(from);
  let envVarCount = 0;

  if (!dryRun) {
    const envResult = await migrateEnv(sourceDir, outputDir);
    envVarCount = envResult.count;
  } else {
    // dry-run: 只统计
    const envPath = join(sourceDir, ".env");
    if (existsSync(envPath)) {
      const envContent = await readFile(envPath, "utf-8");
      envVarCount = envContent
        .split("\n")
        .filter((l) => {
          const t = l.trim();
          return t.length > 0 && !t.startsWith("#");
        }).length;
    }
  }

  // 6. 可选复制 agent 目录
  let copiedAgentDirs = 0;

  if (copyAgents) {
    const agents = openclawConfig.agents?.list ?? [];
    for (const agent of agents) {
      if (!agent.agentDir) continue;
      const srcDir = resolve(sourceDir, agent.agentDir);
      if (!existsSync(srcDir)) continue;

      const destDir = join(outputDir, "agents", agent.id);

      if (!dryRun) {
        if (!existsSync(dirname(destDir))) {
          await mkdir(dirname(destDir), { recursive: true });
        }
        await cp(srcDir, destDir, { recursive: true });
      }
      copiedAgentDirs++;
    }
  }

  return {
    success: true,
    configPath,
    envVarCount,
    copiedAgentDirs,
    stats,
    warnings,
    dryRun,
  };
}
