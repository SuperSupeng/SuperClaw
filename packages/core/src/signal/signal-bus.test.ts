import { describe, it, expect, vi, afterEach } from "vitest";
import { createSignalBus, type SignalBus } from "./signal-bus.js";
import { createEventBus } from "../event-bus.js";

describe("SignalBus", () => {
  let bus: SignalBus;
  let eventBus: ReturnType<typeof createEventBus>;

  afterEach(() => {
    bus?.dispose();
  });

  function setup() {
    eventBus = createEventBus();
    bus = createSignalBus(eventBus);
    return { eventBus, bus };
  }

  it("send creates a pending signal", () => {
    const { bus } = setup();

    const signal = bus.send("agent-a", ["agent-b"], "task:request", { foo: 1 });

    expect(signal.id).toBeDefined();
    expect(signal.status).toBe("pending");
    expect(signal.from).toBe("agent-a");
    expect(signal.to).toEqual(["agent-b"]);
    expect(signal.type).toBe("task:request");
    expect(signal.payload).toEqual({ foo: 1 });
  });

  it("consume marks signal as consumed", () => {
    const { bus } = setup();

    bus.send("agent-a", ["agent-b"], "task:request", { v: 1 });
    const consumed = bus.consume("agent-b");

    expect(consumed).toHaveLength(1);
    expect(consumed[0]!.status).toBe("consumed");
    expect(consumed[0]!.consumedBy).toBe("agent-b");
    expect(consumed[0]!.consumedAt).toBeInstanceOf(Date);
  });

  it("getPending returns only unconsumed signals for target agent", () => {
    const { bus } = setup();

    bus.send("a", ["agent-b"], "type1", null);
    bus.send("a", ["agent-c"], "type2", null);
    bus.send("a", ["agent-b", "agent-c"], "type3", null);

    const pendingB = bus.getPending("agent-b");
    expect(pendingB).toHaveLength(2);
    expect(pendingB.map((s) => s.type).sort()).toEqual(["type1", "type3"]);

    // Consume one, then check again
    bus.consume("agent-b", "type1");
    const afterConsume = bus.getPending("agent-b");
    expect(afterConsume).toHaveLength(1);
    expect(afterConsume[0]!.type).toBe("type3");
  });

  it("expired signals are cleaned up via interval", () => {
    vi.useFakeTimers();
    try {
      const { bus, eventBus } = setup();
      const expiredHandler = vi.fn();
      eventBus.on("signal:expired", expiredHandler);

      // Send a signal with a very short TTL (1 second)
      const signal = bus.send("a", ["b"], "urgent", null, { ttl: "1s" });
      expect(signal.expiresAt).toBeInstanceOf(Date);

      // Advance past TTL and past the cleanup interval (60s)
      vi.advanceTimersByTime(61_000);

      expect(expiredHandler).toHaveBeenCalled();
      const expired = expiredHandler.mock.calls[0]![0] as { signal: { status: string } };
      expect(expired.signal.status).toBe("expired");
    } finally {
      vi.useRealTimers();
    }
  });

  it("SLA field is preserved", () => {
    const { bus } = setup();

    const signal = bus.send("a", ["b"], "review", null, { sla: "5m" });

    expect(signal.slaDeadline).toBeInstanceOf(Date);
    const expectedMs = signal.createdAt.getTime() + 5 * 60 * 1000;
    expect(signal.slaDeadline!.getTime()).toBe(expectedMs);
  });
});
