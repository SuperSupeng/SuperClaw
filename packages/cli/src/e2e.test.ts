// ============================================================================
// SuperClaw CLI — E2E Smoke Tests
// ============================================================================

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execSync } from "node:child_process";
import { mkdtempSync, existsSync, readFileSync, rmSync } from "node:fs";
import { writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

// ─── Helpers ────────────────────────────────────────────────────────────────

const ROOT = resolve(__dirname, "../../..");
const CLI_PKG = resolve(__dirname, "..");

function makeTempDir(): string {
  return mkdtempSync(join(tmpdir(), "superclaw-e2e-"));
}

function cleanDir(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

// ─── 1. superclaw init ─────────────────────────────────────────────────────

describe("superclaw init", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempDir();
  });

  afterEach(() => {
    cleanDir(tempDir);
  });

  it("should generate all scaffold files via initCommand", async () => {
    // Import the init function directly to avoid needing a built dist
    const { initCommand } = await import("./commands/init.js");

    // initCommand writes into process.cwd(), so we temporarily override it
    const originalCwd = process.cwd();
    process.chdir(tempDir);
    try {
      await initCommand({ name: "test-project" });
    } finally {
      process.chdir(originalCwd);
    }

    // Verify generated files exist
    expect(existsSync(join(tempDir, "superclaw.config.json"))).toBe(true);
    expect(existsSync(join(tempDir, "package.json"))).toBe(true);
    expect(existsSync(join(tempDir, "agents"))).toBe(true);
    expect(existsSync(join(tempDir, "agents", "assistant", "SOUL.md"))).toBe(true);
    expect(existsSync(join(tempDir, ".env.example"))).toBe(true);

    // Verify superclaw.config.json is valid JSON
    const configRaw = readFileSync(join(tempDir, "superclaw.config.json"), "utf-8");
    const config = JSON.parse(configRaw);
    expect(config).toBeDefined();
    expect(config.name).toBe("test-project");
    expect(config.version).toBe("0.1.0");
    expect(config.providers).toBeDefined();
    expect(config.agents).toBeInstanceOf(Array);
    expect(config.agents.length).toBeGreaterThan(0);
    expect(config.channels).toBeDefined();
    expect(config.bindings).toBeInstanceOf(Array);

    // Verify package.json is valid and has expected fields
    const pkgRaw = readFileSync(join(tempDir, "package.json"), "utf-8");
    const pkg = JSON.parse(pkgRaw);
    expect(pkg.name).toBe("test-project");
    expect(pkg.scripts?.dev).toBe("superclaw dev");
    expect(pkg.dependencies?.superclaw).toBeDefined();
  });

  it("should not overwrite an existing package.json", async () => {
    const { initCommand } = await import("./commands/init.js");

    // Pre-create a package.json
    const existingPkg = { name: "already-here", version: "9.9.9" };
    writeFileSync(
      join(tempDir, "package.json"),
      JSON.stringify(existingPkg, null, 2),
      "utf-8",
    );

    const originalCwd = process.cwd();
    process.chdir(tempDir);
    try {
      await initCommand({ name: "new-project" });
    } finally {
      process.chdir(originalCwd);
    }

    // package.json should still be the original
    const pkg = JSON.parse(readFileSync(join(tempDir, "package.json"), "utf-8"));
    expect(pkg.name).toBe("already-here");
    expect(pkg.version).toBe("9.9.9");

    // But config and agents should still be created
    expect(existsSync(join(tempDir, "superclaw.config.json"))).toBe(true);
    expect(existsSync(join(tempDir, "agents", "assistant", "SOUL.md"))).toBe(true);
  });
});

// ─── 2. Config Validation ──────────────────────────────────────────────────

describe("config validation", () => {
  it("should validate a minimal valid config", async () => {
    const { validateConfig } = await import("@superclaw-ai/core");

    const minimalConfig = {
      version: "0.1.0",
      name: "test",
      providers: {
        default: {
          id: "default",
          baseUrl: "https://api.openai.com/v1",
          apiKey: "sk-test",
          api: "openai",
          models: ["gpt-4o"],
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

    const result = validateConfig(minimalConfig);
    expect(result).toBeDefined();
    expect(result.version).toBe("0.1.0");
    expect(result.agents).toHaveLength(1);
    expect(result.agents[0].id).toBe("assistant");
  });

  it("should throw on an invalid config (missing required fields)", async () => {
    const { validateConfig } = await import("@superclaw-ai/core");

    // Missing providers, agents, channels, bindings
    const invalidConfig = {
      version: "0.1.0",
    };

    expect(() => validateConfig(invalidConfig)).toThrow("Config validation failed");
  });

  it("should throw on config with invalid agent tier", async () => {
    const { validateConfig } = await import("@superclaw-ai/core");

    const badConfig = {
      version: "0.1.0",
      providers: {
        default: {
          id: "default",
          baseUrl: "https://api.openai.com/v1",
          apiKey: "sk-test",
          models: ["gpt-4o"],
        },
      },
      agents: [
        {
          id: "bad-agent",
          name: "Bad",
          soul: "./SOUL.md",
          tier: "supreme-leader", // invalid tier
          lifecycle: "persistent",
          model: { primary: "gpt-4o" },
        },
      ],
      channels: {},
      bindings: [],
    };

    expect(() => validateConfig(badConfig)).toThrow("Config validation failed");
  });
});

// ─── 3. createApp with minimal config ──────────────────────────────────────

describe("createApp smoke test", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempDir();
  });

  afterEach(() => {
    cleanDir(tempDir);
  });

  it("should return an app object with expected methods (no crash)", async () => {
    const { createApp } = await import("@superclaw-ai/core");

    // Write a minimal superclaw.config.json
    const config = {
      version: "0.1.0",
      name: "e2e-test",
      providers: {
        default: {
          id: "default",
          baseUrl: "https://api.openai.com/v1",
          apiKey: "sk-fake-key-for-testing",
          api: "openai",
          models: ["gpt-4o"],
        },
      },
      agents: [
        {
          id: "test-agent",
          name: "Test Agent",
          soul: "./agents/test/SOUL.md",
          tier: "executive",
          lifecycle: "persistent",
          model: {
            primary: "gpt-4o",
            fallbacks: [],
          },
        },
      ],
      channels: {
        cli: {
          type: "cli",
          enabled: false, // disabled so it won't try to connect
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
          agent: "test-agent",
        },
      ],
    };

    const configPath = join(tempDir, "superclaw.config.json");
    writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");

    // Also create the SOUL.md so the agent can reference it
    const soulDir = join(tempDir, "agents", "test");
    mkdirSync(soulDir, { recursive: true });
    writeFileSync(join(soulDir, "SOUL.md"), "# Test Agent\nYou are a test agent.", "utf-8");

    const app = await createApp(configPath);

    // Verify the app object has expected methods
    expect(app).toBeDefined();
    expect(typeof app.start).toBe("function");
    expect(typeof app.stop).toBe("function");
    expect(typeof app.getAgent).toBe("function");
    expect(typeof app.getAllAgents).toBe("function");

    // Verify config is accessible
    expect(app.config).toBeDefined();
    expect(app.config.name).toBe("e2e-test");

    // Verify events bus is present
    expect(app.events).toBeDefined();
    expect(typeof app.events.on).toBe("function");
    expect(typeof app.events.emit).toBe("function");

    // Verify agents are loaded (not started, just registered)
    const agents = app.getAllAgents();
    expect(agents).toBeInstanceOf(Array);

    // Do NOT call app.start() — that would require real provider connections
  });
});
