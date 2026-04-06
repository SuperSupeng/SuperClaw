// ============================================================================
// dev command — 开发模式
// ============================================================================

import pc from "picocolors";
import { createApp } from "@superclaw-ai/core";

export async function devCommand(options: { config?: string }): Promise<void> {
  console.log("");
  console.log(
    `  ${pc.cyan(pc.bold("⚡ SuperClaw"))} ${pc.dim("v0.1.0")} dev server`,
  );
  console.log("");

  let app: Awaited<ReturnType<typeof createApp>>;

  try {
    app = await createApp({
      configPath: options.config,
      resolveModulesFrom: import.meta.url,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(`  ${pc.red("✗")} Failed to load config: ${message}`);
    process.exit(1);
  }

  // Listen for system:ready before starting
  app.events.on("system:ready", (data) => {
    console.log("");
    console.log(`  ${pc.green("✓")} ${pc.bold("Ready")}`);
    console.log("");
    console.log(`  ${pc.dim("Agents")}    ${pc.cyan(String(data.agentCount))}`);

    // Report channel status
    const channels = Object.keys(app.config.channels);
    for (const ch of channels) {
      const channelConfig = app.config.channels[ch];
      const status = channelConfig?.enabled !== false ? pc.green("connected") : pc.yellow("disabled");
      console.log(`  ${pc.dim("Channel")}   ${ch} ${status}`);
    }

    // Report gateway port
    const port = app.config.gateway?.port ?? 3000;
    console.log(`  ${pc.dim("Gateway")}   ${pc.cyan(`http://localhost:${port}`)}`);
    console.log("");
  });

  try {
    await app.start();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(`  ${pc.red("✗")} Failed to start: ${message}`);
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async () => {
    console.log("");
    console.log(`  ${pc.dim("Shutting down...")}`);
    await app.stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
