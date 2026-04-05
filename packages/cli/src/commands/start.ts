// ============================================================================
// start command — 生产模式
// ============================================================================

import pc from "picocolors";
import { createApp } from "@superclaw/core";

export async function startCommand(options: { config?: string }): Promise<void> {
  let app: Awaited<ReturnType<typeof createApp>>;

  try {
    app = await createApp(options.config);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`${pc.red("✗")} Config error: ${message}`);
    process.exit(1);
  }

  app.events.on("system:ready", (data) => {
    console.log(
      `${pc.green("✓")} SuperClaw started (${data.agentCount} agent${data.agentCount === 1 ? "" : "s"})`,
    );
  });

  try {
    await app.start();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`${pc.red("✗")} Start failed: ${message}`);
    process.exit(1);
  }

  const shutdown = async () => {
    console.log(`${pc.dim("Shutting down...")}`);
    await app.stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
