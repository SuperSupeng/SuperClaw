import type { SuperClawConfig } from "@superclaw-ai/types";
import type { IncomingMessage } from "@superclaw-ai/types";
import type { Logger } from "pino";
import { vi } from "vitest";

/**
 * Create a minimal valid SuperClawConfig for testing
 */
export function createMinimalConfig(
  overrides?: Partial<SuperClawConfig>,
): SuperClawConfig {
  return {
    version: "1.0",
    providers: {
      openai: {
        id: "openai",
        baseUrl: "https://api.openai.com/v1",
        apiKey: "sk-test",
        models: ["gpt-4"],
      },
    },
    agents: [
      {
        id: "agent-1",
        name: "Test Agent",
        soul: "You are a test agent.",
        tier: "worker",
        lifecycle: "persistent",
        model: { primary: "gpt-4" },
      },
    ],
    channels: {
      cli: {
        type: "cli",
        enabled: true,
        accounts: {
          default: { id: "default" },
        },
      },
    },
    bindings: [
      {
        channel: "cli",
        account: "default",
        agent: "agent-1",
      },
    ],
    ...overrides,
  } as SuperClawConfig;
}

/**
 * Create a mock IncomingMessage for testing
 */
export function createMockMessage(
  overrides?: Partial<IncomingMessage>,
): IncomingMessage {
  return {
    id: "msg-1",
    channelType: "cli",
    accountId: "default",
    sourceType: "dm",
    senderId: "user-1",
    senderName: "Test User",
    content: "Hello",
    timestamp: new Date("2026-01-01T00:00:00Z"),
    metadata: {},
    ...overrides,
  };
}

/**
 * Create a mock Logger for testing
 */
export function createMockLogger(): Logger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn().mockReturnThis(),
    level: "info",
  } as unknown as Logger;
}
