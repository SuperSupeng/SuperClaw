// ============================================================================
// LocalFilesProvider — 本地文件知识源
// ============================================================================

import { readFile, readdir } from "node:fs/promises";
import { join, extname } from "node:path";
import { randomUUID } from "node:crypto";
import type { KnowledgeProvider, KnowledgeSourceConfig, KnowledgeChunk } from "@superclaw-ai/types";

interface FileEntry {
  path: string;
  content: string;
}

/**
 * 创建本地文件知识源 Provider
 */
export function createLocalFilesProvider(): KnowledgeProvider {
  let files: FileEntry[] = [];
  let config: KnowledgeSourceConfig | null = null;

  function getPath(): string {
    return (config?.config?.path as string) ?? "";
  }

  function getExtensions(): string[] {
    const exts = config?.config?.extensions as string[] | undefined;
    return exts ?? [".md", ".txt"];
  }

  async function scanFiles(): Promise<FileEntry[]> {
    const dirPath = getPath();
    const extensions = getExtensions();
    const result: FileEntry[] = [];

    try {
      const entries = await readdir(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile()) continue;
        const ext = extname(entry.name).toLowerCase();
        if (!extensions.includes(ext)) continue;

        const filePath = join(dirPath, entry.name);
        try {
          const content = await readFile(filePath, "utf-8");
          result.push({ path: filePath, content });
        } catch {
          console.warn(`[local-files] Failed to read file: ${filePath}`);
        }
      }
    } catch {
      console.warn(`[local-files] Failed to scan directory: ${dirPath}`);
    }

    return result;
  }

  const provider: KnowledgeProvider = {
    get sourceType() {
      return "local-files";
    },

    async initialize(cfg: KnowledgeSourceConfig): Promise<void> {
      config = cfg;
      files = await scanFiles();
    },

    async query(query: string, limit?: number): Promise<KnowledgeChunk[]> {
      const keywords = query
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);

      if (keywords.length === 0) return [];

      const scored: { file: FileEntry; score: number }[] = [];

      for (const file of files) {
        const lower = file.content.toLowerCase();
        let matchCount = 0;
        for (const kw of keywords) {
          if (lower.includes(kw)) {
            matchCount++;
          }
        }
        if (matchCount > 0) {
          scored.push({ file, score: matchCount / keywords.length });
        }
      }

      scored.sort((a, b) => b.score - a.score);

      const topN = limit ?? 5;
      return scored.slice(0, topN).map(({ file, score }) => ({
        id: randomUUID(),
        content: file.content,
        source: file.path,
        score,
      }));
    },

    async sync(): Promise<{ added: number; updated: number; removed: number }> {
      const oldCount = files.length;
      const oldPaths = new Set(files.map((f) => f.path));
      files = await scanFiles();
      const newPaths = new Set(files.map((f) => f.path));

      let added = 0;
      let removed = 0;
      for (const p of newPaths) {
        if (!oldPaths.has(p)) added++;
      }
      for (const p of oldPaths) {
        if (!newPaths.has(p)) removed++;
      }
      // Rough estimate: updated = files that existed before and still exist
      const updated = Math.max(0, files.length - added - (oldCount - removed - added));

      return { added, updated: 0, removed };
    },

    async dispose(): Promise<void> {
      files = [];
      config = null;
    },
  };

  return provider;
}
