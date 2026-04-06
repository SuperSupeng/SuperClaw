// ============================================================================
// Model Router — 模型路由 + Fallback 链
// ============================================================================

import type {
  ModelCallOptions,
  ModelCallResult,
  ModelConfig,
  ProviderConfig,
} from "@superclaw-ai/types";
import { ErrorCodes } from "@superclaw-ai/types";
import type { Logger } from "pino";

/** 模型 Provider 实例接口 */
export interface ModelProvider {
  readonly providerId: string;
  call(
    modelName: string,
    messages: unknown[],
    options: ModelCallOptions,
  ): Promise<ModelCallResult>;
}

/** Model Provider 工厂 */
export type ModelProviderFactory = (config: ProviderConfig) => ModelProvider;

/** Model Router 接口 */
export interface ModelRouter {
  call(
    modelConfig: ModelConfig,
    options: ModelCallOptions & { messages?: unknown },
  ): Promise<ModelCallResult>;
}

/** 解析模型 ID，返回 [providerId, modelName] */
function parseModelId(
  modelId: string,
  defaultProviderId: string | undefined,
): [string, string] {
  const colonIndex = modelId.indexOf(":");
  if (colonIndex > 0) {
    return [modelId.slice(0, colonIndex), modelId.slice(colonIndex + 1)];
  }
  if (defaultProviderId) {
    return [defaultProviderId, modelId];
  }
  throw new Error(
    `Cannot resolve model "${modelId}": no provider prefix and no default provider`,
  );
}

/**
 * 创建 Model Router
 */
export function createModelRouter(
  providers: Record<string, ProviderConfig>,
  providerFactory: ModelProviderFactory,
  logger: Logger,
): ModelRouter {
  const log = logger.child({ module: "model-router" });

  // 实例化所有 provider
  const providerInstances = new Map<string, ModelProvider>();
  const providerIds = Object.keys(providers);
  const defaultProviderId = providerIds[0];

  for (const [id, config] of Object.entries(providers)) {
    providerInstances.set(id, providerFactory(config));
  }

  async function callModel(
    modelId: string,
    messages: unknown[],
    options: ModelCallOptions,
  ): Promise<ModelCallResult> {
    const [providerId, modelName] = parseModelId(modelId, defaultProviderId);
    const provider = providerInstances.get(providerId);

    if (!provider) {
      throw new Error(
        `${ErrorCodes.MODEL_PROVIDER_NOT_FOUND}: Provider "${providerId}" not found`,
      );
    }

    return provider.call(modelName, messages, options);
  }

  return {
    async call(
      modelConfig: ModelConfig,
      options: ModelCallOptions & { messages?: unknown },
    ): Promise<ModelCallResult> {
      const messages = (options.messages ?? []) as unknown[];
      const callOpts: ModelCallOptions = { ...options };
      // 去掉 messages 避免传入 provider
      delete (callOpts as Record<string, unknown>)["messages"];

      // 尝试 primary
      const modelsToTry = [modelConfig.primary, ...(modelConfig.fallbacks ?? [])];
      const errors: Error[] = [];

      for (const modelId of modelsToTry) {
        try {
          log.debug({ modelId }, "Attempting model call");
          const result = await callModel(modelId, messages, callOpts);
          return result;
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          log.warn({ modelId, error: error.message }, "Model call failed, trying fallback");
          errors.push(error);
        }
      }

      // 所有都失败了
      const errMsg = errors.map((e) => e.message).join("; ");
      throw new Error(
        `${ErrorCodes.MODEL_ALL_FALLBACKS_FAILED}: All models failed. Errors: ${errMsg}`,
      );
    },
  };
}
