// ============================================================================
// Model — 模型配置
// ============================================================================
// 支持多 Provider + Fallback 链。Agent 调用模型时按 primary → fallbacks 顺序尝试。
// Provider 支持 OpenAI 兼容协议，覆盖绝大多数模型服务。
// ============================================================================

/** 模型 Provider API 协议类型 */
export type ModelApiType = "openai" | "anthropic" | "custom";

/** 模型 Provider 配置 */
export interface ProviderConfig {
  /** Provider 唯一标识 */
  id: string;
  /** API Base URL */
  baseUrl: string;
  /** API Key（支持环境变量引用，如 "${OPENAI_API_KEY}"） */
  apiKey: string;
  /** API 协议类型，默认 "openai" */
  api?: ModelApiType;
  /** 该 Provider 下可用的模型列表 */
  models: string[];
}

/** Agent 的模型配置 */
export interface ModelConfig {
  /** 主模型 ID（格式：providerId:modelName 或直接 modelName） */
  primary: string;
  /** Fallback 模型链，按顺序尝试 */
  fallbacks?: string[];
}

/** 模型调用参数 */
export interface ModelCallOptions {
  /** 温度 */
  temperature?: number;
  /** 最大输出 token 数 */
  maxTokens?: number;
  /** 系统提示（通常由 Boot Sequence 构建） */
  systemPrompt?: string;
  /** 工具定义 */
  tools?: ModelToolDefinition[];
  /** 是否流式输出 */
  stream?: boolean;
}

/** 模型工具定义（传给 LLM 的格式） */
export interface ModelToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema
}

/** 模型调用结果 */
export interface ModelCallResult {
  /** 文本输出 */
  text: string;
  /** 工具调用请求 */
  toolCalls?: ModelToolCall[];
  /** 使用的 token 数 */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** 实际使用的模型（可能是 fallback） */
  model: string;
  /** 实际使用的 Provider */
  provider: string;
}

/** 模型发起的工具调用 */
export interface ModelToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}
