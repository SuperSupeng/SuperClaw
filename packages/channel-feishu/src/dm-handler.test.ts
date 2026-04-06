import { describe, it, expect } from "vitest";
import { shouldHandleDM } from "./dm-handler.js";
import type { FeishuMessageEvent } from "./client-manager.js";

function makeEvent(overrides: Partial<FeishuMessageEvent> = {}): FeishuMessageEvent {
  return {
    sender: {
      sender_id: { open_id: "ou_user1" },
      sender_type: "user",
    },
    message: {
      message_id: "m1",
      chat_type: "p2p",
      content: "{}",
      create_time: "1700000000000",
      chat_id: "c1",
      message_type: "text",
    },
    ...overrides,
  } as FeishuMessageEvent;
}

function makeAccount(overrides: Record<string, unknown> = {}) {
  return { id: "acc-1", ...overrides } as any;
}

describe("shouldHandleDM", () => {
  it("rejects app (bot) sender", () => {
    const event = makeEvent({
      sender: { sender_id: { open_id: "ou_bot" }, sender_type: "app" },
    });

    expect(shouldHandleDM(event, makeAccount({ dmPolicy: "allow" }))).toBe(false);
  });

  it('returns true when dmPolicy is "allow"', () => {
    expect(shouldHandleDM(makeEvent(), makeAccount({ dmPolicy: "allow" }))).toBe(true);
  });

  it('returns false when dmPolicy is "deny"', () => {
    expect(shouldHandleDM(makeEvent(), makeAccount({ dmPolicy: "deny" }))).toBe(false);
  });

  it('returns true when dmPolicy is "allowlist" and user is in allowFrom', () => {
    const account = makeAccount({
      dmPolicy: "allowlist",
      allowFrom: ["ou_user1", "ou_user2"],
    });

    expect(shouldHandleDM(makeEvent(), account)).toBe(true);
  });

  it('returns false when dmPolicy is "allowlist" and user is not in allowFrom', () => {
    const account = makeAccount({
      dmPolicy: "allowlist",
      allowFrom: ["ou_other"],
    });

    expect(shouldHandleDM(makeEvent(), account)).toBe(false);
  });

  it('returns false when dmPolicy is "allowlist" and allowFrom is undefined', () => {
    const account = makeAccount({ dmPolicy: "allowlist" });

    expect(shouldHandleDM(makeEvent(), account)).toBe(false);
  });

  it("defaults to allow when dmPolicy is undefined", () => {
    expect(shouldHandleDM(makeEvent(), makeAccount())).toBe(true);
  });

  it("returns false for unknown policy values", () => {
    expect(shouldHandleDM(makeEvent(), makeAccount({ dmPolicy: "invalid" }))).toBe(false);
  });
});
