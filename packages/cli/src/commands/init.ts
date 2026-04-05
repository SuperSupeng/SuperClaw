// ============================================================================
// init command — 初始化项目
// ============================================================================

import { mkdir, writeFile, access } from "node:fs/promises";
import { join } from "node:path";
import pc from "picocolors";

const DEFAULT_CONFIG = {
  version: "0.1.0",
  name: "my-superclaw",
  providers: {
    default: {
      id: "default",
      baseUrl: "${OPENAI_BASE_URL:=https://api.openai.com/v1}",
      apiKey: "${OPENAI_API_KEY}",
      api: "openai",
      models: ["gpt-4o", "gpt-4o-mini"],
    },
  },
  agents: [
    {
      id: "assistant",
      name: "Assistant",
      soul: "./agents/assistant/SOUL.md",
      tier: "executive",
      lifecycle: "persistent",
      model: {
        primary: "gpt-4o",
        fallbacks: ["gpt-4o-mini"],
      },
    },
  ],
  channels: {
    cli: {
      type: "cli",
      enabled: true,
      accounts: {
        default: {
          id: "default",
        },
      },
    },
  },
  bindings: [
    {
      channel: "cli",
      account: "default",
      agent: "assistant",
    },
  ],
};

const DEFAULT_SOUL = `# Assistant

## Identity
You are Assistant, a helpful digital assistant powered by SuperClaw.

## Personality
- Friendly and professional
- Concise but thorough
- Proactive in offering help

## Guidelines
- Always be honest about what you can and cannot do
- Ask clarifying questions when the request is ambiguous
- Provide actionable suggestions
`;

const ENV_EXAMPLE = `# Model Provider
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_BASE_URL=https://api.openai.com/v1

# Discord (optional)
# DISCORD_TOKEN=your-discord-bot-token
`;

const DEFAULT_PACKAGE_JSON = {
  name: "my-superclaw",
  version: "0.1.0",
  private: true,
  type: "module",
  scripts: {
    dev: "superclaw dev",
    start: "superclaw start",
  },
  dependencies: {
    superclaw: "^0.1.0",
  },
};

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function initCommand(options: { name?: string }): Promise<void> {
  const cwd = process.cwd();
  const projectName = options.name ?? "my-superclaw";

  console.log("");
  console.log(`  ${pc.cyan(pc.bold("SuperClaw"))} ${pc.dim("project init")}`);
  console.log("");

  // superclaw.config.json
  const configPath = join(cwd, "superclaw.config.json");
  const config = { ...DEFAULT_CONFIG, name: projectName };
  await writeFile(configPath, JSON.stringify(config, null, 2) + "\n", "utf-8");
  console.log(`  ${pc.green("✓")} Created ${pc.dim("superclaw.config.json")}`);

  // agents/assistant/SOUL.md
  const soulDir = join(cwd, "agents", "assistant");
  await mkdir(soulDir, { recursive: true });
  await writeFile(join(soulDir, "SOUL.md"), DEFAULT_SOUL, "utf-8");
  console.log(`  ${pc.green("✓")} Created ${pc.dim("agents/assistant/SOUL.md")}`);

  // .env.example
  await writeFile(join(cwd, ".env.example"), ENV_EXAMPLE, "utf-8");
  console.log(`  ${pc.green("✓")} Created ${pc.dim(".env.example")}`);

  // package.json (only if not exists)
  const pkgPath = join(cwd, "package.json");
  if (!(await fileExists(pkgPath))) {
    const pkg = { ...DEFAULT_PACKAGE_JSON, name: projectName };
    await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
    console.log(`  ${pc.green("✓")} Created ${pc.dim("package.json")}`);
  } else {
    console.log(`  ${pc.yellow("⚠")} ${pc.dim("package.json")} already exists, skipped`);
  }

  console.log("");
  console.log(`  ${pc.bold("Next steps:")}`);
  console.log("");
  console.log(`    ${pc.cyan("pnpm install && superclaw dev")}`);
  console.log("");
}
