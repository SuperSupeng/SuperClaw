import { describe, it, expect, vi } from "vitest";
import { createDecisionEngine } from "./decision-engine.js";
import { createEventBus } from "../event-bus.js";
import type { OutgoingMessage } from "@superclaw-ai/types";

const mockLogger = {
  child: () => mockLogger,
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
} as any;

function makeResponse(content: string): OutgoingMessage {
  return {
    content,
    nextActions: [
      { label: "confirm" },
      { label: "cancel" },
    ],
  } as OutgoingMessage;
}

describe("DecisionEngine", () => {
  it("requestApproval adds to pending queue", async () => {
    const eventBus = createEventBus();
    const engine = createDecisionEngine({ eventBus, logger: mockLogger });

    // Don't await — this promise only resolves on approve/reject
    const promise = engine.requestApproval("agent-1", makeResponse("Deploy to prod"));
    const pending = engine.getPending();
    expect(pending).toHaveLength(1);
    expect(pending[0]!.agentId).toBe("agent-1");
    expect(pending[0]!.description).toBe("Deploy to prod");
    expect(pending[0]!.options).toEqual(["confirm", "cancel"]);

    // Clean up by approving so the promise resolves
    engine.approve(pending[0]!.id);
    await promise;
  });

  it("approve resolves the promise returned by requestApproval", async () => {
    const eventBus = createEventBus();
    const engine = createDecisionEngine({ eventBus, logger: mockLogger });

    const promise = engine.requestApproval("agent-1", makeResponse("Do something"));
    const pending = engine.getPending();
    const decisionId = pending[0]!.id;

    engine.approve(decisionId, "go ahead");

    const resolved = await promise;
    expect(resolved.resolution).toBe("go ahead");
    expect(resolved.resolvedAt).toBeInstanceOf(Date);
    // Should no longer be in pending
    expect(engine.getPending()).toHaveLength(0);
  });

  it("reject rejects the promise", async () => {
    const eventBus = createEventBus();
    const engine = createDecisionEngine({ eventBus, logger: mockLogger });

    const promise = engine.requestApproval("agent-1", makeResponse("Dangerous action"));
    const pending = engine.getPending();
    const decisionId = pending[0]!.id;

    engine.reject(decisionId, "too risky");

    await expect(promise).rejects.toThrow(/rejected.*too risky/);
    expect(engine.getPending()).toHaveLength(0);
  });

  it("getPending returns pending decisions", async () => {
    const eventBus = createEventBus();
    const engine = createDecisionEngine({ eventBus, logger: mockLogger });

    const p1 = engine.requestApproval("agent-1", makeResponse("Action 1"));
    const p2 = engine.requestApproval("agent-2", makeResponse("Action 2"));

    expect(engine.getPending()).toHaveLength(2);

    // Clean up
    const ids = engine.getPending().map((d) => d.id);
    engine.approve(ids[0]!);
    engine.approve(ids[1]!);
    await Promise.all([p1, p2]);
  });

  it("getPendingByAgent filters correctly", async () => {
    const eventBus = createEventBus();
    const engine = createDecisionEngine({ eventBus, logger: mockLogger });

    const p1 = engine.requestApproval("agent-1", makeResponse("A"));
    const p2 = engine.requestApproval("agent-2", makeResponse("B"));
    const p3 = engine.requestApproval("agent-1", makeResponse("C"));

    const agent1Pending = engine.getPendingByAgent("agent-1");
    expect(agent1Pending).toHaveLength(2);
    expect(agent1Pending.every((d) => d.agentId === "agent-1")).toBe(true);

    const agent2Pending = engine.getPendingByAgent("agent-2");
    expect(agent2Pending).toHaveLength(1);

    // Clean up
    for (const d of engine.getPending()) {
      engine.approve(d.id);
    }
    await Promise.all([p1, p2, p3]);
  });

  it("emits decision:pending and decision:resolved events", async () => {
    const eventBus = createEventBus();
    const engine = createDecisionEngine({ eventBus, logger: mockLogger });

    const pendingHandler = vi.fn();
    const resolvedHandler = vi.fn();
    eventBus.on("decision:pending", pendingHandler);
    eventBus.on("decision:resolved", resolvedHandler);

    const promise = engine.requestApproval("agent-1", makeResponse("Test"));

    expect(pendingHandler).toHaveBeenCalledTimes(1);
    expect(pendingHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: "agent-1",
        description: "Test",
      }),
    );

    const decisionId = engine.getPending()[0]!.id;
    engine.approve(decisionId);

    expect(resolvedHandler).toHaveBeenCalledTimes(1);
    expect(resolvedHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        decisionId,
        agentId: "agent-1",
        approved: true,
      }),
    );

    await promise;
  });
});
