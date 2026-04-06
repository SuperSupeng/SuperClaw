import { describe, it, expect } from "vitest";
import { shouldHandleGroup } from "./group-handler.js";
import type { FeishuMessageEvent } from "./client-manager.js";

const BOT_OPEN_ID = "ou_bot123";

function makeEvent(overrides: Record<string, unknown> = {}): FeishuMessageEvent {
  return {
    sender: {
      sender_id: { open_id: "ou_user1" },
      sender_type: "user",
    },
    message: {
      message_id: "m1",
      chat_type: "group",
      content: '{"text":"hello"}',
      create_time: "1700000000000",
      chat_id: "chat-1",
      message_type: "text",
      mentions: [],
    },
    ...overrides,
  } as FeishuMessageEvent;
}

function makeAccount(overrides: Record<string, unknown> = {}) {
  return { id: "acc-1", ...overrides } as any;
}

describe("shouldHandleGroup", () => {
  it("rejects app (bot) sender", () => {
    const event = makeEvent({
      sender: { sender_id: { open_id: "ou_bot" }, sender_type: "app" },
    });

    expect(shouldHandleGroup(event, makeAccount({ groupPolicy: "all" }), BOT_OPEN_ID)).toBe(false);
  });

  it("allows message when chatId is in whitelist", () => {
    const event = makeEvent({
      message: {
        message_id: "m1",
        chat_type: "group",
        content: "{}",
        create_time: "1700000000000",
        chat_id: "chat-1",
        message_type: "text",
        mentions: [{ key: "@_user_1", id: { open_id: BOT_OPEN_ID }, name: "Bot" }],
      },
    });
    const account = makeAccount({ extra: { chatIds: ["chat-1", "chat-2"] } });

    expect(shouldHandleGroup(event, account, BOT_OPEN_ID)).toBe(true);
  });

  it("rejects message when chatId is not in whitelist", () => {
    const event = makeEvent({
      message: {
        message_id: "m1",
        chat_type: "group",
        content: "{}",
        create_time: "1700000000000",
        chat_id: "chat-99",
        message_type: "text",
      },
    });
    const account = makeAccount({ extra: { chatIds: ["chat-1", "chat-2"] } });

    expect(shouldHandleGroup(event, account, BOT_OPEN_ID)).toBe(false);
  });

  it("skips chatIds check when no whitelist configured", () => {
    const event = makeEvent({
      message: {
        message_id: "m1",
        chat_type: "group",
        content: "{}",
        create_time: "1700000000000",
        chat_id: "chat-99",
        message_type: "text",
        mentions: [{ key: "@_user_1", id: { open_id: BOT_OPEN_ID }, name: "Bot" }],
      },
    });

    expect(shouldHandleGroup(event, makeAccount(), BOT_OPEN_ID)).toBe(true);
  });

  it('returns true for "mention" policy when bot is mentioned', () => {
    const event = makeEvent({
      message: {
        message_id: "m1",
        chat_type: "group",
        content: '{"text":"@_user_1 hello"}',
        create_time: "1700000000000",
        chat_id: "chat-1",
        message_type: "text",
        mentions: [{ key: "@_user_1", id: { open_id: BOT_OPEN_ID }, name: "Bot" }],
      },
    });

    expect(shouldHandleGroup(event, makeAccount({ groupPolicy: "mention" }), BOT_OPEN_ID)).toBe(true);
  });

  it('returns false for "mention" policy when bot is not mentioned', () => {
    const event = makeEvent();

    expect(shouldHandleGroup(event, makeAccount({ groupPolicy: "mention" }), BOT_OPEN_ID)).toBe(false);
  });

  it('returns false for "mention" policy when mentions is undefined', () => {
    const event = makeEvent({
      message: {
        message_id: "m1",
        chat_type: "group",
        content: "{}",
        create_time: "1700000000000",
        chat_id: "chat-1",
        message_type: "text",
      },
    });

    expect(shouldHandleGroup(event, makeAccount({ groupPolicy: "mention" }), BOT_OPEN_ID)).toBe(false);
  });

  it("defaults to mention policy when groupPolicy is undefined", () => {
    const event = makeEvent({
      message: {
        message_id: "m1",
        chat_type: "group",
        content: "{}",
        create_time: "1700000000000",
        chat_id: "chat-1",
        message_type: "text",
        mentions: [{ key: "@_user_1", id: { open_id: BOT_OPEN_ID }, name: "Bot" }],
      },
    });

    expect(shouldHandleGroup(event, makeAccount(), BOT_OPEN_ID)).toBe(true);
  });

  it('returns true for "all" policy', () => {
    expect(shouldHandleGroup(makeEvent(), makeAccount({ groupPolicy: "all" }), BOT_OPEN_ID)).toBe(true);
  });

  it('returns false for "none" policy', () => {
    expect(shouldHandleGroup(makeEvent(), makeAccount({ groupPolicy: "none" }), BOT_OPEN_ID)).toBe(false);
  });

  it("returns false for unknown policy values", () => {
    expect(shouldHandleGroup(makeEvent(), makeAccount({ groupPolicy: "invalid" }), BOT_OPEN_ID)).toBe(false);
  });
});
