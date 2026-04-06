// ============================================================================
// Team Context — 团队共享对话上下文
// ============================================================================

/** 团队上下文条目 */
export interface TeamContextEntry {
  agentId: string;
  agentName: string;
  summary: string;
  timestamp: Date;
}

/** 团队上下文存储接口 */
export interface TeamContextStore {
  append(teamId: string, entry: TeamContextEntry): void;
  getRecent(teamId: string, limit?: number): TeamContextEntry[];
  clear(teamId: string): void;
}

const MAX_ENTRIES_PER_TEAM = 50;

/**
 * 创建团队上下文存储（内存实现）
 */
export function createTeamContextStore(): TeamContextStore {
  const store = new Map<string, TeamContextEntry[]>();

  return {
    append(teamId, entry) {
      let entries = store.get(teamId);
      if (!entries) {
        entries = [];
        store.set(teamId, entries);
      }
      entries.push(entry);
      if (entries.length > MAX_ENTRIES_PER_TEAM) {
        entries.splice(0, entries.length - MAX_ENTRIES_PER_TEAM);
      }
    },

    getRecent(teamId, limit = 10) {
      const entries = store.get(teamId);
      if (!entries) return [];
      return entries.slice(-limit);
    },

    clear(teamId) {
      store.delete(teamId);
    },
  };
}
