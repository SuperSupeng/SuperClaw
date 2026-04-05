// ============================================================================
// SuperClaw CLI — 入口
// ============================================================================

import cac from "cac";
import { devCommand } from "./commands/dev.js";
import { startCommand } from "./commands/start.js";
import { initCommand } from "./commands/init.js";
import { addAgentCommand } from "./commands/add-agent.js";

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

cli.help();
cli.version("0.1.0");

cli.parse();
