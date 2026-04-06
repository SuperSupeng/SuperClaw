// ============================================================================
// MemoryManager — 记忆管理器
// ============================================================================

import { readFile, appendFile } from "node:fs/promises";
import { join } from "node:path";
import type { MemoryManager, MemoryFileType, MemoryEntry } from "@superclaw-ai/types";
import { loadSoul } from "./soul-loader.js";
import { loadHeartbeat } from "./heartbeat-loader.js";
import { loadCompanyState } from "./company-state.js";
import { parseMemoryFile, serializeMemoryEntry } from "./memory-store.js";
import { decayMemories } from "./decay.js";

/** MemoryFileType → 文件名映射 */
const FILE_MAP: Record<MemoryFileType, string> = {
  soul: "SOUL.md",
  "company-state": "COMPANY-STATE.md",
  "long-term": "MEMORY.md",
  heartbeat: "HEARTBEAT.md",
};

/**
 * 创建记忆管理器实例
 */
export function createMemoryManager(): MemoryManager {
  return {
    async load(agentDir: string, type: MemoryFileType): Promise<string> {
      switch (type) {
        case "soul":
          return loadSoul(agentDir);
        case "heartbeat":
          return loadHeartbeat(agentDir);
        case "company-state":
          return loadCompanyState(agentDir);
        case "long-term": {
          const filePath = join(agentDir, FILE_MAP[type]);
          try {
            return await readFile(filePath, "utf-8");
          } catch {
            console.warn(`[memory-manager] MEMORY.md not found at ${filePath}`);
            return "";
          }
        }
        default:
          console.warn(`[memory-manager] Unknown memory type: ${type as string}`);
          return "";
      }
    },

    async write(agentDir: string, _type: MemoryFileType, entry: MemoryEntry): Promise<void> {
      const filePath = join(agentDir, "MEMORY.md");
      const serialized = "\n" + serializeMemoryEntry(entry);
      await appendFile(filePath, serialized, "utf-8");
    },

    async getValidEntries(agentDir: string, _type: MemoryFileType): Promise<MemoryEntry[]> {
      const filePath = join(agentDir, "MEMORY.md");

      let content: string;
      try {
        content = await readFile(filePath, "utf-8");
      } catch {
        console.warn(`[memory-manager] MEMORY.md not found at ${filePath}`);
        return [];
      }

      const entries = parseMemoryFile(content);
      const now = new Date();

      return entries.filter((entry) => {
        if (!entry.validUntil) return true;
        return new Date(entry.validUntil) >= now;
      });
    },

    async decay(agentDir: string): Promise<number> {
      return decayMemories(agentDir);
    },
  };
}
