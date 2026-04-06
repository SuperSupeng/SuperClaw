import { describe, it, expect, vi } from "vitest";
import { createLaneManager } from "./lane-manager.js";

const mockLogger = {
  child: () => mockLogger,
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
} as any;

describe("LaneManager", () => {
  it("acquire returns handle with correct lane and agentId", () => {
    const lm = createLaneManager(mockLogger);
    const handle = lm.acquire("main", "agent-1");
    expect(handle.lane).toBe("main");
    expect(handle.agentId).toBe("agent-1");
    expect(typeof handle.release).toBe("function");
  });

  it("release frees the lane", () => {
    const lm = createLaneManager(mockLogger);
    const handle = lm.acquire("main", "agent-1");
    handle.release();
    // After release, the agent should no longer be in any lane
    expect(lm.getLaneForAgent("agent-1")).toBeUndefined();
    // Should be able to acquire again
    const handle2 = lm.acquire("main", "agent-1");
    expect(handle2.lane).toBe("main");
  });

  it("double acquire for same agent throws error", () => {
    const lm = createLaneManager(mockLogger);
    lm.acquire("main", "agent-1");
    expect(() => lm.acquire("subagent", "agent-1")).toThrowError(
      /Agent agent-1 is already in lane "main"/,
    );
  });

  it("max concurrency enforced", () => {
    const lm = createLaneManager(mockLogger, 2);
    lm.acquire("main", "agent-1");
    lm.acquire("main", "agent-2");
    expect(() => lm.acquire("main", "agent-3")).toThrowError(
      /Lane "main" has reached max concurrency \(2\)/,
    );
  });

  it("getActiveLanes returns correct state", () => {
    const lm = createLaneManager(mockLogger);
    lm.acquire("main", "agent-1");
    lm.acquire("subagent", "agent-2");

    const active = lm.getActiveLanes();
    expect(active.get("main")).toEqual(["agent-1"]);
    expect(active.get("subagent")).toEqual(["agent-2"]);
    expect(active.get("team")).toEqual([]);
    expect(active.get("cron")).toEqual([]);
  });

  it("getLaneForAgent returns correct lane", () => {
    const lm = createLaneManager(mockLogger);
    lm.acquire("cron", "agent-x");
    expect(lm.getLaneForAgent("agent-x")).toBe("cron");
    expect(lm.getLaneForAgent("nonexistent")).toBeUndefined();
  });
});
