import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCLIAdapter } from "./adapter.js";

vi.mock("node:readline", () => ({
  createInterface: vi.fn(() => ({
    question: vi.fn(),
    close: vi.fn(),
    on: vi.fn(),
  })),
}));

function makeLogger() {
  const logger: any = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(),
  };
  logger.child.mockReturnValue(logger);
  return logger;
}

const config = {
  type: "cli",
  enabled: true,
  accounts: { default: { id: "default" } },
} as any;

describe("createCLIAdapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('has channelType "cli"', () => {
    const adapter = createCLIAdapter(config, makeLogger());
    expect(adapter.channelType).toBe("cli");
  });

  it("getConnectedAccounts returns empty before connect", () => {
    const adapter = createCLIAdapter(config, makeLogger());
    expect(adapter.getConnectedAccounts()).toEqual([]);
  });

  it("onMessage registers a handler without error", () => {
    const adapter = createCLIAdapter(config, makeLogger());
    const handler = vi.fn();
    expect(() => adapter.onMessage(handler)).not.toThrow();
  });

  it('getConnectedAccounts returns ["default"] after connect', async () => {
    const adapter = createCLIAdapter(config, makeLogger());
    await adapter.connect();
    expect(adapter.getConnectedAccounts()).toEqual(["default"]);
  });

  it("uses the first account key from config", async () => {
    const customConfig = {
      type: "cli",
      enabled: true,
      accounts: { mybot: { id: "mybot" } },
    } as any;
    const adapter = createCLIAdapter(customConfig, makeLogger());
    await adapter.connect();
    expect(adapter.getConnectedAccounts()).toEqual(["mybot"]);
  });

  it("sendMessage outputs content to console.log", async () => {
    const adapter = createCLIAdapter(config, makeLogger());
    await adapter.connect();

    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    await adapter.sendMessage("default", {} as any, { content: "Hello!" } as any);

    expect(spy).toHaveBeenCalledWith(expect.stringContaining("Hello!"));
    spy.mockRestore();
  });

  it("sendMessage outputs nextActions to console.log", async () => {
    const adapter = createCLIAdapter(config, makeLogger());
    await adapter.connect();

    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    await adapter.sendMessage("default", {} as any, {
      content: "Pick one:",
      nextActions: [{ action: "yes", label: "Yes" }],
    } as any);

    expect(spy).toHaveBeenCalledWith(expect.stringContaining("Pick one:"));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("[yes] Yes"));
    spy.mockRestore();
  });

  it("disconnect sets getConnectedAccounts to empty", async () => {
    const adapter = createCLIAdapter(config, makeLogger());
    await adapter.connect();
    expect(adapter.getConnectedAccounts()).toEqual(["default"]);

    await adapter.disconnect();
    expect(adapter.getConnectedAccounts()).toEqual([]);
  });

  it("disconnect is safe to call without connect", async () => {
    const adapter = createCLIAdapter(config, makeLogger());
    await expect(adapter.disconnect()).resolves.toBeUndefined();
  });
});
