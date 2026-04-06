import { describe, it, expect, vi } from "vitest";
import { shouldHandleGroup } from "./group-handler.js";

const BOT_USER_ID = "bot-123";

function makeMessage(overrides: Record<string, unknown> = {}) {
  return {
    author: { bot: false },
    guildId: "guild-1",
    mentions: { has: vi.fn().mockReturnValue(false) },
    ...overrides,
  } as any;
}

function makeAccount(overrides: Record<string, unknown> = {}) {
  return { id: "acc-1", ...overrides } as any;
}

describe("shouldHandleGroup", () => {
  it("rejects bot messages", () => {
    const message = makeMessage({ author: { bot: true } });
    expect(shouldHandleGroup(message, makeAccount(), BOT_USER_ID)).toBe(false);
  });

  it("allows message when guild is in whitelist", () => {
    const message = makeMessage({
      guildId: "guild-1",
      mentions: { has: vi.fn().mockReturnValue(true) },
    });
    const account = makeAccount({ extra: { guilds: ["guild-1", "guild-2"] } });

    expect(shouldHandleGroup(message, account, BOT_USER_ID)).toBe(true);
  });

  it("rejects message when guild is not in whitelist", () => {
    const message = makeMessage({ guildId: "guild-99" });
    const account = makeAccount({ extra: { guilds: ["guild-1", "guild-2"] } });

    expect(shouldHandleGroup(message, account, BOT_USER_ID)).toBe(false);
  });

  it("skips guild check when no guilds whitelist configured", () => {
    const message = makeMessage({
      guildId: "guild-99",
      mentions: { has: vi.fn().mockReturnValue(true) },
    });
    const account = makeAccount();

    expect(shouldHandleGroup(message, account, BOT_USER_ID)).toBe(true);
  });

  it('returns true for "mention" policy when bot is mentioned', () => {
    const has = vi.fn().mockReturnValue(true);
    const message = makeMessage({ mentions: { has } });

    expect(shouldHandleGroup(message, makeAccount({ groupPolicy: "mention" }), BOT_USER_ID)).toBe(true);
    expect(has).toHaveBeenCalledWith(BOT_USER_ID);
  });

  it('returns false for "mention" policy when bot is not mentioned', () => {
    const has = vi.fn().mockReturnValue(false);
    const message = makeMessage({ mentions: { has } });

    expect(shouldHandleGroup(message, makeAccount({ groupPolicy: "mention" }), BOT_USER_ID)).toBe(false);
    expect(has).toHaveBeenCalledWith(BOT_USER_ID);
  });

  it("defaults to mention policy when groupPolicy is undefined", () => {
    const has = vi.fn().mockReturnValue(true);
    const message = makeMessage({ mentions: { has } });

    expect(shouldHandleGroup(message, makeAccount(), BOT_USER_ID)).toBe(true);
    expect(has).toHaveBeenCalledWith(BOT_USER_ID);
  });

  it('returns true for "all" policy', () => {
    const message = makeMessage();
    expect(shouldHandleGroup(message, makeAccount({ groupPolicy: "all" }), BOT_USER_ID)).toBe(true);
  });

  it('returns false for "none" policy', () => {
    const message = makeMessage();
    expect(shouldHandleGroup(message, makeAccount({ groupPolicy: "none" }), BOT_USER_ID)).toBe(false);
  });

  it("returns false for unknown policy values", () => {
    const message = makeMessage();
    expect(shouldHandleGroup(message, makeAccount({ groupPolicy: "invalid" }), BOT_USER_ID)).toBe(false);
  });
});
