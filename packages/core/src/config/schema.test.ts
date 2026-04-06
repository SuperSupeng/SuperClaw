import { describe, it, expect } from "vitest";
import { validateConfig } from "./schema.js";
import { createMinimalConfig } from "../test-helpers.js";

describe("validateConfig", () => {
  it("should pass validation for a valid minimal config", () => {
    const raw = createMinimalConfig();
    const result = validateConfig(raw);
    expect(result.version).toBe("1.0");
    expect(result.agents).toHaveLength(1);
    expect(result.agents[0]!.id).toBe("agent-1");
  });

  it("should throw when version is missing", () => {
    const raw = createMinimalConfig();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (raw as any).version;
    expect(() => validateConfig(raw)).toThrow("Config validation failed");
  });

  it("should throw when providers is missing", () => {
    const raw = createMinimalConfig();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (raw as any).providers;
    expect(() => validateConfig(raw)).toThrow("Config validation failed");
  });

  it("should throw when agents is missing", () => {
    const raw = createMinimalConfig();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (raw as any).agents;
    expect(() => validateConfig(raw)).toThrow("Config validation failed");
  });

  it("should throw when channels is missing", () => {
    const raw = createMinimalConfig();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (raw as any).channels;
    expect(() => validateConfig(raw)).toThrow("Config validation failed");
  });

  it("should throw when bindings is missing", () => {
    const raw = createMinimalConfig();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (raw as any).bindings;
    expect(() => validateConfig(raw)).toThrow("Config validation failed");
  });

  it("should validate agent config with all required fields", () => {
    const raw = createMinimalConfig({
      agents: [
        {
          id: "agent-x",
          name: "Agent X",
          soul: "You are Agent X.",
          tier: "executive",
          lifecycle: "ephemeral",
          model: { primary: "gpt-4", fallbacks: ["gpt-3.5-turbo"] },
        },
      ],
    });
    const result = validateConfig(raw);
    expect(result.agents[0]!.id).toBe("agent-x");
    expect(result.agents[0]!.tier).toBe("executive");
    expect(result.agents[0]!.lifecycle).toBe("ephemeral");
  });

  it("should throw when agent is missing required fields", () => {
    const raw = createMinimalConfig({
      agents: [
        {
          id: "agent-x",
          name: "Agent X",
          // missing soul, tier, lifecycle, model
        } as any,
      ],
    });
    expect(() => validateConfig(raw)).toThrow("Config validation failed");
  });

  it("should throw when agent tier is invalid", () => {
    const raw = createMinimalConfig({
      agents: [
        {
          id: "agent-x",
          name: "Agent X",
          soul: "soul",
          tier: "invalid-tier" as any,
          lifecycle: "persistent",
          model: { primary: "gpt-4" },
        },
      ],
    });
    expect(() => validateConfig(raw)).toThrow("Config validation failed");
  });

  it("should validate binding config", () => {
    const raw = createMinimalConfig({
      bindings: [
        {
          channel: "discord",
          account: "bot-1",
          agent: "agent-1",
          filter: {
            sourceTypes: ["dm", "group"],
            groupIds: ["g1"],
            contentPattern: "^hello",
          },
          priority: 10,
        },
      ],
    });
    const result = validateConfig(raw);
    expect(result.bindings[0]!.channel).toBe("discord");
    expect(result.bindings[0]!.filter?.sourceTypes).toEqual(["dm", "group"]);
    expect(result.bindings[0]!.priority).toBe(10);
  });

  it("should throw when binding is missing required fields", () => {
    const raw = createMinimalConfig({
      bindings: [
        {
          channel: "discord",
          // missing account and agent
        } as any,
      ],
    });
    expect(() => validateConfig(raw)).toThrow("Config validation failed");
  });

  it("should accept optional fields on the root config", () => {
    const raw = createMinimalConfig({
      name: "My SuperClaw Project",
      gateway: { port: 3000, mode: "development" },
      router: { debounce: { discord: 500 }, maxQueueSize: 50 },
    });
    const result = validateConfig(raw);
    expect(result.name).toBe("My SuperClaw Project");
    expect(result.gateway?.port).toBe(3000);
    expect(result.router?.maxQueueSize).toBe(50);
  });
});
