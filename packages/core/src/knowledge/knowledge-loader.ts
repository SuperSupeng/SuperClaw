// ============================================================================
// KnowledgeLoader — 知识源统一加载器
// ============================================================================

import type { KnowledgeSourceConfig, KnowledgeChunk, KnowledgeProvider } from "@superclaw/types";
import { createLocalFilesProvider } from "./sources/local-files.js";

/** KnowledgeLoader 接口 */
export interface KnowledgeLoader {
  initialize(): Promise<void>;
  query(query: string, limit?: number): Promise<KnowledgeChunk[]>;
  dispose(): Promise<void>;
}

/**
 * 创建知识加载器，根据配置初始化多个知识源 Provider
 */
export function createKnowledgeLoader(sources: KnowledgeSourceConfig[]): KnowledgeLoader {
  const providers: KnowledgeProvider[] = [];

  return {
    async initialize(): Promise<void> {
      for (const source of sources) {
        if (source.type === "local-files") {
          const provider = createLocalFilesProvider();
          await provider.initialize(source);
          providers.push(provider);
        } else {
          console.warn(`[knowledge-loader] Unsupported knowledge source type: "${source.type}", skipping`);
        }
      }
    },

    async query(query: string, limit?: number): Promise<KnowledgeChunk[]> {
      const allChunks: KnowledgeChunk[] = [];

      for (const provider of providers) {
        const chunks = await provider.query(query, limit);
        allChunks.push(...chunks);
      }

      // Sort by score descending, return top N
      allChunks.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
      return allChunks.slice(0, limit ?? 10);
    },

    async dispose(): Promise<void> {
      for (const provider of providers) {
        await provider.dispose();
      }
      providers.length = 0;
    },
  };
}
