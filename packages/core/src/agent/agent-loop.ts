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
} from "@superclaw-ai/types";
import type { Logger } from "pino";
import type { ModelRouter } from "../model/model-router.js";
import type { ToolRegistry } from "../tool/tool-registry.js";
import type { DelegationManager } from "../team/delegation.js";
import type { SignalBus } from "../signal/signal-bus.js";
import type { TeamContextStore } from "../memory/team-context.js";
import { runBootSequence } from "./boot-sequence.js";

/** Agent 运行时依赖 */
export interface AgentDeps {
  modelRouter: ModelRouter;
  toolRegistry: ToolRegistry;
  memoryManager: MemoryManager;
  eventBus: EventBus;
  logger: Logger;
  /** 可选的委托管理器（executive/coordinator 层级可用） */
  delegationManager?: DelegationManager;
  /** 可选的信号总线 */
  signalBus?: SignalBus;
  /** 可选的团队共享上下文 */
  teamContext?: TeamContextStore;
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
  const { modelRouter, toolRegistry, memoryManager, eventBus, logger, delegationManager, signalBus, teamContext } = deps;
  const log = logger.child({ agentId: config.id });

  // 是否为可委托层级（executive / coordinator）
  const canDelegateRole = config.tier === "executive" || config.tier === "coordinator";

  /** delegate_task 工具定义（仅 executive/coordinator 层级且有 delegationManager 时注入） */
  const delegateToolDef: ToolDefinition | null =
    canDelegateRole && delegationManager
      ? {
          name: "delegate_task",
          description:
            "Delegate a task to another agent. Provide the target agent ID, task description, and a context digest summarizing relevant background (do not outsource understanding).",
          parameters: {
            type: "object",
            properties: {
              to: {
                type: "string",
                description: "Target agent ID to delegate to",
              },
              task: {
                type: "string",
                description: "Task description for the target agent",
              },
              contextDigest: {
                type: "string",
                description:
                  "Context digest — a summary of relevant background so the target agent can work independently",
              },
            },
            required: ["to", "task", "contextDigest"],
          },
          source: "function" as const,
        }
      : null;

  /** check_signals 工具定义（所有 agent 可用，需 signalBus） */
  const checkSignalsToolDef: ToolDefinition | null = signalBus
    ? {
        name: "check_signals",
        description:
          "Check for pending signals (delegation requests, results, etc.)",
        parameters: {
          type: "object",
          properties: {},
          required: [],
        },
        source: "function" as const,
      }
    : null;

  /** complete_delegation 工具定义（所有 agent 可用，需 delegationManager） */
  const completeDelegationToolDef: ToolDefinition | null = delegationManager
    ? {
        name: "complete_delegation",
        description:
          "Mark a delegated task as completed with a result summary",
        parameters: {
          type: "object",
          properties: {
            taskId: {
              type: "string",
              description: "The delegation task ID",
            },
            result: {
              type: "string",
              description: "Result summary of the completed work",
            },
          },
          required: ["taskId", "result"],
        },
        source: "function" as const,
      }
    : null;

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
          { memoryManager, logger: log, signalBus },
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
        // 注入内置工具（delegate_task, check_signals, complete_delegation）
        const allToolDefs = [
          ...toolDefs,
          ...(delegateToolDef ? [delegateToolDef] : []),
          ...(checkSignalsToolDef ? [checkSignalsToolDef] : []),
          ...(completeDelegationToolDef ? [completeDelegationToolDef] : []),
        ];
        const modelToolDefs = toModelToolDefs(allToolDefs);

        // 构建动态上下文（pending signals + team activity）
        let dynamicContext = "";
        if (signalBus) {
          const pending = signalBus.getPending(config.id);
          if (pending.length > 0) {
            dynamicContext +=
              `\n\n## Pending Signals (${pending.length})\n\n` +
              pending
                .map(
                  (s) =>
                    `- [${s.type}] from ${s.from} (priority: ${s.priority}): ${JSON.stringify(s.payload)}`,
                )
                .join("\n") +
              "\n\nYou should process these signals. Use check_signals to consume them, then act accordingly. For delegation-request signals, perform the task and use complete_delegation to report results.\n";
          }
        }
        if (teamContext && config.team) {
          const recentTeamActivity = teamContext
            .getRecent(config.team, 5)
            .filter((e) => e.agentId !== config.id)
            .map(
              (e) =>
                `- ${e.agentName}: ${e.summary} (${e.timestamp.toISOString()})`,
            )
            .join("\n");
          if (recentTeamActivity) {
            dynamicContext += `\n\n## Recent Team Activity\n\n${recentTeamActivity}\n`;
          }
        }

        const effectiveSystemPrompt = dynamicContext
          ? systemPrompt + dynamicContext
          : systemPrompt;

        // 追加用户消息到历史
        appendHistory(message.senderId, {
          role: "user",
          content: message.content,
        });

        const callOptions: ModelCallOptions = {
          systemPrompt: effectiveSystemPrompt,
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
              // 特殊处理内置工具
              if (toolCall.name === "delegate_task" && delegationManager) {
                const args = toolCall.arguments as {
                  to: string;
                  task: string;
                  contextDigest: string;
                };
                const delegationTask = await delegationManager.delegate(
                  config.id,
                  args.to,
                  args.task,
                  args.contextDigest,
                );
                currentHistory.push({
                  role: "tool",
                  content: `Task delegated successfully. Task ID: ${delegationTask.id}, Status: ${delegationTask.status}`,
                  toolCallId: toolCall.id,
                });
              } else if (toolCall.name === "check_signals" && signalBus) {
                const consumed = signalBus.consume(config.id);
                const content =
                  consumed.length > 0
                    ? consumed
                        .map(
                          (s) =>
                            `[${s.type}] from ${s.from} (priority: ${s.priority}): ${JSON.stringify(s.payload)}`,
                        )
                        .join("\n\n")
                    : "No pending signals.";
                currentHistory.push({
                  role: "tool",
                  content,
                  toolCallId: toolCall.id,
                });
              } else if (toolCall.name === "complete_delegation" && delegationManager) {
                const args = toolCall.arguments as {
                  taskId: string;
                  result: string;
                };
                delegationManager.completeTask(args.taskId, args.result);
                currentHistory.push({
                  role: "tool",
                  content: `Delegation task ${args.taskId} marked as completed.`,
                  toolCallId: toolCall.id,
                });
              } else {
                const toolResult = await toolRegistry.execute(toolCall.name, toolCall.arguments);
                currentHistory.push({
                  role: "tool",
                  content: toolResult.success
                    ? toolResult.output
                    : `Error: ${toolResult.error || "Unknown error"}`,
                  toolCallId: toolCall.id,
                });
              }
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

        // 记录到团队共享上下文
        if (teamContext && config.team) {
          teamContext.append(config.team, {
            agentId: config.id,
            agentName: config.name,
            summary: `Handled message from ${message.senderId}: "${message.content.slice(0, 100)}..." → responded with: "${result!.text.slice(0, 200)}..."`,
            timestamp: new Date(),
          });
        }

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
