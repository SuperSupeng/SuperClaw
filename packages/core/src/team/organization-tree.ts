// ============================================================================
// Organization Tree — 团队组织结构树
// ============================================================================

import type { TeamConfig, AgentConfig } from "@superclaw/types";

/** 组织树接口 */
export interface OrganizationTree {
  getTeam(teamId: string): TeamConfig | undefined;
  getTeamByAgent(agentId: string): TeamConfig | undefined;
  getTeamLead(teamId: string): string | undefined;
  getTeamMembers(teamId: string): string[];
  getSubTeams(teamId: string): TeamConfig[];
  getParentTeam(teamId: string): TeamConfig | undefined;
  canDelegate(fromAgentId: string, toAgentId: string): boolean;
  getAllTeams(): TeamConfig[];
}

/**
 * 创建组织结构树
 */
export function createOrganizationTree(
  teams: TeamConfig[],
  agents: AgentConfig[],
): OrganizationTree {
  // 索引：teamId -> TeamConfig
  const teamMap = new Map<string, TeamConfig>();
  for (const team of teams) {
    teamMap.set(team.id, team);
  }

  // 索引：agentId -> AgentConfig
  const agentMap = new Map<string, AgentConfig>();
  for (const agent of agents) {
    agentMap.set(agent.id, agent);
  }

  // 索引：agentId -> TeamConfig（agent 所属的团队）
  const agentTeamMap = new Map<string, TeamConfig>();
  for (const team of teams) {
    // lead 也属于该团队
    if (team.lead) {
      agentTeamMap.set(team.lead, team);
    }
    for (const memberId of team.members) {
      agentTeamMap.set(memberId, team);
    }
  }

  // 索引：teamId -> 子团队列表
  const subTeamMap = new Map<string, TeamConfig[]>();
  for (const team of teams) {
    if (team.parentTeam) {
      let subs = subTeamMap.get(team.parentTeam);
      if (!subs) {
        subs = [];
        subTeamMap.set(team.parentTeam, subs);
      }
      subs.push(team);
    }
  }

  /** 检查 fromAgent 是否是 toAgent 所在团队或其祖先团队的 lead */
  function isLeadOf(fromAgentId: string, toAgentId: string): boolean {
    const toTeam = agentTeamMap.get(toAgentId);
    if (!toTeam) return false;

    // 直接是该团队的 lead
    if (toTeam.lead === fromAgentId) return true;

    // 递归检查上级团队
    let current: TeamConfig | undefined = toTeam;
    while (current?.parentTeam) {
      const parent = teamMap.get(current.parentTeam);
      if (!parent) break;
      if (parent.lead === fromAgentId) return true;
      current = parent;
    }

    return false;
  }

  return {
    getTeam(teamId: string): TeamConfig | undefined {
      return teamMap.get(teamId);
    },

    getTeamByAgent(agentId: string): TeamConfig | undefined {
      return agentTeamMap.get(agentId);
    },

    getTeamLead(teamId: string): string | undefined {
      return teamMap.get(teamId)?.lead;
    },

    getTeamMembers(teamId: string): string[] {
      const team = teamMap.get(teamId);
      if (!team) return [];
      return [...team.members];
    },

    getSubTeams(teamId: string): TeamConfig[] {
      return subTeamMap.get(teamId) ?? [];
    },

    getParentTeam(teamId: string): TeamConfig | undefined {
      const team = teamMap.get(teamId);
      if (!team?.parentTeam) return undefined;
      return teamMap.get(team.parentTeam);
    },

    canDelegate(fromAgentId: string, toAgentId: string): boolean {
      // 不能委托给自己
      if (fromAgentId === toAgentId) return false;

      // 1. from agent 的 delegation.allowAgents 包含 to agent
      const fromAgent = agentMap.get(fromAgentId);
      if (fromAgent?.delegation?.allowAgents.includes(toAgentId)) {
        return true;
      }

      // 2. from 是 to 所在团队的 lead
      // 3. from 是 to 所在团队的上级团队 lead
      if (isLeadOf(fromAgentId, toAgentId)) {
        return true;
      }

      return false;
    },

    getAllTeams(): TeamConfig[] {
      return [...teams];
    },
  };
}
