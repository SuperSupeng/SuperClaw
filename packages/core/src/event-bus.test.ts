import { describe, it, expect, vi } from "vitest";
import { createEventBus } from "./event-bus.js";

describe("EventBus", () => {
  it("emit + on: handler receives correct data", () => {
    const bus = createEventBus();
    const handler = vi.fn();

    bus.on("system:ready", handler);
    bus.emit("system:ready", { agentCount: 3 });

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith({ agentCount: 3 });
  });

  it("once: handler fires once then stops", () => {
    const bus = createEventBus();
    const handler = vi.fn();

    bus.once("system:shutdown", handler);
    bus.emit("system:shutdown", { reason: "test" });
    bus.emit("system:shutdown", { reason: "test2" });

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith({ reason: "test" });
  });

  it("off: handler no longer receives after removal", () => {
    const bus = createEventBus();
    const handler = vi.fn();

    bus.on("config:changed", handler);
    bus.emit("config:changed", { path: "/a" });
    expect(handler).toHaveBeenCalledOnce();

    bus.off("config:changed", handler);
    bus.emit("config:changed", { path: "/b" });
    expect(handler).toHaveBeenCalledOnce(); // still 1
  });

  it("multiple listeners on same event", () => {
    const bus = createEventBus();
    const handlerA = vi.fn();
    const handlerB = vi.fn();

    bus.on("system:ready", handlerA);
    bus.on("system:ready", handlerB);
    bus.emit("system:ready", { agentCount: 5 });

    expect(handlerA).toHaveBeenCalledOnce();
    expect(handlerB).toHaveBeenCalledOnce();
    expect(handlerA).toHaveBeenCalledWith({ agentCount: 5 });
    expect(handlerB).toHaveBeenCalledWith({ agentCount: 5 });
  });
});
