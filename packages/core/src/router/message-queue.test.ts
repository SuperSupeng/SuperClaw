import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createMessageQueue } from "./message-queue.js";
import type { IncomingMessage, RouterConfig } from "@superclaw/types";
import type { Logger } from "pino";

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

function makeMockLogger(): Logger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn().mockReturnThis(),
  } as unknown as Logger;
}

describe("MessageQueue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("enqueue and dequeue messages for an agent", () => {
    const config: RouterConfig = {};
    const queue = createMessageQueue(config, makeMockLogger());

    const msg1 = makeMessage({ id: "m1", content: "first" });
    const msg2 = makeMessage({ id: "m2", content: "second" });

    queue.enqueue("agent-a", msg1);
    queue.enqueue("agent-a", msg2);

    expect(queue.size("agent-a")).toBe(2);

    const out1 = queue.dequeue("agent-a");
    expect(out1?.id).toBe("m1");
    expect(out1?.content).toBe("first");

    const out2 = queue.dequeue("agent-a");
    expect(out2?.id).toBe("m2");

    expect(queue.dequeue("agent-a")).toBeNull();
  });

  it("debounce: messages within debounce window are batched", () => {
    const config: RouterConfig = { debounce: { discord: 500 } };
    const queue = createMessageQueue(config, makeMockLogger());

    const msg1 = makeMessage({ id: "m1", content: "hello" });
    const msg2 = makeMessage({ id: "m2", content: "world", timestamp: new Date(Date.now() + 100) });

    queue.enqueue("agent-a", msg1);
    queue.enqueue("agent-a", msg2);

    // Before debounce timer fires, queue should be empty (messages are held)
    expect(queue.size("agent-a")).toBe(0);

    // Advance past debounce window
    vi.advanceTimersByTime(600);

    // Now the merged message should be in the queue
    expect(queue.size("agent-a")).toBe(1);

    const merged = queue.dequeue("agent-a");
    expect(merged).not.toBeNull();
    expect(merged!.content).toBe("hello\nworld");
  });

  it("overflow: oldest messages dropped when queue full", () => {
    const logger = makeMockLogger();
    const config: RouterConfig = { maxQueueSize: 3 };
    const queue = createMessageQueue(config, logger);

    queue.enqueue("agent-a", makeMessage({ id: "m1" }));
    queue.enqueue("agent-a", makeMessage({ id: "m2" }));
    queue.enqueue("agent-a", makeMessage({ id: "m3" }));
    queue.enqueue("agent-a", makeMessage({ id: "m4" }));

    expect(queue.size("agent-a")).toBe(3);

    // Oldest message (m1) should have been dropped
    const first = queue.dequeue("agent-a");
    expect(first?.id).toBe("m2");

    expect(logger.warn).toHaveBeenCalled();
  });

  it("peek without consuming (size check + dequeue is idempotent per call)", () => {
    const config: RouterConfig = {};
    const queue = createMessageQueue(config, makeMockLogger());

    queue.enqueue("agent-a", makeMessage({ id: "m1" }));
    queue.enqueue("agent-a", makeMessage({ id: "m2" }));

    // size() does not consume
    expect(queue.size("agent-a")).toBe(2);
    expect(queue.size("agent-a")).toBe(2);

    // dequeue consumes one
    queue.dequeue("agent-a");
    expect(queue.size("agent-a")).toBe(1);
  });

  it("dequeue from unknown agent returns null", () => {
    const config: RouterConfig = {};
    const queue = createMessageQueue(config, makeMockLogger());

    expect(queue.dequeue("nonexistent")).toBeNull();
    expect(queue.size("nonexistent")).toBe(0);
  });
});
