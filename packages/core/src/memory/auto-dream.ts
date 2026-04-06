// ============================================================================
// AutoDream — 空闲时自动整理记忆（记忆沉淀 + 去重 + 降权）
// ============================================================================
// autoDream 机制：子 Agent 定期自动整理记忆。
//
// 规则：
// - 能从现有资料推导的 → 标记可移除
// - 有保质期的打 valid_until → 过期自动降权（由 decay 处理）
// - 事实（短命）vs 判断（长寿）→ 优先沉淀判断
// - 相似条目去重，相关事实合并为高层判断
// ============================================================================

import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Logger } from "pino";
import type {
  AgentConfig,
  EventBus,
  MemoryEntry,
  MemoryManager,
  ModelConfig,
} from "@superclaw-ai/types";
import type { ModelRouter } from "../model/model-router.js";
import { serializeMemoryEntry } from "./memory-store.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AutoDreamDeps {
  memoryManager: MemoryManager;
  modelRouter: ModelRouter;
  agentConfigs: AgentConfig[];
  eventBus: EventBus;
  logger: Logger;
  /** Consolidation interval in ms (default: 3_600_000 = 1 hour) */
  interval?: number;
  /** Model config used for consolidation calls */
  modelConfig?: ModelConfig;
}

export interface AutoDreamScheduler {
  start(): void;
  stop(): void;
}

/** Result of a single agent consolidation run */
interface ConsolidationResult {
  agentId: string;
  decayed: number;
  before: number;
  after: number;
  consolidated: boolean;
}

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

const CONSOLIDATION_SYSTEM_PROMPT = `You are a memory consolidation assistant for an AI agent.
Your job is to review existing memory entries and produce a cleaner, shorter set.

Rules:
1. DEDUPLICATE: Merge entries that say the same thing in different words.
2. MERGE RELATED FACTS: Combine multiple low-level facts into higher-level judgments when possible. Judgments are more valuable than facts — prefer keeping judgments.
3. MARK DERIVABLE: If an entry can be easily derived from code, docs, or other obvious sources, remove it entirely.
4. PRESERVE METADATA: Keep valid_until, category, and tags from the original entries. When merging, pick the longest valid_until and union the tags. Merged entries that represent judgments should have category "judgment".
5. PRESERVE IDs: Keep the original ID when an entry is unchanged. For merged entries, create a descriptive new ID.

Respond with ONLY a JSON array of objects, each with these fields:
- "id": string (section header)
- "content": string (the body text, may be multi-line)
- "validUntil": string | null (ISO date or null)
- "category": "fact" | "judgment" | null
- "tags": string[] (may be empty)

No markdown fences, no explanation — just the JSON array.`;

function buildConsolidationUserPrompt(entries: MemoryEntry[]): string {
  const formatted = entries
    .map((e, i) => {
      const meta: string[] = [];
      if (e.validUntil) meta.push(`valid_until: ${e.validUntil}`);
      if (e.category) meta.push(`category: ${e.category}`);
      if (e.tags?.length) meta.push(`tags: ${e.tags.join(", ")}`);
      const metaLine = meta.length ? `  [${meta.join(" | ")}]` : "";
      return `${i + 1}. ## ${e.id}${metaLine}\n   ${e.content}`;
    })
    .join("\n\n");

  return `Here are ${entries.length} memory entries to consolidate:\n\n${formatted}\n\nProduce the consolidated JSON array.`;
}

// ---------------------------------------------------------------------------
// Response parser
// ---------------------------------------------------------------------------

interface RawConsolidatedEntry {
  id: string;
  content: string;
  validUntil?: string | null;
  category?: "fact" | "judgment" | null;
  tags?: string[];
}

function parseConsolidationResponse(text: string): MemoryEntry[] | null {
  try {
    // Strip possible markdown fences
    const cleaned = text
      .replace(/^```(?:json)?\s*/m, "")
      .replace(/\s*```\s*$/m, "")
      .trim();

    const parsed: unknown = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return null;

    const now = new Date();
    return (parsed as RawConsolidatedEntry[])
      .filter((item) => item && typeof item.id === "string" && typeof item.content === "string")
      .map((item) => {
        const entry: MemoryEntry = {
          id: item.id,
          content: item.content,
          createdAt: now,
          updatedAt: now,
        };
        if (item.validUntil) entry.validUntil = item.validUntil;
        if (item.category === "fact" || item.category === "judgment") {
          entry.category = item.category;
        }
        if (Array.isArray(item.tags) && item.tags.length > 0) {
          entry.tags = item.tags.filter((t): t is string => typeof t === "string");
        }
        return entry;
      });
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Core consolidation logic
// ---------------------------------------------------------------------------

async function consolidateAgent(
  agentConfig: AgentConfig,
  deps: AutoDreamDeps,
  log: Logger,
): Promise<ConsolidationResult> {
  const { memoryManager, modelRouter } = deps;
  const agentDir = agentConfig.agentDir!;
  const agentId = agentConfig.id;

  // Step a: decay expired entries
  const decayed = await memoryManager.decay(agentDir);
  if (decayed > 0) {
    log.info({ agentId, decayed }, "decayed expired memory entries");
  }

  // Step b: load valid long-term entries
  const entries = await memoryManager.getValidEntries(agentDir, "long-term");
  const before = entries.length;

  // Step c: consolidate if count > 20
  if (entries.length <= 20) {
    log.debug({ agentId, entries: entries.length }, "entry count <= 20, skipping consolidation");
    return { agentId, decayed, before, after: before, consolidated: false };
  }

  log.info({ agentId, entries: entries.length }, "starting memory consolidation");

  const modelConfig: ModelConfig = deps.modelConfig ?? agentConfig.model;
  const result = await modelRouter.call(modelConfig, {
    systemPrompt: CONSOLIDATION_SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildConsolidationUserPrompt(entries) }],
    temperature: 0.2,
    maxTokens: 4096,
  });

  const consolidated = parseConsolidationResponse(result.text);
  if (!consolidated || consolidated.length === 0) {
    log.warn(
      { agentId, responseLength: result.text.length },
      "failed to parse consolidation response, skipping write-back",
    );
    return { agentId, decayed, before, after: before, consolidated: false };
  }

  // Step c (cont): write back consolidated MEMORY.md
  const newContent = consolidated.map(serializeMemoryEntry).join("\n");
  const filePath = join(agentDir, "MEMORY.md");
  await writeFile(filePath, newContent, "utf-8");

  log.info(
    { agentId, before, after: consolidated.length, reduced: before - consolidated.length },
    "memory consolidation complete",
  );

  return { agentId, decayed, before, after: consolidated.length, consolidated: true };
}

// ---------------------------------------------------------------------------
// Scheduler
// ---------------------------------------------------------------------------

const DEFAULT_INTERVAL = 3_600_000; // 1 hour
const ENTRY_THRESHOLD = 20;

export function createAutoDream(deps: AutoDreamDeps): AutoDreamScheduler {
  const log = deps.logger.child({ module: "auto-dream" });
  const interval = deps.interval ?? DEFAULT_INTERVAL;
  let timer: ReturnType<typeof setInterval> | null = null;

  async function tick(): Promise<void> {
    const agentsWithDir = deps.agentConfigs.filter((a) => a.agentDir);
    if (agentsWithDir.length === 0) {
      log.debug("no agents with agentDir configured, skipping autoDream tick");
      return;
    }

    for (const agentConfig of agentsWithDir) {
      try {
        const result = await consolidateAgent(agentConfig, deps, log);

        // Step d: emit event for tracking
        // NOTE: Add "memory:consolidated" to EventMap in @superclaw-ai/types for
        // full type safety. Using type assertion for forward compatibility.
        (deps.eventBus.emit as Function)("memory:consolidated", {
          agentId: result.agentId,
          decayed: result.decayed,
          entriesBefore: result.before,
          entriesAfter: result.after,
          consolidated: result.consolidated,
        });
      } catch (err) {
        log.error(
          { agentId: agentConfig.id, err },
          "autoDream consolidation failed for agent",
        );
      }
    }
  }

  return {
    start(): void {
      if (timer) {
        log.warn("autoDream already running, ignoring start()");
        return;
      }
      log.info(
        { interval, agents: deps.agentConfigs.length, threshold: ENTRY_THRESHOLD },
        "autoDream scheduler started",
      );
      // Run immediately on start, then on interval
      void tick();
      timer = setInterval(() => void tick(), interval);
    },

    stop(): void {
      if (timer) {
        clearInterval(timer);
        timer = null;
        log.info("autoDream scheduler stopped");
      }
    },
  };
}
