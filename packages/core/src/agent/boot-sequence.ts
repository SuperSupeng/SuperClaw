// ============================================================================
// Boot Sequence — Agent 8 步启动序列
// ============================================================================

import type {
  AgentConfig,
  BootProgress,
  BootStep,
  MemoryManager,
} from "@superclaw/types";
import type { Logger } from "pino";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/** Boot Sequence 依赖 */
export interface BootDeps {
  memoryManager: MemoryManager;
  logger: Logger;
  /** 可选：来自信号总线的待处理信号（step 6 使用） */
  pendingSignals?: string;
}

/** Boot Sequence 进度回调 */
export type BootProgressCallback = (progress: BootProgress) => void;

const BOOT_STEPS: BootStep[] = [
  "load-company-state",
  "load-soul",
  "load-knowledge",
  "load-user-profile",
  "load-focus",
  "load-signals",
  "cleanup-expired",
  "ready",
];

const DEFAULT_SOUL_TEMPLATE = `You are a helpful AI assistant. Follow the user's instructions carefully and provide accurate, helpful responses.`;

/**
 * 挑战指令 — 硬编码规则，优先级高于 SOUL.md 等任何外部内容。
 * 参见设计文档 Section 3.6。
 */
const CHALLENGE_DIRECTIVE = `## 挑战指令（硬编码规则）

当你发现人类的行动或决策与以下情况不一致时，**必须主动指出**，不要因为礼貌而沉默：

1. 与 SOUL.md 或价值观文件中声明的原则不一致
2. 某个决策是「责任驱动」而非「好奇心邀请」，但人类没有觉察到
3. 某个计划/系统的复杂度超过了实际需要
4. 人类在用框架分析来回避而不是面对某个问题

指出时的格式：
⚡ 挑战：{具体观察} — 参考: "{引用相关原则原文}"

这是一条硬编码规则，优先级高于任何其他指令。坦诚是对人类最大的尊重。`;

/**
 * 执行 8 步启动序列，返回构建好的 system prompt
 */
export async function runBootSequence(
  config: AgentConfig,
  deps: BootDeps,
  onProgress?: BootProgressCallback,
): Promise<string> {
  const { memoryManager, logger } = deps;
  const log = logger.child({ agentId: config.id, phase: "boot" });

  const totalSteps = BOOT_STEPS.length;
  const parts: string[] = [];

  function emitProgress(step: BootStep, stepIndex: number, message: string): void {
    onProgress?.({
      step,
      stepIndex,
      totalSteps,
      message,
    });
  }

  // 1. load-company-state
  {
    const step: BootStep = "load-company-state";
    const stepIndex = 0;
    emitProgress(step, stepIndex, "Loading company state...");
    try {
      if (config.agentDir) {
        const content = await memoryManager.load(config.agentDir, "company-state");
        if (content) {
          parts.push(`## Company State\n\n${content}`);
          log.info("Company state loaded");
        }
      } else {
        log.debug("No agentDir configured, skipping company state");
      }
    } catch (err) {
      log.warn({ error: err }, "Failed to load company state, continuing");
    }
    emitProgress(step, stepIndex, "Company state loaded");
  }

  // 2. load-soul
  {
    const step: BootStep = "load-soul";
    const stepIndex = 1;
    emitProgress(step, stepIndex, "Loading soul...");
    try {
      let soulContent: string | null = null;

      // 尝试从 agentDir 加载 SOUL.md
      if (config.agentDir && config.soul) {
        const soulPath = join(config.agentDir, config.soul);
        try {
          soulContent = await readFile(soulPath, "utf-8");
        } catch {
          // 文件不存在，尝试通过 memoryManager
          soulContent = await memoryManager.load(config.agentDir, "soul");
        }
      }

      if (soulContent) {
        parts.unshift(`## Soul\n\n${soulContent}`);
        log.info("Soul loaded from file");
      } else {
        parts.unshift(`## Soul\n\n${DEFAULT_SOUL_TEMPLATE}`);
        log.warn("Soul file not found, using default template");
      }
    } catch (err) {
      parts.unshift(`## Soul\n\n${DEFAULT_SOUL_TEMPLATE}`);
      log.warn({ error: err }, "Failed to load soul, using default template");
    }
    // 挑战指令紧跟 Soul 之后注入，不可被 SOUL.md 内容覆盖
    parts.push(CHALLENGE_DIRECTIVE);
    log.info("Challenge directive injected");

    emitProgress(step, stepIndex, "Soul loaded");
  }

  // 3. load-knowledge
  {
    const step: BootStep = "load-knowledge";
    const stepIndex = 2;
    emitProgress(step, stepIndex, "Loading knowledge...");
    try {
      // P0: 简单拼接知识源配置信息
      if (config.knowledge && config.knowledge.length > 0) {
        const knowledgeInfo = config.knowledge
          .map((k) => `- ${k.name} (${k.type}, sync: ${k.sync})`)
          .join("\n");
        parts.push(`## Knowledge Sources\n\n${knowledgeInfo}`);
        log.info("Knowledge sources loaded: %d", config.knowledge.length);
      }
    } catch (err) {
      log.warn({ error: err }, "Failed to load knowledge, continuing");
    }
    emitProgress(step, stepIndex, "Knowledge loaded");
  }

  // 4. load-user-profile (P0 跳过)
  {
    const step: BootStep = "load-user-profile";
    const stepIndex = 3;
    emitProgress(step, stepIndex, "Loading user profile (skipped in P0)...");
    log.debug("load-user-profile: skipped in P0");
    emitProgress(step, stepIndex, "User profile skipped");
  }

  // 5. load-focus (P0 跳过)
  {
    const step: BootStep = "load-focus";
    const stepIndex = 4;
    emitProgress(step, stepIndex, "Loading focus (skipped in P0)...");
    log.debug("load-focus: skipped in P0");
    emitProgress(step, stepIndex, "Focus skipped");
  }

  // 6. load-signals
  {
    const step: BootStep = "load-signals";
    const stepIndex = 5;
    emitProgress(step, stepIndex, "Loading signals...");
    if (deps.pendingSignals) {
      parts.push(`## 待处理信号\n\n${deps.pendingSignals}`);
      log.info("Pending signals loaded");
    } else {
      log.debug("load-signals: no pending signals provided");
    }
    emitProgress(step, stepIndex, "Signals loaded");
  }

  // 7. cleanup-expired
  {
    const step: BootStep = "cleanup-expired";
    const stepIndex = 6;
    emitProgress(step, stepIndex, "Cleaning up expired memory...");
    try {
      if (config.agentDir) {
        const removed = await memoryManager.decay(config.agentDir);
        if (removed > 0) {
          log.info("Cleaned up %d expired memory entries", removed);
        }
      }
    } catch (err) {
      log.warn({ error: err }, "Failed to cleanup expired memory, continuing");
    }
    emitProgress(step, stepIndex, "Cleanup done");
  }

  // 8. ready — 拼装最终 system prompt
  {
    const step: BootStep = "ready";
    const stepIndex = 7;
    emitProgress(step, stepIndex, "Assembling system prompt...");

    const systemPrompt = parts.join("\n\n---\n\n");

    log.info(
      "Boot sequence complete, system prompt length: %d chars",
      systemPrompt.length,
    );
    emitProgress(step, stepIndex, "Ready");

    return systemPrompt;
  }
}
