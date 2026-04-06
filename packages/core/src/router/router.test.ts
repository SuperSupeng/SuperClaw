import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRouter } from "./router.js";
import { createEventBus } from "../event-bus.js";
import type { IncomingMessage, OutgoingMessage, EventBus, AgentRuntime } from "@superclaw-ai/types";
import type { BindingTable } from "./binding-table.js";
import type { MessageQueue } from "./message-queue.js";
import type { AgentManager, RouterDeps } from "./router.js";
import type { Logger } from "pino";

function makeMessage(overrides: Partial<IncomingMessage> = {}): IncomingMessage {
  return {
    id: "msg-1",
    channelType: "discord",
    accountId: "bot-1",
    sourceType: "dm",
    senderId: "user-1",
    content: "hello",
    timestamp: new Date(),
    metadata: {},
    ...overrides,
  };
}

function makeMockLogger(): Logger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn().mockReturnThis(),
  } as unknown as Logger;
}

function makeDeps(overrides: Partial<RouterDeps> = {}): RouterDeps {
  const eventBus = createEventBus();

  const bindingTable: BindingTable = {
    resolve: vi.fn().mockReturnValue("agent-a"),
  };

  const messageQueue: MessageQueue = {
    enqueue: vi.fn(),
    dequeue: vi.fn().mockReturnValue(null),
    size: vi.fn().mockReturnValue(0),
  };

  const agentManager: AgentManager = {
    getAgent: vi.fn().mockReturnValue(undefined),
    getAllAgents: vi.fn().mockReturnValue([]),
  };

  return {
    bindingTable,
    messageQueue,
    agentManager,
    channelAdapters: new Map(),
    eventBus,
    logger: makeMockLogger(),
    ...overrides,
  };
}

describe("Router", () => {
  it("handleIncoming routes message to correct agent via binding table", async () => {
    const deps = makeDeps();
    const router = createRouter(deps);
    const msg = makeMessage();

    await router.handleIncoming(msg);

    expect(deps.bindingTable.resolve).toHaveBeenCalledWith("discord", "bot-1", msg);
    expect(deps.messageQueue.enqueue).toHaveBeenCalledWith("agent-a", msg);
  });

  it("emits message:received and message:routed events", async () => {
    const deps = makeDeps();
    const router = createRouter(deps);

    const receivedHandler = vi.fn();
    const routedHandler = vi.fn();
    deps.eventBus.on("message:received", receivedHandler);
    deps.eventBus.on("message:routed", routedHandler);

    const msg = makeMessage();
    await router.handleIncoming(msg);

    expect(receivedHandler).toHaveBeenCalledTimes(1);
    expect(receivedHandler).toHaveBeenCalledWith({ message: msg });

    expect(routedHandler).toHaveBeenCalledTimes(1);
    expect(routedHandler).toHaveBeenCalledWith({ message: msg, agentId: "agent-a" });
  });

  it("handles unmatched binding gracefully (no crash, no enqueue)", async () => {
    const bindingTable: BindingTable = {
      resolve: vi.fn().mockReturnValue(null),
    };
    const deps = makeDeps({ bindingTable });
    const router = createRouter(deps);

    const msg = makeMessage();

    // Should not throw
    await router.handleIncoming(msg);

    // Should NOT enqueue
    expect(deps.messageQueue.enqueue).not.toHaveBeenCalled();

    // Should log warning
    expect(deps.logger.warn).toHaveBeenCalled();
  });

  it("error in agent processing emits message:error", async () => {
    const eventBus = createEventBus();
    const agentError = new Error("agent exploded");

    const mockAgent: Partial<AgentRuntime> = {
      config: { id: "agent-a" } as AgentRuntime["config"],
      handleMessage: vi.fn().mockRejectedValue(agentError),
    };

    const agentManager: AgentManager = {
      getAgent: vi.fn().mockReturnValue(mockAgent),
      getAllAgents: vi.fn().mockReturnValue([mockAgent]),
    };

    const msg = makeMessage({ id: "msg-err" });

    // We need the message to actually be dequeued during the consume loop.
    // Set up the messageQueue so dequeue returns the message once, then null.
    let dequeued = false;
    const messageQueue: MessageQueue = {
      enqueue: vi.fn(),
      dequeue: vi.fn().mockImplementation((agentId: string) => {
        if (!dequeued && agentId === "agent-a") {
          dequeued = true;
          return msg;
        }
        return null;
      }),
      size: vi.fn().mockReturnValue(0),
    };

    const deps = makeDeps({ eventBus, agentManager, messageQueue });
    const router = createRouter(deps);

    const errorHandler = vi.fn();
    eventBus.on("message:error", errorHandler);

    // Start the consume loop
    router.start();

    // Wait for the consume loop interval (100ms) + async processing
    await vi.waitFor(() => {
      expect(errorHandler).toHaveBeenCalledTimes(1);
    }, { timeout: 500 });

    const errorPayload = errorHandler.mock.calls[0][0];
    expect(errorPayload.messageId).toBe("msg-err");
    expect(errorPayload.agentId).toBe("agent-a");
    expect(errorPayload.error).toBeInstanceOf(Error);
    expect(errorPayload.error.message).toBe("agent exploded");

    router.stop();
  });
});
