import { describe, it, expect } from "vitest";
import { discordToIncoming, outgoingToDiscord } from "./message-converter.js";

/** discord.js Collection extends Map with a .map() method */
function collection(entries: Array<[string, Record<string, unknown>]> = []) {
  const map = new Map(entries);
  (map as any).map = function <T>(fn: (v: any, k: string, m: Map<string, any>) => T): T[] {
    const result: T[] = [];
    for (const [k, v] of this) result.push(fn(v, k, this));
    return result;
  };
  return map;
}

function makeDMMessage(overrides: Record<string, unknown> = {}) {
  return {
    id: "msg-123",
    content: "hello world",
    author: { id: "user-1", displayName: "TestUser", username: "testuser" },
    channel: { isDMBased: () => true },
    client: { user: { id: "bot-id" } },
    channelId: "ch-1",
    guildId: null,
    createdAt: new Date("2025-01-01T00:00:00Z"),
    attachments: collection(),
    reference: null,
    ...overrides,
  } as any;
}

function makeGroupMessage(overrides: Record<string, unknown> = {}) {
  return makeDMMessage({
    channel: { isDMBased: () => false, name: "general" },
    guildId: "guild-1",
    ...overrides,
  });
}

describe("discordToIncoming", () => {
  it("converts a DM message correctly", () => {
    const result = discordToIncoming(makeDMMessage(), "acc-1");

    expect(result.id).toBe("msg-123");
    expect(result.channelType).toBe("discord");
    expect(result.accountId).toBe("acc-1");
    expect(result.sourceType).toBe("dm");
    expect(result.senderId).toBe("user-1");
    expect(result.senderName).toBe("TestUser");
    expect(result.groupId).toBeUndefined();
    expect(result.content).toBe("hello world");
    expect(result.attachments).toBeUndefined();
    expect(result.replyTo).toBeUndefined();
    expect(result.timestamp).toEqual(new Date("2025-01-01T00:00:00Z"));
  });

  it("converts a group message with guildId and channelName", () => {
    const result = discordToIncoming(makeGroupMessage(), "acc-1");

    expect(result.sourceType).toBe("group");
    expect(result.groupId).toBe("ch-1");
    expect(result.metadata?.guildId).toBe("guild-1");
    expect(result.metadata?.channelName).toBe("general");
  });

  it("strips bot mention from content", () => {
    const message = makeDMMessage({ content: "hello <@bot-id> world" });
    const result = discordToIncoming(message, "acc-1");

    expect(result.content).toBe("hello  world");
  });

  it("strips bot mention with ! prefix", () => {
    const message = makeDMMessage({ content: "<@!bot-id> help me" });
    const result = discordToIncoming(message, "acc-1");

    expect(result.content).toBe("help me");
  });

  it("handles missing bot user gracefully", () => {
    const message = makeDMMessage({
      content: "hello <@bot-id>",
      client: { user: null },
    });
    const result = discordToIncoming(message, "acc-1");

    expect(result.content).toBe("hello <@bot-id>");
  });

  it("converts attachments", () => {
    const attachments = collection([
      [
        "att-1",
        {
          url: "https://cdn.example.com/image.png",
          name: "image.png",
          contentType: "image/png",
          size: 1024,
        },
      ],
      [
        "att-2",
        {
          url: "https://cdn.example.com/file.zip",
          name: "file.zip",
          contentType: "application/zip",
          size: 2048,
        },
      ],
    ]);
    const message = makeDMMessage({ attachments });
    const result = discordToIncoming(message, "acc-1");

    expect(result.attachments).toHaveLength(2);
    expect(result.attachments![0]).toEqual({
      type: "image",
      url: "https://cdn.example.com/image.png",
      name: "image.png",
      mimeType: "image/png",
      size: 1024,
    });
    expect(result.attachments![1]).toEqual({
      type: "file",
      url: "https://cdn.example.com/file.zip",
      name: "file.zip",
      mimeType: "application/zip",
      size: 2048,
    });
  });

  it("resolves audio and video attachment types", () => {
    const attachments = collection([
      ["a1", { url: "u", name: "a.mp3", contentType: "audio/mpeg", size: 10 }],
      ["a2", { url: "u", name: "v.mp4", contentType: "video/mp4", size: 20 }],
    ]);
    const result = discordToIncoming(makeDMMessage({ attachments }), "acc-1");

    expect(result.attachments![0]!.type).toBe("audio");
    expect(result.attachments![1]!.type).toBe("video");
  });

  it("preserves replyTo from message reference", () => {
    const message = makeDMMessage({ reference: { messageId: "ref-456" } });
    const result = discordToIncoming(message, "acc-1");

    expect(result.replyTo).toBe("ref-456");
  });

  it("uses username as fallback when displayName is missing", () => {
    const message = makeDMMessage({
      author: { id: "user-1", displayName: undefined, username: "testuser" },
    });
    const result = discordToIncoming(message, "acc-1");

    expect(result.senderName).toBe("testuser");
  });
});

describe("outgoingToDiscord", () => {
  it("converts a basic message", () => {
    const result = outgoingToDiscord({ content: "hello" } as any);

    expect(result.content).toBe("hello");
  });

  it("appends nextActions as formatted text", () => {
    const result = outgoingToDiscord({
      content: "Choose an option:",
      nextActions: [
        { label: "Yes", description: "Confirm action" },
        { label: "No" },
      ],
    } as any);

    expect(result.content).toContain("Choose an option:");
    expect(result.content).toContain('> **Yes** — Confirm action');
    expect(result.content).toContain("> **No**");
  });

  it("truncates messages exceeding 2000 characters", () => {
    const longContent = "x".repeat(2500);
    const result = outgoingToDiscord({ content: longContent } as any);

    expect(result.content!.length).toBe(2000);
    expect(result.content!.endsWith("...")).toBe(true);
  });

  it("does not truncate messages within limit", () => {
    const content = "x".repeat(1999);
    const result = outgoingToDiscord({ content } as any);

    expect(result.content).toBe(content);
  });

  it("converts attachments to files", () => {
    const result = outgoingToDiscord({
      content: "here are files",
      attachments: [
        { url: "https://example.com/a.png", name: "a.png" },
        { url: "https://example.com/b.pdf" },
      ],
    } as any);

    expect(result.files).toHaveLength(2);
    expect(result.files![0]).toEqual({
      attachment: "https://example.com/a.png",
      name: "a.png",
    });
    expect(result.files![1]).toEqual({
      attachment: "https://example.com/b.pdf",
      name: undefined,
    });
  });

  it("does not include files when no attachments", () => {
    const result = outgoingToDiscord({ content: "hi" } as any);

    expect(result.files).toBeUndefined();
  });
});
