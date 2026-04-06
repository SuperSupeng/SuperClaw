import { describe, it, expect } from "vitest";
import { feishuToIncoming, outgoingToFeishu } from "./message-converter.js";
import type { FeishuMessageEvent } from "./client-manager.js";

function makeDMEvent(overrides: Record<string, unknown> = {}): FeishuMessageEvent {
  return {
    sender: {
      sender_id: { open_id: "ou_user1" },
      sender_type: "user",
      tenant_key: "tenant-1",
    },
    message: {
      message_id: "m-123",
      chat_type: "p2p",
      content: '{"text":"hello"}',
      create_time: "1700000000000",
      chat_id: "chat-1",
      message_type: "text",
    },
    ...overrides,
  } as FeishuMessageEvent;
}

function makeGroupEvent(overrides: Record<string, unknown> = {}): FeishuMessageEvent {
  return makeDMEvent({
    message: {
      message_id: "m-456",
      chat_type: "group",
      content: '{"text":"@_user_1 hello"}',
      create_time: "1700000000000",
      chat_id: "chat-group-1",
      message_type: "text",
      mentions: [
        { key: "@_user_1", id: { open_id: "ou_bot" }, name: "Bot" },
      ],
    },
    ...overrides,
  });
}

describe("feishuToIncoming", () => {
  it("converts a DM message correctly", () => {
    const result = feishuToIncoming(makeDMEvent(), "acc-1");

    expect(result.id).toBe("m-123");
    expect(result.channelType).toBe("feishu");
    expect(result.accountId).toBe("acc-1");
    expect(result.sourceType).toBe("dm");
    expect(result.senderId).toBe("ou_user1");
    expect(result.groupId).toBeUndefined();
    expect(result.content).toBe("hello");
    expect(result.attachments).toBeUndefined();
    expect(result.timestamp).toEqual(new Date(1700000000000));
  });

  it("converts a group message with groupId", () => {
    const result = feishuToIncoming(makeGroupEvent(), "acc-1");

    expect(result.sourceType).toBe("group");
    expect(result.groupId).toBe("chat-group-1");
    expect(result.metadata?.chatType).toBe("group");
  });

  it("strips mention keys from content", () => {
    const result = feishuToIncoming(makeGroupEvent(), "acc-1");

    expect(result.content).toBe("hello");
    expect(result.content).not.toContain("@_user_1");
  });

  it("strips multiple mention keys from content", () => {
    const event = makeDMEvent({
      message: {
        message_id: "m-789",
        chat_type: "group",
        content: '{"text":"@_user_1 @_user_2 check this"}',
        create_time: "1700000000000",
        chat_id: "chat-1",
        message_type: "text",
        mentions: [
          { key: "@_user_1", id: { open_id: "ou_bot" }, name: "Bot" },
          { key: "@_user_2", id: { open_id: "ou_other" }, name: "Other" },
        ],
      },
    });
    const result = feishuToIncoming(event, "acc-1");

    expect(result.content).toBe("check this");
  });

  it("falls back to raw content when JSON parsing fails", () => {
    const event = makeDMEvent({
      message: {
        message_id: "m-bad",
        chat_type: "p2p",
        content: "not json",
        create_time: "1700000000000",
        chat_id: "chat-1",
        message_type: "text",
      },
    });
    const result = feishuToIncoming(event, "acc-1");

    expect(result.content).toBe("not json");
  });

  it("falls back to raw content when parsed text is missing", () => {
    const event = makeDMEvent({
      message: {
        message_id: "m-no-text",
        chat_type: "p2p",
        content: '{"image_key":"img_xxx"}',
        create_time: "1700000000000",
        chat_id: "chat-1",
        message_type: "image",
      },
    });
    const result = feishuToIncoming(event, "acc-1");

    expect(result.content).toBe('{"image_key":"img_xxx"}');
  });

  it("preserves replyTo from parent_id", () => {
    const event = makeDMEvent({
      message: {
        message_id: "m-reply",
        chat_type: "p2p",
        content: '{"text":"reply"}',
        create_time: "1700000000000",
        chat_id: "chat-1",
        message_type: "text",
        parent_id: "m-parent",
      },
    });
    const result = feishuToIncoming(event, "acc-1");

    expect(result.replyTo).toBe("m-parent");
  });

  it("populates metadata fields", () => {
    const result = feishuToIncoming(makeDMEvent(), "acc-1");

    expect(result.metadata?.chatId).toBe("chat-1");
    expect(result.metadata?.chatType).toBe("p2p");
    expect(result.metadata?.messageType).toBe("text");
    expect(result.metadata?.tenantKey).toBe("tenant-1");
  });
});

describe("outgoingToFeishu", () => {
  it("converts a basic message to feishu format", () => {
    const result = outgoingToFeishu({ content: "hello" } as any);

    expect(result.msg_type).toBe("text");
    expect(result.content).toBe('{"text":"hello"}');
  });

  it("appends nextActions as formatted text", () => {
    const result = outgoingToFeishu({
      content: "Choose:",
      nextActions: [
        { label: "Yes", description: "Confirm" },
        { label: "No" },
      ],
    } as any);

    const parsed = JSON.parse(result.content) as { text: string };
    expect(parsed.text).toContain("Choose:");
    expect(parsed.text).toContain("- Yes — Confirm");
    expect(parsed.text).toContain("- No");
  });

  it("truncates messages exceeding 4000 characters", () => {
    const longContent = "x".repeat(5000);
    const result = outgoingToFeishu({ content: longContent } as any);

    const parsed = JSON.parse(result.content) as { text: string };
    expect(parsed.text.length).toBe(4000);
    expect(parsed.text.endsWith("...")).toBe(true);
  });

  it("does not truncate messages within limit", () => {
    const content = "x".repeat(3999);
    const result = outgoingToFeishu({ content } as any);

    const parsed = JSON.parse(result.content) as { text: string };
    expect(parsed.text).toBe(content);
  });

  it("always returns msg_type text", () => {
    const result = outgoingToFeishu({ content: "hi" } as any);
    expect(result.msg_type).toBe("text");
  });
});
