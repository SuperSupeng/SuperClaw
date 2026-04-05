// ============================================================================
// add-agent command — 添加 Agent
// ============================================================================

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import pc from "picocolors";

function makeSoul(name: string): string {
  return `# ${name}

## Identity
You are ${name}, a helpful digital assistant powered by SuperClaw.

## Personality
- Friendly and professional
- Concise but thorough
- Proactive in offering help

## Guidelines
- Always be honest about what you can and cannot do
- Ask clarifying questions when the request is ambiguous
- Provide actionable suggestions
`;
}

export async function addAgentCommand(name: string): Promise<void> {
  const cwd = process.cwd();
  const agentId = name.toLowerCase().replace(/\s+/g, "-");
  const displayName = name.charAt(0).toUpperCase() + name.slice(1);

  console.log("");
  console.log(`  ${pc.cyan(pc.bold("SuperClaw"))} ${pc.dim("add agent")}`);
  console.log("");

  // Create agent directory and SOUL.md
  const agentDir = join(cwd, "agents", agentId);
  await mkdir(agentDir, { recursive: true });
  await writeFile(join(agentDir, "SOUL.md"), makeSoul(displayName), "utf-8");
  console.log(`  ${pc.green("✓")} Created ${pc.dim(`agents/${agentId}/SOUL.md`)}`);

  // Update superclaw.config.json
  const configPath = join(cwd, "superclaw.config.json");
  let config: Record<string, unknown>;

  try {
    const raw = await readFile(configPath, "utf-8");
    config = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    console.log(`  ${pc.red("✗")} Cannot read superclaw.config.json`);
    console.log(`    ${pc.dim("Run 'superclaw init' first")}`);
    return;
  }

  // Add agent entry
  const agents = (config.agents ?? []) as Array<Record<string, unknown>>;
  const exists = agents.some((a) => a.id === agentId);

  if (exists) {
    console.log(`  ${pc.yellow("⚠")} Agent "${agentId}" already in config, skipped`);
  } else {
    agents.push({
      id: agentId,
      name: displayName,
      soul: `./agents/${agentId}/SOUL.md`,
      tier: "executive",
      lifecycle: "persistent",
      model: {
        primary: "gpt-4o",
        fallbacks: ["gpt-4o-mini"],
      },
    });
    config.agents = agents;
    await writeFile(configPath, JSON.stringify(config, null, 2) + "\n", "utf-8");
    console.log(`  ${pc.green("✓")} Updated ${pc.dim("superclaw.config.json")}`);
  }

  console.log("");
  console.log(`  ${pc.bold("Agent added:")} ${pc.cyan(displayName)} (${agentId})`);
  console.log(`  ${pc.dim(`Edit agents/${agentId}/SOUL.md to customize the personality`)}`);
  console.log("");
}
