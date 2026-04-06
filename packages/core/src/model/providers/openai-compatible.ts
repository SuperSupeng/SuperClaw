// ============================================================================
// OpenAI Compatible Provider — 使用 Vercel AI SDK
// ============================================================================

import type {
  ModelCallOptions,
  ModelCallResult,
  ModelToolCall,
  ModelToolDefinition,
  ProviderConfig,
} from "@superclaw-ai/types";
import type { ModelProvider } from "../model-router.js";
import { generateText } from "ai";
import { jsonSchema } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

/** 解析环境变量引用（如 "${OPENAI_API_KEY}"） */
function resolveEnvVar(value: string): string {
  const match = value.match(/^\$\{(.+)\}$/);
  if (match?.[1]) {
    const envValue = process.env[match[1]];
    if (!envValue) {
      throw new Error(`Environment variable "${match[1]}" is not set`);
    }
    return envValue;
  }
  return value;
}

/**
 * 创建 OpenAI 兼容 Provider
 */
export function createOpenAICompatibleProvider(
  config: ProviderConfig,
): ModelProvider {
  const apiKey = resolveEnvVar(config.apiKey);

  const openai = createOpenAI({
    baseURL: config.baseUrl,
    apiKey,
  });

  return {
    get providerId() {
      return config.id;
    },

    async call(
      modelName: string,
      messages: unknown[],
      options: ModelCallOptions,
    ): Promise<ModelCallResult> {
      // 构建 Vercel AI SDK 的 messages 格式
      const aiMessages = buildAIMessages(messages as MessageEntry[], options.systemPrompt);

      // 构建工具定义
      const tools = options.tools ? buildToolDefs(options.tools) : undefined;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await generateText({
        model: openai(modelName),
        messages: aiMessages as any,
        ...(tools && Object.keys(tools).length > 0 ? { tools } : {}),
        ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
        ...(options.maxTokens !== undefined ? { maxTokens: options.maxTokens } : {}),
      });

      // 提取工具调用
      const toolCalls: ModelToolCall[] = [];
      if (result.toolCalls && result.toolCalls.length > 0) {
        for (const tc of result.toolCalls) {
          toolCalls.push({
            id: tc.toolCallId,
            name: tc.toolName,
            arguments: tc.args as Record<string, unknown>,
          });
        }
      }

      return {
        text: result.text ?? "",
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        usage: result.usage
          ? {
              promptTokens: result.usage.promptTokens,
              completionTokens: result.usage.completionTokens,
              totalTokens: result.usage.promptTokens + result.usage.completionTokens,
            }
          : undefined,
        model: modelName,
        provider: config.id,
      };
    },
  };
}

/** 历史消息条目 */
interface MessageEntry {
  role: "user" | "assistant" | "tool" | "system";
  content: string;
  toolCallId?: string;
  toolCalls?: Array<{ id: string; name: string; arguments: Record<string, unknown> }>;
}

/** 构建 Vercel AI SDK messages */
function buildAIMessages(
  messages: MessageEntry[],
  systemPrompt?: string,
): Array<{
  role: "system" | "user" | "assistant" | "tool";
  content: string | Array<unknown>;
  toolInvocations?: unknown;
}> {
  const aiMessages: Array<Record<string, unknown>> = [];

  // 添加 system prompt
  if (systemPrompt) {
    aiMessages.push({
      role: "system",
      content: systemPrompt,
    });
  }

  for (const msg of messages) {
    if (msg.role === "tool") {
      // Tool result message
      aiMessages.push({
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: msg.toolCallId,
            result: msg.content,
          },
        ],
      });
    } else if (msg.role === "assistant" && msg.toolCalls && msg.toolCalls.length > 0) {
      // Assistant message with tool calls
      const parts: unknown[] = [];
      if (msg.content) {
        parts.push({ type: "text", text: msg.content });
      }
      for (const tc of msg.toolCalls) {
        parts.push({
          type: "tool-call",
          toolCallId: tc.id,
          toolName: tc.name,
          args: tc.arguments,
        });
      }
      aiMessages.push({
        role: "assistant",
        content: parts,
      });
    } else {
      aiMessages.push({
        role: msg.role,
        content: msg.content,
      });
    }
  }

  return aiMessages as Array<{
    role: "system" | "user" | "assistant" | "tool";
    content: string | Array<unknown>;
  }>;
}

/** 将 ModelToolDefinition 转为 Vercel AI SDK 的 tools 格式 */
function buildToolDefs(
  tools: ModelToolDefinition[],
): Record<string, { description: string; parameters: ReturnType<typeof jsonSchema> }> {
  const result: Record<string, { description: string; parameters: ReturnType<typeof jsonSchema> }> = {};

  for (const tool of tools) {
    result[tool.name] = {
      description: tool.description,
      parameters: jsonSchema(tool.parameters),
    };
  }

  return result;
}
