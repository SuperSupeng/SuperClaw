import { describe, it, expect } from "vitest";
import { shouldHandleDM } from "./dm-handler.js";

describe("shouldHandleDM", () => {
  it("rejects bot messages", () => {
    const message = { author: { bot: true, id: "bot-1" } } as any;
    const account = { id: "acc-1", dmPolicy: "allow" } as any;

    expect(shouldHandleDM(message, account)).toBe(false);
  });

  it('returns true when dmPolicy is "allow"', () => {
    const message = { author: { bot: false, id: "user-1" } } as any;
    const account = { id: "acc-1", dmPolicy: "allow" } as any;

    expect(shouldHandleDM(message, account)).toBe(true);
  });

  it('returns false when dmPolicy is "deny"', () => {
    const message = { author: { bot: false, id: "user-1" } } as any;
    const account = { id: "acc-1", dmPolicy: "deny" } as any;

    expect(shouldHandleDM(message, account)).toBe(false);
  });

  it('returns true when dmPolicy is "allowlist" and user is in allowFrom', () => {
    const message = { author: { bot: false, id: "user-1" } } as any;
    const account = {
      id: "acc-1",
      dmPolicy: "allowlist",
      allowFrom: ["user-1", "user-2"],
    } as any;

    expect(shouldHandleDM(message, account)).toBe(true);
  });

  it('returns false when dmPolicy is "allowlist" and user is not in allowFrom', () => {
    const message = { author: { bot: false, id: "user-3" } } as any;
    const account = {
      id: "acc-1",
      dmPolicy: "allowlist",
      allowFrom: ["user-1", "user-2"],
    } as any;

    expect(shouldHandleDM(message, account)).toBe(false);
  });

  it('returns false when dmPolicy is "allowlist" and allowFrom is undefined', () => {
    const message = { author: { bot: false, id: "user-1" } } as any;
    const account = { id: "acc-1", dmPolicy: "allowlist" } as any;

    expect(shouldHandleDM(message, account)).toBe(false);
  });

  it("defaults to allow when dmPolicy is undefined", () => {
    const message = { author: { bot: false, id: "user-1" } } as any;
    const account = { id: "acc-1" } as any;

    expect(shouldHandleDM(message, account)).toBe(true);
  });

  it("returns false for unknown policy values", () => {
    const message = { author: { bot: false, id: "user-1" } } as any;
    const account = { id: "acc-1", dmPolicy: "unknown-policy" } as any;

    expect(shouldHandleDM(message, account)).toBe(false);
  });
});
