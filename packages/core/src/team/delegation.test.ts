import { describe, it, expect, vi, afterEach } from "vitest";
import type { AgentConfig, TeamConfig } from "@superclaw/types";
import { createDelegationManager } from "./delegation.js";
import { createOrganizationTree } from "./organization-tree.js";
import { createEventBus } from "../event-bus.js";
import { createSignalBus } from "../signal/signal-bus.js";
import type { AgentManager } from "../agent/agent-manager.js";

const mockLogger = {
  child: () => mockLogger,
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
} as any;

function baseAgent(id: string, overrides: Partial<AgentConfig> = {}): AgentConfig {
  return {
    id,
    name: id,
    soul: "SOUL.md",
    tier: "worker",
    lifecycle: "persistent",
    model: { primary: "openai:gpt-4" },
    ...overrides,
  };
}

function createMockAgentManager(allowedIds: string[]): AgentManager {
  return {
    bootAll: vi.fn(),
    shutdownAll: vi.fn(),
    getAgent: (id: string) => (allowedIds.includes(id) ? ({} as any) : undefined),
    getAllAgents: vi.fn(),
  };
}

/** Pending / in-progress tasks involving an agent (no getActiveTasks on DelegationManager). */
function countActiveTasksForAgent(
  dm: ReturnType<typeof createDelegationManager>,
  agentId: string,
): number {
  return dm.getTasksByAgent(agentId).filter((t) => t.status === "pending" || t.status === "in-progress")
    .length;
}

describe("DelegationManager", () => {
  const CEO = "ceo";
  const WORKER = "worker";
  const OUTSIDER = "outsider";

  let signalBus: ReturnType<typeof createSignalBus>;

  afterEach(() => {
    signalBus?.dispose();
  });

  function setupDelegation(extraAgents: AgentConfig[] = []) {
    const teams: TeamConfig[] = [
      {
        id: "team-main",
        name: "Main",
        lead: CEO,
        members: [WORKER],
      },
    ];
    const agents: AgentConfig[] = [
      baseAgent(CEO, { tier: "executive" }),
      baseAgent(WORKER),
      ...extraAgents,
    ];
    const organizationTree = createOrganizationTree(teams, agents);
    const eventBus = createEventBus();
    signalBus = createSignalBus(eventBus);
    const agentIds = agents.map((a) => a.id);
    const delegationManager = createDelegationManager({
      organizationTree,
      getAgentManager: () => createMockAgentManager(agentIds),
      signalBus,
      eventBus,
      logger: mockLogger,
    });
    return { delegationManager, eventBus };
  }

  it("should delegate from lead to team member", async () => {
    const { delegationManager, eventBus } = setupDelegation();
    const created = vi.fn();
    eventBus.on("delegation:created", created);

    const task = await delegationManager.delegate(
      CEO,
      WORKER,
      "Do the thing",
      "ctx-digest-1",
    );

    expect(created).toHaveBeenCalledOnce();
    expect(created).toHaveBeenCalledWith({
      taskId: task.id,
      from: CEO,
      to: WORKER,
    });

    const pending = signalBus.getPending(WORKER);
    const req = pending.find((s) => s.type === "delegation-request");
    expect(req).toBeDefined();
    expect(req!.from).toBe(CEO);
    expect(req!.to).toEqual([WORKER]);
    expect(req!.payload).toEqual({
      taskId: task.id,
      task: "Do the thing",
      contextDigest: "ctx-digest-1",
    });

    expect(delegationManager.getTask(task.id)?.status).toBe("pending");
  });

  it("should reject delegation to non-allowed agent", async () => {
    const { delegationManager } = setupDelegation([baseAgent(OUTSIDER)]);

    await expect(
      delegationManager.delegate(CEO, OUTSIDER, "task", "digest"),
    ).rejects.toThrow(/not allowed to delegate/);
  });

  it("should complete a delegation task", async () => {
    const { delegationManager, eventBus } = setupDelegation();
    const completed = vi.fn();
    eventBus.on("delegation:completed", completed);

    const task = await delegationManager.delegate(CEO, WORKER, "t", "d");
    delegationManager.completeTask(task.id, "done");

    expect(completed).toHaveBeenCalledOnce();
    expect(completed).toHaveBeenCalledWith({
      taskId: task.id,
      from: CEO,
      to: WORKER,
      result: "done",
    });

    expect(delegationManager.getTask(task.id)?.status).toBe("completed");

    const toRequester = signalBus.getPending(CEO).filter((s) => s.type === "delegation-result");
    expect(toRequester).toHaveLength(1);
    expect(toRequester[0]!.payload).toEqual({
      taskId: task.id,
      status: "completed",
      result: "done",
    });
  });

  it("should fail a delegation task", async () => {
    const { delegationManager, eventBus } = setupDelegation();
    const failed = vi.fn();
    eventBus.on("delegation:failed", failed);

    const task = await delegationManager.delegate(CEO, WORKER, "t", "d");
    delegationManager.failTask(task.id, "boom");

    expect(failed).toHaveBeenCalledOnce();
    expect(failed).toHaveBeenCalledWith({
      taskId: task.id,
      from: CEO,
      to: WORKER,
      error: "boom",
    });

    expect(delegationManager.getTask(task.id)?.status).toBe("failed");
  });

  it("should track active delegations per agent", async () => {
    const { delegationManager } = setupDelegation();

    await delegationManager.delegate(CEO, WORKER, "a", "d1");
    await delegationManager.delegate(CEO, WORKER, "b", "d2");
    await delegationManager.delegate(CEO, WORKER, "c", "d3");

    expect(countActiveTasksForAgent(delegationManager, CEO)).toBe(3);
    expect(countActiveTasksForAgent(delegationManager, WORKER)).toBe(3);

    const tasks = delegationManager.getTasksByAgent(CEO);
    const firstId = tasks[0]!.id;
    delegationManager.completeTask(firstId, "ok");

    expect(countActiveTasksForAgent(delegationManager, CEO)).toBe(2);
    expect(countActiveTasksForAgent(delegationManager, WORKER)).toBe(2);
  });
});
