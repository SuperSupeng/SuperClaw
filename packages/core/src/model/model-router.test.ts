import { describe, it, expect, vi } from "vitest";
import { createModelRouter, type ModelProvider, type ModelProviderFactory } from "./model-router";
import type { ModelCallResult, ProviderConfig } from "@superclaw/types";

const mockLogger = {
  child: () => mockLogger,
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
} as any;

function makeResult(overrides: Partial<ModelCallResult> = {}): ModelCallResult {
  return {
    text: "hello",
    model: "test-model",
    provider: "test-provider",
    ...overrides,
  };
}

function makeProvider(id: string, callFn: ModelProvider["call"]): ModelProvider {
  return { providerId: id, call: callFn };
}

describe("createModelRouter", () => {
  const providers: Record<string, ProviderConfig> = {
    openai: {
      id: "openai",
      baseUrl: "https://api.openai.com",
      apiKey: "sk-test",
      models: ["gpt-4"],
    },
    anthropic: {
      id: "anthropic",
      baseUrl: "https://api.anthropic.com",
      apiKey: "sk-ant",
      models: ["claude-3"],
    },
  };

  it("resolves to primary model provider", async () => {
    const primaryResult = makeResult({ text: "primary response", provider: "openai" });
    const factory: ModelProviderFactory = (config) =>
      makeProvider(config.id, vi.fn().mockResolvedValue(primaryResult));

    const router = createModelRouter(providers, factory, mockLogger);

    const result = await router.call(
      { primary: "openai:gpt-4" },
      { messages: [{ role: "user", content: "hi" }] },
    );

    expect(result).toBe(primaryResult);
    expect(result.text).toBe("primary response");
  });

  it("falls back to secondary when primary throws", async () => {
    const fallbackResult = makeResult({ text: "fallback response", provider: "anthropic" });

    const factory: ModelProviderFactory = (config) => {
      if (config.id === "openai") {
        return makeProvider(config.id, vi.fn().mockRejectedValue(new Error("rate limited")));
      }
      return makeProvider(config.id, vi.fn().mockResolvedValue(fallbackResult));
    };

    const router = createModelRouter(providers, factory, mockLogger);

    const result = await router.call(
      { primary: "openai:gpt-4", fallbacks: ["anthropic:claude-3"] },
      { messages: [{ role: "user", content: "hi" }] },
    );

    expect(result).toBe(fallbackResult);
    expect(result.text).toBe("fallback response");
  });

  it("throws when all providers fail", async () => {
    const factory: ModelProviderFactory = (config) =>
      makeProvider(config.id, vi.fn().mockRejectedValue(new Error(`${config.id} failed`)));

    const router = createModelRouter(providers, factory, mockLogger);

    await expect(
      router.call(
        { primary: "openai:gpt-4", fallbacks: ["anthropic:claude-3"] },
        { messages: [{ role: "user", content: "hi" }] },
      ),
    ).rejects.toThrow("MODEL_ALL_FALLBACKS_FAILED");
  });

  it("getProvider returns correct provider for model name (uses default provider when no prefix)", async () => {
    const result = makeResult({ text: "default provider", provider: "openai" });
    const callSpy = vi.fn().mockResolvedValue(result);

    const factory: ModelProviderFactory = (config) => makeProvider(config.id, callSpy);

    const router = createModelRouter(providers, factory, mockLogger);

    // When no provider prefix is given, the first provider (openai) is used as default
    const res = await router.call(
      { primary: "gpt-4" },
      { messages: [{ role: "user", content: "hi" }] },
    );

    expect(res).toBe(result);
    // The call was made with just the model name (no prefix)
    expect(callSpy).toHaveBeenCalledWith("gpt-4", [{ role: "user", content: "hi" }], expect.any(Object));
  });
});
