// ============================================================================
// Agent Loop — Agent 核心消息处理循环
// ============================================================================

import type {
  AgentConfig,
  AgentInstance,
  AgentRuntime,
  AgentStatus,
  BootProgress,
  EventBus,
  IncomingMessage,
  MemoryManager,
  ModelCallOptions,
  ModelCallResult,
  ModelToolCall,
  ModelToolDefinition,
  OutgoingMessage,
  ToolDefinition,
} from "@superclaw/types";
import type { Logger } from "pino";
import type { ModelRouter } from "../model/model-router.js";
import type { ToolRegistry } from "../tool/tool-registry.js";
import { runBootSequence } from "./boot-sequence.js";

/** Agent 运行时依赖 */
export interface AgentDeps {
  modelRouter: ModelRouter;
  toolRegistry: ToolRegistry;
  memoryManager: MemoryManager;
  eventBus: EventBus;
  logger: Logger;
}

/** 最大工具调用循环次数 */
const MAX_TOOL_LOOPS = 10;

/** 每个 sender 最大历史消息数 */
const MAX_HISTORY_PER_SENDER = 50;

/** 对话历史条目 */
interface HistoryEntry {
  role: "user" | "assistant" | "tool";
  content: string;
  toolCallId?: string;
  toolCalls?: Array<{ id: string; name: string; arguments: Record<string, unknown> }>;
}

/**
 * 创建 Agent 运行时
 */
export function createAgentRuntime(
  config: AgentConfig,
  deps: AgentDeps,
): AgentRuntime {
  const { modelRouter, toolRegistry, memoryManager, eventBus, logger } = deps;
  const log = logger.child({ agentId: config.id });

  // 对话历史，按 senderId 分隔
  const conversationHistory = new Map<string, HistoryEntry[]>();

  // 缓存的 system prompt（boot 后生成）
  let systemPrompt = "";

  // Agent 实例状态
  const instance: AgentInstance = {
    config,
    status: "booting" as AgentStatus,
    bootedAt: null,
    messageCount: 0,
    lastActiveAt: null,
  };

  function setStatus(status: AgentStatus): void {
    const previousStatus = instance.status;
    instance.status = status;
    eventBus.emit("agent:status", {
      agentId: config.id,
      status,
      previousStatus,
    });
  }

  function getHistory(senderId: string): HistoryEntry[] {
    let history = conversationHistory.get(senderId);
    if (!history) {
      history = [];
      conversationHistory.set(senderId, history);
    }
    return history;
  }

  function appendHistory(senderId: string, entry: HistoryEntry): void {
    const history = getHistory(senderId);
    history.push(entry);
    // 保留最近 MAX_HISTORY_PER_SENDER 条
    if (history.length > MAX_HISTORY_PER_SENDER) {
      history.splice(0, history.length - MAX_HISTORY_PER_SENDER);
    }
  }

  /** 将 ToolDefinition 转为 ModelToolDefinition */
  function toModelToolDefs(defs: ToolDefinition[]): ModelToolDefinition[] {
    return defs.map((d) => ({
      name: d.name,
      description: d.description,
      parameters: d.parameters,
    }));
  }

  const runtime: AgentRuntime = {
    get config() {
      return config;
    },

    get instance() {
      return instance;
    },

    async boot(onProgress?: (progress: BootProgress) => void): Promise<void> {
      setStatus("booting");
      try {
        systemPrompt = await runBootSequence(
          config,
          { memoryManager, logger: log },
          onProgress,
        );
        await toolRegistry.initialize();
        instance.bootedAt = new Date();
        setStatus("ready");
        eventBus.emit("agent:ready", { agentId: config.id });
        log.info("Agent boot complete");
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        instance.error = error.message;
        setStatus("error");
        eventBus.emit("agent:error", { agentId: config.id, error });
        throw err;
      }
    },

    async handleMessage(message: IncomingMessage): Promise<OutgoingMessage> {
      if (instance.status !== "ready" && instance.status !== "busy") {
        throw new Error(`Agent ${config.id} is not ready (status: ${instance.status})`);
      }

      setStatus("busy");
      instance.lastActiveAt = new Date();
      instance.messageCount++;

      eventBus.emit("message:processing", {
        messageId: message.id,
        agentId: config.id,
      });

      try {
        const toolDefs = toolRegistry.getToolDefinitions();
        const modelToolDefs = toModelToolDefs(toolDefs);

        // 追加用户消息到历史
        appendHistory(message.senderId, {
          role: "user",
          content: message.content,
        });

        const callOptions: ModelCallOptions = {
          systemPrompt,
          tools: modelToolDefs.length > 0 ? modelToolDefs : undefined,
          maxTokens: 4096,
          temperature: 0.7,
        };

        // 构建消息列表（历史 + 当前消息已追加到历史中，所以直接用历史）
        let currentHistory = [...getHistory(message.senderId)];
        let result: ModelCallResult;
        let loopCount = 0;

        // Agent loop: 调用模型 → 工具调用 → 再调用模型
        while (true) {
          result = await modelRouter.call(config.model, {
            ...callOptions,
            // 传递完整 messages 通过 metadata
            messages: currentHistory,
          } as ModelCallOptions & { messages: unknown });

          // 没有工具调用，退出循环
          if (!result.toolCalls || result.toolCalls.length === 0) {
            break;
          }

          loopCount++;
          if (loopCount > MAX_TOOL_LOOPS) {
            log.warn("Max tool call loops reached (%d), breaking", MAX_TOOL_LOOPS);
            break;
          }

          // 追加 assistant 的工具调用消息
          const assistantEntry: HistoryEntry = {
            role: "assistant",
            content: result.text || "",
            toolCalls: result.toolCalls!.map((tc: ModelToolCall) => ({
              id: tc.id,
              name: tc.name,
              arguments: tc.arguments,
            })),
          };
          currentHistory.push(assistantEntry);

          // 逐个执行工具
          for (const toolCall of result.toolCalls) {
            log.debug({ tool: toolCall.name, args: toolCall.arguments }, "Executing tool call");
            try {
              const toolResult = await toolRegistry.execute(toolCall.name, toolCall.arguments);
              currentHistory.push({
                role: "tool",
                content: toolResult.success
                  ? toolResult.output
                  : `Error: ${toolResult.error || "Unknown error"}`,
                toolCallId: toolCall.id,
              });
            } catch (err) {
              const errMsg = err instanceof Error ? err.message : String(err);
              log.error({ tool: toolCall.name, error: errMsg }, "Tool execution failed");
              currentHistory.push({
                role: "tool",
                content: `Error: ${errMsg}`,
                toolCallId: toolCall.id,
              });
            }
          }
        }

        // 追加 assistant 最终回复到持久化历史
        appendHistory(message.senderId, {
          role: "assistant",
          content: result!.text,
        });

        const response: OutgoingMessage = {
          content: result!.text,
          replyTo: message.id,
        };

        eventBus.emit("message:responded", {
          messageId: message.id,
          agentId: config.id,
          response,
        });

        setStatus("ready");
        return response;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setStatus("ready");
        eventBus.emit("message:error", {
          messageId: message.id,
          agentId: config.id,
          error,
        });
        throw err;
      }
    },

    async shutdown(): Promise<void> {
      log.info("Shutting down agent");
      setStatus("shutdown");
      await toolRegistry.dispose();
      conversationHistory.clear();
    },
  };

  return runtime;
}
