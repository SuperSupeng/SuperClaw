// ============================================================================
// migrate command — OpenClaw → SuperClaw 一键迁移
// ============================================================================

import pc from "picocolors";
import { runMigration } from "@superclaw-ai/core";
import type { MigrateOptions } from "@superclaw-ai/core";

interface MigrateCommandOptions {
  from?: string;
  outputDir?: string;
  copyAgents?: boolean;
  dryRun?: boolean;
  start?: boolean;
}

export async function migrateCommand(options: MigrateCommandOptions): Promise<void> {
  const migrateOpts: MigrateOptions = {
    from: options.from,
    outputDir: options.outputDir,
    copyAgents: options.copyAgents ?? false,
    dryRun: options.dryRun ?? false,
    start: options.start ?? false,
  };

  const fromPath = migrateOpts.from ?? "~/.openclaw/openclaw.json";

  console.log("");
  console.log(
    `${pc.cyan(">")} Reading OpenClaw config from ${pc.bold(fromPath)}`,
  );

  if (migrateOpts.dryRun) {
    console.log(pc.yellow("  (dry-run mode — no files will be written)"));
  }

  console.log("");

  try {
    const result = await runMigration(migrateOpts);

    // ─── 统计报告 ─────────────────────────────────────────────────────
    const { stats, warnings } = result;

    console.log(
      `${pc.green("+")} Found ${pc.bold(String(stats.agentCount))} agents (${stats.executiveCount} executive, ${stats.workerCount} worker)`,
    );

    // 按渠道统计 bindings
    console.log(
      `${pc.green("+")} Found ${pc.bold(String(stats.bindingCount))} bindings`,
    );

    console.log(
      `${pc.green("+")} Found ${pc.bold(String(stats.channelCount))} channels`,
    );

    console.log(
      `${pc.green("+")} Found ${pc.bold(String(stats.providerCount))} model provider(s)`,
    );

    // 警告
    for (const w of warnings) {
      console.log(`${pc.yellow("!")} ${w.message}`);
    }

    console.log("");

    // ─── 文件输出 ─────────────────────────────────────────────────────
    const verb = result.dryRun ? "Would generate" : "Generated";

    console.log(
      `${pc.blue(">")} ${verb} ${pc.bold(result.configPath)}`,
    );

    if (result.envVarCount > 0) {
      const envVerb = result.dryRun ? "Would copy" : "Copied";
      console.log(
        `${pc.blue(">")} ${envVerb} .env (${result.envVarCount} variables)`,
      );
    }

    if (migrateOpts.copyAgents) {
      const agentVerb = result.dryRun ? "Would copy" : "Copied";
      console.log(
        `${pc.blue(">")} ${agentVerb} ${result.copiedAgentDirs} agent directories`,
      );
    } else {
      console.log(
        `${pc.dim(">")} Agent directories: referencing original paths (use --copy-agents to copy)`,
      );
    }

    console.log("");

    // ─── 启动提示 ─────────────────────────────────────────────────────
    if (result.dryRun) {
      console.log(
        `${pc.dim("Dry-run complete. Run without --dry-run to execute.")}`,
      );
    } else if (migrateOpts.start) {
      console.log(`${pc.green(">")} Starting SuperClaw...`);
      // 动态导入 start 命令
      const { startCommand } = await import("./start.js");
      await startCommand({ config: result.configPath });
    } else {
      console.log(
        `${pc.green(">")} Ready! Run ${pc.bold("superclaw start")} to launch.`,
      );
      console.log(
        `${pc.dim("   Or run")} ${pc.bold("superclaw migrate --start")} ${pc.dim("to start immediately.")}`,
      );
    }

    console.log("");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`${pc.red("x")} Migration failed: ${message}`);
    process.exit(1);
  }
}
