// ============================================================================
// Decay — 记忆衰减（过期条目清理）
// ============================================================================

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseMemoryFile, serializeMemoryEntry } from "./memory-store.js";

/**
 * 扫描 MEMORY.md，移除过期条目，写回文件，返回移除数量
 */
export async function decayMemories(agentDir: string): Promise<number> {
  const filePath = join(agentDir, "MEMORY.md");

  let content: string;
  try {
    content = await readFile(filePath, "utf-8");
  } catch {
    console.warn(`[decay] MEMORY.md not found at ${filePath}, nothing to decay`);
    return 0;
  }

  const entries = parseMemoryFile(content);
  const now = new Date();

  const validEntries = entries.filter((entry) => {
    if (!entry.validUntil) return true;
    return new Date(entry.validUntil) >= now;
  });

  const removedCount = entries.length - validEntries.length;

  if (removedCount > 0) {
    const newContent = validEntries.map(serializeMemoryEntry).join("\n");
    await writeFile(filePath, newContent, "utf-8");
  }

  return removedCount;
}
