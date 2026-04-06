import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AgentConfig, MemoryManager, BootProgress } from "@superclaw/types";

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
}));

import { readFile } from "node:fs/promises";
import { runBootSequence, type BootDeps } from "./boot-sequence";

const mockLogger = {
  child: () => mockLogger,
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
} as any;

function makeMemoryManager(overrides: Partial<MemoryManager> = {}): MemoryManager {
  return {
    load: vi.fn().mockResolvedValue(""),
    write: vi.fn().mockResolvedValue(undefined),
    getValidEntries: vi.fn().mockResolvedValue([]),
    decay: vi.fn().mockResolvedValue(0),
    ...overrides,
  };
}

function makeConfig(overrides: Partial<AgentConfig> = {}): AgentConfig {
  return {
    id: "test-agent",
    name: "Test Agent",
    soul: "SOUL.md",
    tier: "worker",
    lifecycle: "persistent",
    model: { primary: "openai:gpt-4" },
    agentDir: "/agents/test",
    ...overrides,
  };
}

describe("runBootSequence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("produces system prompt containing Soul content", async () => {
    const soulContent = "You are Darren's strategic assistant.";
    vi.mocked(readFile).mockResolvedValue(soulContent);

    const deps: BootDeps = {
      memoryManager: makeMemoryManager(),
      logger: mockLogger,
    };

    const prompt = await runBootSequence(makeConfig(), deps);

    expect(prompt).toContain("## Soul");
    expect(prompt).toContain(soulContent);
  });

  it("includes Challenge Directive section", async () => {
    vi.mocked(readFile).mockResolvedValue("Some soul.");

    const deps: BootDeps = {
      memoryManager: makeMemoryManager(),
      logger: mockLogger,
    };

    const prompt = await runBootSequence(makeConfig(), deps);

    expect(prompt).toContain("挑战指令");
    expect(prompt).toContain("硬编码规则");
    expect(prompt).toContain("坦诚是对人类最大的尊重");
  });

  it("includes company state when available", async () => {
    vi.mocked(readFile).mockResolvedValue("Soul text.");
    const memoryManager = makeMemoryManager({
      load: vi.fn().mockImplementation((_dir: string, type: string) => {
        if (type === "company-state") return Promise.resolve("Q2 revenue up 30%");
        return Promise.resolve("");
      }),
    });

    const deps: BootDeps = { memoryManager, logger: mockLogger };

    const prompt = await runBootSequence(makeConfig(), deps);

    expect(prompt).toContain("## Company State");
    expect(prompt).toContain("Q2 revenue up 30%");
  });

  it("calls onProgress callback with correct steps", async () => {
    vi.mocked(readFile).mockResolvedValue("Soul.");

    const deps: BootDeps = {
      memoryManager: makeMemoryManager(),
      logger: mockLogger,
    };

    const progressCalls: BootProgress[] = [];
    const onProgress = (p: BootProgress) => progressCalls.push({ ...p });

    await runBootSequence(makeConfig(), deps, onProgress);

    // Each of the 8 steps emits at least 2 progress calls (start + end)
    expect(progressCalls.length).toBeGreaterThanOrEqual(16);

    // Verify all step names appear
    const stepNames = new Set(progressCalls.map((p) => p.step));
    expect(stepNames).toContain("load-company-state");
    expect(stepNames).toContain("load-soul");
    expect(stepNames).toContain("load-knowledge");
    expect(stepNames).toContain("load-user-profile");
    expect(stepNames).toContain("load-focus");
    expect(stepNames).toContain("load-signals");
    expect(stepNames).toContain("cleanup-expired");
    expect(stepNames).toContain("ready");

    // totalSteps should always be 8
    for (const p of progressCalls) {
      expect(p.totalSteps).toBe(8);
    }
  });

  it("uses default soul template when SOUL.md not found", async () => {
    vi.mocked(readFile).mockRejectedValue(new Error("ENOENT"));

    const memoryManager = makeMemoryManager({
      load: vi.fn().mockImplementation((_dir: string, type: string) => {
        if (type === "soul") return Promise.resolve(null);
        return Promise.resolve("");
      }),
    });

    const deps: BootDeps = { memoryManager, logger: mockLogger };

    const prompt = await runBootSequence(makeConfig(), deps);

    expect(prompt).toContain("## Soul");
    expect(prompt).toContain("You are a helpful AI assistant");
  });
});
