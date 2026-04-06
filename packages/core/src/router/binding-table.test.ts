import { describe, it, expect } from "vitest";
import { createBindingTable } from "./binding-table.js";
import type { BindingConfig, IncomingMessage } from "@superclaw/types";

function makeMessage(overrides: Partial<IncomingMessage> = {}): IncomingMessage {
  return {
    id: "msg-1",
    channelType: "discord",
    accountId: "bot-1",
    sourceType: "dm",
    senderId: "user-1",
    content: "hello",
    timestamp: new Date(),
    metadata: {},
    ...overrides,
  };
}

describe("BindingTable", () => {
  it("resolves correct agentId for channel+account match", () => {
    const bindings: BindingConfig[] = [
      { channel: "discord", account: "bot-1", agent: "agent-a" },
    ];
    const table = createBindingTable(bindings);
    const result = table.resolve("discord", "bot-1", makeMessage());
    expect(result).toBe("agent-a");
  });

  it("returns null for unmatched binding", () => {
    const bindings: BindingConfig[] = [
      { channel: "discord", account: "bot-1", agent: "agent-a" },
    ];
    const table = createBindingTable(bindings);
    const result = table.resolve("feishu", "bot-99", makeMessage());
    expect(result).toBeNull();
  });

  it("filters by sourceTypes", () => {
    const bindings: BindingConfig[] = [
      {
        channel: "discord",
        account: "bot-1",
        agent: "agent-group",
        filter: { sourceTypes: ["group"] },
      },
    ];
    const table = createBindingTable(bindings);

    // dm message should NOT match
    expect(table.resolve("discord", "bot-1", makeMessage({ sourceType: "dm" }))).toBeNull();

    // group message should match
    expect(
      table.resolve("discord", "bot-1", makeMessage({ sourceType: "group", groupId: "g1" })),
    ).toBe("agent-group");
  });

  it("filters by contentPattern (regex)", () => {
    const bindings: BindingConfig[] = [
      {
        channel: "discord",
        account: "bot-1",
        agent: "agent-cmd",
        filter: { contentPattern: "^/deploy" },
      },
    ];
    const table = createBindingTable(bindings);

    expect(table.resolve("discord", "bot-1", makeMessage({ content: "/deploy prod" }))).toBe(
      "agent-cmd",
    );
    expect(
      table.resolve("discord", "bot-1", makeMessage({ content: "hello world" })),
    ).toBeNull();
  });

  it("multiple bindings: highest priority wins", () => {
    const bindings: BindingConfig[] = [
      { channel: "discord", account: "bot-1", agent: "agent-low", priority: 1 },
      { channel: "discord", account: "bot-1", agent: "agent-high", priority: 10 },
      { channel: "discord", account: "bot-1", agent: "agent-mid", priority: 5 },
    ];
    const table = createBindingTable(bindings);
    expect(table.resolve("discord", "bot-1", makeMessage())).toBe("agent-high");
  });

  it("multiple bindings with no priority: last scanned with default priority wins (first match at same priority)", () => {
    // All have default priority 0, so the last one that matches wins (> not >=)
    // Actually, looking at the code: priority > bestPriority, starting from -Infinity.
    // First match sets bestPriority=0, subsequent matches with priority=0 do NOT beat it (0 > 0 is false).
    // So effectively first match wins when priorities are equal.
    const bindings: BindingConfig[] = [
      { channel: "discord", account: "bot-1", agent: "agent-first" },
      { channel: "discord", account: "bot-1", agent: "agent-second" },
    ];
    const table = createBindingTable(bindings);
    expect(table.resolve("discord", "bot-1", makeMessage())).toBe("agent-first");
  });
});
