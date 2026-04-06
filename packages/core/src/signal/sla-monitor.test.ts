import { describe, it, expect, vi, afterEach } from "vitest";
import { createSLAMonitor, type SLAMonitor } from "./sla-monitor.js";
import { createSignalBus, type SignalBus } from "./signal-bus.js";
import { createEventBus } from "../event-bus.js";

/** Minimal mock logger that satisfies the pino Logger interface enough for tests */
function createMockLogger() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn().mockReturnThis(),
    level: "info",
  } as unknown as import("pino").Logger;
}

describe("SLAMonitor", () => {
  let monitor: SLAMonitor;
  let signalBus: SignalBus;
  let eventBus: ReturnType<typeof createEventBus>;

  afterEach(() => {
    monitor?.stop();
    signalBus?.dispose();
    vi.useRealTimers();
  });

  function setup() {
    vi.useFakeTimers();
    eventBus = createEventBus();
    signalBus = createSignalBus(eventBus);
    const logger = createMockLogger();
    monitor = createSLAMonitor(signalBus, eventBus, logger);
    return { eventBus, signalBus, monitor, logger };
  }

  it("start/stop without errors", () => {
    const { monitor } = setup();

    expect(() => monitor.start()).not.toThrow();
    expect(() => monitor.stop()).not.toThrow();
    // Double stop should also be safe
    expect(() => monitor.stop()).not.toThrow();
  });

  it("detects SLA breach when signal is past deadline", () => {
    const { monitor, signalBus } = setup();

    // Create a signal with a 1-second SLA
    signalBus.send("agent-a", ["agent-b"], "review", { pr: 42 }, { sla: "1s" });

    // Advance time past the SLA deadline
    vi.advanceTimersByTime(2_000);

    // Start the monitor — it runs check() immediately on start
    monitor.start();

    const breaches = monitor.getBreaches();
    expect(breaches.length).toBeGreaterThanOrEqual(1);

    const critical = breaches.find((b) => b.severity === "critical");
    expect(critical).toBeDefined();
    expect(critical!.signalType).toBe("review");
    expect(critical!.from).toBe("agent-a");
  });

  it("emits signal:sla-breach event on breach", () => {
    const { monitor, signalBus, eventBus } = setup();
    const breachHandler = vi.fn();
    eventBus.on("signal:sla-breach", breachHandler);

    signalBus.send("agent-a", ["agent-b"], "urgent", null, { sla: "1s" });

    // Advance past SLA
    vi.advanceTimersByTime(2_000);

    monitor.start();

    // The SLA monitor emits signal:sla-breach, but SignalBus cleanup timer
    // also emits it — we just need at least one call from the monitor
    expect(breachHandler).toHaveBeenCalled();

    const call = breachHandler.mock.calls.find(
      (c: unknown[]) => (c[0] as { signal: { type: string } }).signal.type === "urgent",
    );
    expect(call).toBeDefined();
  });
});
