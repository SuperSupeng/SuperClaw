import { describe, it, expect } from "vitest";
import { createOrganizationTree } from "./organization-tree.js";
import type { AgentConfig, TeamConfig } from "@superclaw-ai/types";

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

describe("OrganizationTree", () => {
  it("should allow lead to delegate to team members", () => {
    const teams: TeamConfig[] = [
      {
        id: "team-main",
        name: "Main",
        lead: "lead",
        members: ["member"],
      },
    ];
    const agents: AgentConfig[] = [
      baseAgent("lead", { tier: "executive" }),
      baseAgent("member"),
    ];
    const tree = createOrganizationTree(teams, agents);

    expect(tree.canDelegate("lead", "member")).toBe(true);
  });

  it("should deny delegation between unrelated agents", () => {
    const teams: TeamConfig[] = [
      { id: "team-a", name: "A", lead: "lead-a", members: ["worker-a"] },
      { id: "team-b", name: "B", lead: "lead-b", members: ["worker-b"] },
    ];
    const agents: AgentConfig[] = [
      baseAgent("lead-a", { tier: "coordinator" }),
      baseAgent("lead-b", { tier: "coordinator" }),
      baseAgent("worker-a"),
      baseAgent("worker-b"),
    ];
    const tree = createOrganizationTree(teams, agents);

    expect(tree.canDelegate("worker-a", "worker-b")).toBe(false);
    expect(tree.canDelegate("lead-a", "worker-b")).toBe(false);
  });

  it("should allow cross-team delegation for parent leads", () => {
    const teams: TeamConfig[] = [
      {
        id: "parent",
        name: "Parent",
        lead: "parent-lead",
        members: [],
      },
      {
        id: "child",
        name: "Child",
        lead: "child-lead",
        members: ["worker"],
        parentTeam: "parent",
      },
    ];
    const agents: AgentConfig[] = [
      baseAgent("parent-lead", { tier: "executive" }),
      baseAgent("child-lead", { tier: "coordinator" }),
      baseAgent("worker"),
    ];
    const tree = createOrganizationTree(teams, agents);

    expect(tree.canDelegate("parent-lead", "worker")).toBe(true);
  });
});
