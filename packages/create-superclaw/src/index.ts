// ============================================================================
// create-superclaw — 交互式脚手架入口
// ============================================================================

import * as p from "@clack/prompts";
import pc from "picocolors";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** 模板目录（build 后在 dist/ 同级的 templates/） */
function getTemplatesDir(): string {
  // In production: dist/index.js -> ../templates
  // In dev: src/index.ts -> ../templates
  return resolve(__dirname, "..", "templates");
}

/** 递归复制目录，对文件内容做变量替换 */
async function copyDir(
  src: string,
  dest: string,
  vars: Record<string, string>,
): Promise<void> {
  await mkdir(dest, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      // Replace directory names containing template vars
      const resolvedName = replaceVars(entry.name, vars);
      const resolvedDestPath = join(dest, resolvedName);
      await copyDir(srcPath, resolvedDestPath, vars);
    } else {
      const content = await readFile(srcPath, "utf-8");
      const replaced = replaceVars(content, vars);
      await writeFile(destPath, replaced, "utf-8");
    }
  }
}

/** 替换模板变量 */
function replaceVars(text: string, vars: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

async function main(): Promise<void> {
  console.log("");
  p.intro(pc.cyan(pc.bold("Create SuperClaw Project")));

  const projectName = await p.text({
    message: "Project name",
    placeholder: "my-superclaw",
    defaultValue: "my-superclaw",
    validate(value) {
      if (!value.trim()) return "Project name is required";
      if (!/^[a-z0-9@][a-z0-9._-]*$/i.test(value.trim())) {
        return "Invalid project name";
      }
    },
  });

  if (p.isCancel(projectName)) {
    p.cancel("Operation cancelled");
    process.exit(0);
  }

  const template = await p.select({
    message: "Choose a template",
    options: [
      { value: "basic", label: "Basic", hint: "Single Agent" },
      { value: "team", label: "Team", hint: "Multi-Agent team (secretary + researcher + writer)" },
    ],
  });

  if (p.isCancel(template)) {
    p.cancel("Operation cancelled");
    process.exit(0);
  }

  const agentName = await p.text({
    message: template === "basic" ? "Agent name" : "Primary agent name",
    placeholder: "assistant",
    defaultValue: "assistant",
    validate(value) {
      if (!value.trim()) return "Agent name is required";
    },
  });

  if (p.isCancel(agentName)) {
    p.cancel("Operation cancelled");
    process.exit(0);
  }

  const channels = await p.multiselect({
    message: "Select channels",
    options: [
      { value: "cli", label: "CLI", hint: "Terminal interface" },
      { value: "discord", label: "Discord", hint: "Discord bot" },
      { value: "feishu", label: "Feishu", hint: "Feishu (Lark) bot" },
      { value: "dingtalk", label: "DingTalk", hint: "DingTalk bot" },
      { value: "telegram", label: "Telegram", hint: "Telegram bot" },
    ],
    initialValues: ["cli"],
    required: true,
  });

  if (p.isCancel(channels)) {
    p.cancel("Operation cancelled");
    process.exit(0);
  }

  const s = p.spinner();
  s.start("Creating project...");

  const projectDir = resolve(process.cwd(), projectName as string);
  const templatesDir = getTemplatesDir();
  const templateDir = join(templatesDir, template as string);

  const agentId = (agentName as string).toLowerCase().replace(/\s+/g, "-");
  const displayName =
    (agentName as string).charAt(0).toUpperCase() + (agentName as string).slice(1);

  const vars: Record<string, string> = {
    PROJECT_NAME: projectName as string,
    AGENT_ID: agentId,
    AGENT_NAME: displayName,
  };

  // Copy template
  await copyDir(templateDir, projectDir, vars);

  const selectedChannels = channels as string[];

  // Inject selected channel configs into superclaw.config.json
  const configPath = join(projectDir, "superclaw.config.json");
  try {
    const raw = await readFile(configPath, "utf-8");
    const config = JSON.parse(raw) as Record<string, unknown>;
    const channelsConfig = config.channels as Record<string, unknown>;
    const bindings = config.bindings as Array<Record<string, unknown>>;

    if (selectedChannels.includes("discord")) {
      channelsConfig.discord = {
        type: "discord",
        enabled: true,
        accounts: {
          default: {
            id: "default",
            token: "${DISCORD_TOKEN}",
          },
        },
      };
      bindings.push({
        channel: "discord",
        account: "default",
        agent: agentId,
      });
    }

    if (selectedChannels.includes("feishu")) {
      channelsConfig.feishu = {
        type: "feishu",
        enabled: true,
        accounts: {
          default: {
            id: "default",
            appId: "${FEISHU_APP_ID}",
            appSecret: "${FEISHU_APP_SECRET}",
          },
        },
      };
      bindings.push({
        channel: "feishu",
        account: "default",
        agent: agentId,
      });
    }

    if (selectedChannels.includes("dingtalk")) {
      channelsConfig.dingtalk = {
        type: "dingtalk",
        enabled: true,
        accounts: {
          default: {
            id: "default",
            appKey: "${DINGTALK_APP_KEY}",
            appSecret: "${DINGTALK_APP_SECRET}",
          },
        },
      };
      bindings.push({
        channel: "dingtalk",
        account: "default",
        agent: agentId,
      });
    }

    if (selectedChannels.includes("telegram")) {
      channelsConfig.telegram = {
        type: "telegram",
        enabled: true,
        accounts: {
          default: {
            id: "default",
            token: "${TELEGRAM_BOT_TOKEN}",
          },
        },
      };
      bindings.push({
        channel: "telegram",
        account: "default",
        agent: agentId,
      });
    }

    if (!selectedChannels.includes("cli")) {
      delete channelsConfig.cli;
      config.bindings = bindings.filter((b) => b.channel !== "cli");
    }

    await writeFile(configPath, JSON.stringify(config, null, 2) + "\n", "utf-8");
  } catch {
    // Template may not have config yet, skip
  }

  s.stop("Project created");

  const nextSteps = [
    `cd ${projectName as string}`,
    "pnpm install",
    "cp .env.example .env",
    "superclaw dev",
  ];

  p.note(nextSteps.map((s) => pc.cyan(s)).join("\n"), "Next steps");

  p.outro(pc.green("Done!"));
}

main().catch((err) => {
  console.error(pc.red("Error:"), err);
  process.exit(1);
});
