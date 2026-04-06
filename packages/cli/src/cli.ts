// ============================================================================
// SuperClaw CLI — 入口
// ============================================================================

import cac from "cac";
import { devCommand } from "./commands/dev.js";
import { startCommand } from "./commands/start.js";
import { initCommand } from "./commands/init.js";
import { addAgentCommand } from "./commands/add-agent.js";
import { migrateCommand } from "./commands/migrate.js";

const cli = cac("superclaw");

cli.option("--config, -c <path>", "Path to config file");

cli
  .command("dev", "Start development server")
  .option("--config, -c <path>", "Path to config file")
  .action(async (options: { config?: string }) => {
    await devCommand({ config: options.config });
  });

cli
  .command("start", "Start production server")
  .option("--config, -c <path>", "Path to config file")
  .action(async (options: { config?: string }) => {
    await startCommand({ config: options.config });
  });

cli
  .command("init", "Initialize a new SuperClaw project")
  .option("--name <name>", "Project name")
  .action(async (options: { name?: string }) => {
    await initCommand({ name: options.name });
  });

cli
  .command("add <name>", "Add a new Agent to the project")
  .action(async (name: string) => {
    await addAgentCommand(name);
  });

cli
  .command("migrate", "Migrate from OpenClaw configuration")
  .option("--from <path>", "Path to openclaw.json")
  .option("--output-dir <dir>", "Output directory for SuperClaw config")
  .option("--copy-agents", "Copy agent directories to SuperClaw")
  .option("--dry-run", "Preview migration without writing files")
  .option("--start", "Start SuperClaw after migration")
  .action(
    async (options: {
      from?: string;
      outputDir?: string;
      copyAgents?: boolean;
      dryRun?: boolean;
      start?: boolean;
    }) => {
      await migrateCommand({
        from: options.from,
        outputDir: options.outputDir,
        copyAgents: options.copyAgents,
        dryRun: options.dryRun,
        start: options.start,
      });
    },
  );

cli.help();
cli.version("0.1.0");

cli.parse();
