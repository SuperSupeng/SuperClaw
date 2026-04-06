// ============================================================================
// doctor command — 环境诊断
// ============================================================================

import pc from "picocolors";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { readFileSync } from "node:fs";

interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
  hint?: string;
}

const checks: CheckResult[] = [];

/**
 * 检查 Node.js 版本
 */
function checkNodeVersion(): void {
  const version = process.version;
  const major = parseInt(version.slice(1).split(".")[0], 10);

  if (major >= 18) {
    checks.push({
      name: "Node.js",
      passed: true,
      message: `${version} (>= 18 required)`,
    });
  } else {
    checks.push({
      name: "Node.js",
      passed: false,
      message: `${version} (requires >= 18)`,
      hint: "Upgrade Node.js: https://nodejs.org/",
    });
  }
}

/**
 * 检查配置文件
 */
function checkConfigFile(): { found: boolean; path?: string; config?: unknown } {
  const configNames = [
    "superclaw.config.json",
    "superclaw.config.yaml",
    "superclaw.config.yml",
  ];

  for (const name of configNames) {
    const configPath = join(process.cwd(), name);
    if (existsSync(configPath)) {
      try {
        const content = readFileSync(configPath, "utf-8");
        const config = name.endsWith(".json")
          ? JSON.parse(content)
          : config; // YAML would need yaml package

        checks.push({
          name: "Config file",
          passed: true,
          message: `found: ${name}`,
        });

        return { found: true, path: configPath, config };
      } catch (err) {
        checks.push({
          name: "Config file",
          passed: false,
          message: `${name} exists but has errors`,
          hint: err instanceof Error ? err.message : "Parse error",
        });
        return { found: false };
      }
    }
  }

  checks.push({
    name: "Config file",
    passed: false,
    message: "not found",
    hint: "Run `superclaw init` to create one",
  });

  return { found: false };
}

/**
 * 检查环境变量（LLM API keys）
 */
function checkEnvVars(config?: unknown): void {
  const llmProviders = ["openai", "anthropic", "google", "deepseek"];
  const envVarMap: Record<string, string> = {
    openai: "OPENAI_API_KEY",
    anthropic: "ANTHROPIC_API_KEY",
    google: "GOOGLE_API_KEY",
    deepseek: "DEEPSEEK_API_KEY",
  };

  // Check if any LLM API key is set
  let foundProvider = false;
  for (const provider of llmProviders) {
    const envVar = envVarMap[provider];
    if (process.env[envVar]) {
      checks.push({
        name: "LLM provider",
        passed: true,
        message: `${provider} (via ${envVar})`,
      });
      foundProvider = true;
      break;
    }
  }

  if (!foundProvider) {
    checks.push({
      name: "LLM provider",
      passed: false,
      message: "no API key found",
      hint: "Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or other provider key in .env",
    });
  }

  // Check channel-specific env vars if channels are configured
  const channelEnvVars: Record<string, string> = {
    discord: "DISCORD_BOT_TOKEN",
    telegram: "TELEGRAM_BOT_TOKEN",
    feishu: "FEISHU_APP_ID",
    dingtalk: "DINGTALK_APP_KEY",
  };

  for (const [channel, envVar] of Object.entries(channelEnvVars)) {
    // Only check if channel might be in use (simplified check)
    if (!process.env[envVar]) {
      // Don't report as error, just info
      // Could enhance this by actually parsing config
    }
  }
}

/**
 * 检查 Agent 目录和 SOUL.md
 */
function checkAgents(): void {
  const agentDirs = ["agents", "agent"];

  for (const dir of agentDirs) {
    const agentPath = join(process.cwd(), dir);
    if (existsSync(agentPath)) {
      try {
        const entries = readdirSync(agentPath).filter((e) =>
          statSync(join(agentPath, e)).isDirectory()
        );

        let validAgents = 0;
        const missingSoul: string[] = [];

        for (const agent of entries) {
          const soulPath = join(agentPath, agent, "SOUL.md");
          if (existsSync(soulPath)) {
            validAgents++;
          } else {
            missingSoul.push(agent);
          }
        }

        if (validAgents > 0) {
          checks.push({
            name: "Agents",
            passed: missingSoul.length === 0,
            message: `${validAgents} found${missingSoul.length > 0 ? `, ${missingSoul.length} missing SOUL.md` : ""}`,
            hint: missingSoul.length > 0 ? `Missing: ${missingSoul.join(", ")}` : undefined,
          });
        } else {
          checks.push({
            name: "Agents",
            passed: false,
            message: "no valid agents found",
            hint: "Create agents with `superclaw add <name>`",
          });
        }
        return;
      } catch {
        // Ignore errors
      }
    }
  }

  checks.push({
    name: "Agents",
    passed: false,
    message: "no agents directory found",
    hint: "Run `superclaw init` to scaffold a project",
  });
}

/**
 * 检查 .env 文件
 */
function checkEnvFile(): void {
  const envPath = join(process.cwd(), ".env");
  if (existsSync(envPath)) {
    checks.push({
      name: ".env file",
      passed: true,
      message: "found",
    });
  } else {
    checks.push({
      name: ".env file",
      passed: false,
      message: "not found",
      hint: "Copy .env.example to .env and fill in your keys",
    });
  }
}

/**
 * 检查 package.json 和依赖
 */
function checkDependencies(): void {
  const pkgPath = join(process.cwd(), "package.json");
  if (!existsSync(pkgPath)) {
    checks.push({
      name: "Dependencies",
      passed: false,
      message: "no package.json found",
      hint: "Run `pnpm install` after `superclaw init`",
    });
    return;
  }

  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    const coreInstalled = "@superclaw-ai/core" in deps;
    const cliInstalled = "@superclaw-ai/cli" in deps;

    if (coreInstalled || cliInstalled) {
      checks.push({
        name: "Dependencies",
        passed: true,
        message: "SuperClaw packages installed",
      });
    } else {
      checks.push({
        name: "Dependencies",
        passed: false,
        message: "SuperClaw packages not found",
        hint: "Run `pnpm install`",
      });
    }
  } catch {
    checks.push({
      name: "Dependencies",
      passed: false,
      message: "could not read package.json",
    });
  }
}

/**
 * 打印诊断报告
 */
function printReport(): void {
  console.log("");
  console.log(`  ${pc.cyan(pc.bold("🏥 SuperClaw Doctor"))}`);
  console.log("");

  const passed = checks.filter((c) => c.passed);
  const failed = checks.filter((c) => !c.passed);

  for (const check of checks) {
    const icon = check.passed ? pc.green("✅") : pc.red("❌");
    const name = pc.dim(check.name.padEnd(12));
    console.log(`  ${icon} ${name} ${check.message}`);
    if (check.hint) {
      console.log(`     ${pc.yellow("→")} ${pc.dim(check.hint)}`);
    }
  }

  console.log("");

  if (failed.length === 0) {
    console.log(`  ${pc.green("✓")} All checks passed!`);
  } else {
    console.log(
      `  ${pc.yellow(`${failed.length} issue${failed.length > 1 ? "s" : ""} found.`)} Fix them and run \`superclaw doctor\` again.`
    );
  }

  console.log("");
}

/**
 * doctor command 主函数
 */
export async function doctorCommand(): Promise<void> {
  // Run all checks
  checkNodeVersion();
  const { found, config } = checkConfigFile();
  checkEnvFile();
  checkEnvVars(config);
  checkAgents();
  checkDependencies();

  // Print report
  printReport();

  // Exit with error code if any check failed
  const hasFailures = checks.some((c) => !c.passed);
  if (hasFailures) {
    process.exit(1);
  }
}
