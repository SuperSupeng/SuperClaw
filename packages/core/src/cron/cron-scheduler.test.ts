import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createCronScheduler } from "./cron-scheduler.js";
import { createEventBus } from "../event-bus.js";
import type { CronConfig, CronJobConfig } from "@superclaw/types";

const mockLogger = {
  child: () => mockLogger,
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
} as any;

// Mock fs to avoid actual file operations
vi.mock("node:fs", () => ({
  readFileSync: vi.fn(() => {
    throw new Error("no file");
  }),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(() => true),
  mkdirSync: vi.fn(),
}));

describe("CronScheduler", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("start/stop without errors", () => {
    const eventBus = createEventBus();
    const config: CronConfig = { enabled: true, jobs: [] };
    const scheduler = createCronScheduler(config, { eventBus, logger: mockLogger });

    expect(() => scheduler.start()).not.toThrow();
    expect(() => scheduler.stop()).not.toThrow();
  });

  it("addJob/removeJob work correctly", () => {
    const eventBus = createEventBus();
    const config: CronConfig = { enabled: true, jobs: [] };
    const scheduler = createCronScheduler(config, { eventBus, logger: mockLogger });

    const job: CronJobConfig = {
      id: "job-1",
      schedule: "*/10",
      agent: "agent-1",
      message: "hello",
      enabled: true,
    };

    scheduler.addJob(job);
    expect(scheduler.getJobs()).toHaveLength(1);
    expect(scheduler.getJobs()[0]!.id).toBe("job-1");

    scheduler.removeJob("job-1");
    expect(scheduler.getJobs()).toHaveLength(0);
  });

  it("shouldFire: interval format */5 fires after 5 minutes", () => {
    const eventBus = createEventBus();
    const firedHandler = vi.fn();
    eventBus.on("cron:fired", firedHandler);

    // Set time to a known point
    vi.setSystemTime(new Date("2026-04-06T10:00:00Z"));

    const config: CronConfig = {
      enabled: true,
      jobs: [
        { id: "interval-job", schedule: "*/5", agent: "agent-1", message: "tick", enabled: true },
      ],
    };
    const scheduler = createCronScheduler(config, { eventBus, logger: mockLogger });

    scheduler.start();
    // start() calls tick() immediately — first run fires because no lastRun
    expect(firedHandler).toHaveBeenCalledTimes(1);

    // Advance 3 minutes — should NOT fire again
    vi.advanceTimersByTime(3 * 60_000);
    expect(firedHandler).toHaveBeenCalledTimes(1);

    // Advance another 2 minutes (total 5 min since last fire) — should fire
    vi.advanceTimersByTime(2 * 60_000);
    expect(firedHandler).toHaveBeenCalledTimes(2);

    scheduler.stop();
  });

  it("shouldFire: time format 09:00 fires at correct time", () => {
    const eventBus = createEventBus();
    const firedHandler = vi.fn();
    eventBus.on("cron:fired", firedHandler);

    // Use local time construction so getHours()/getMinutes() returns expected values
    const before = new Date(2026, 3, 6, 9, 58, 0); // local 09:58
    vi.setSystemTime(before);

    const config: CronConfig = {
      enabled: true,
      jobs: [
        { id: "time-job", schedule: "9:59", agent: "agent-1", message: "morning", enabled: true },
      ],
    };
    const scheduler = createCronScheduler(config, { eventBus, logger: mockLogger });

    scheduler.start();
    // At 09:58 it should not fire (schedule is 9:59)
    expect(firedHandler).toHaveBeenCalledTimes(0);

    // Advance 1 minute to 09:59
    vi.advanceTimersByTime(60_000);
    expect(firedHandler).toHaveBeenCalledTimes(1);
    expect(firedHandler).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: "time-job", agentId: "agent-1" }),
    );

    scheduler.stop();
  });

  it("emits cron:fired and message:received events when job fires", () => {
    const eventBus = createEventBus();
    const firedHandler = vi.fn();
    const messageHandler = vi.fn();
    eventBus.on("cron:fired", firedHandler);
    eventBus.on("message:received", messageHandler);

    vi.setSystemTime(new Date("2026-04-06T12:00:00Z"));

    const config: CronConfig = {
      enabled: true,
      jobs: [
        { id: "emit-job", schedule: "*/1", agent: "agent-x", message: "do work", enabled: true },
      ],
    };
    const scheduler = createCronScheduler(config, { eventBus, logger: mockLogger });

    scheduler.start();

    expect(firedHandler).toHaveBeenCalledTimes(1);
    expect(firedHandler).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: "emit-job", agentId: "agent-x" }),
    );

    expect(messageHandler).toHaveBeenCalledTimes(1);
    const msgPayload = messageHandler.mock.calls[0]![0];
    expect(msgPayload.message.content).toBe("do work");
    expect(msgPayload.message.sourceType).toBe("cron");
    expect(msgPayload.message.channelType).toBe("internal");

    scheduler.stop();
  });

  it("getJobs returns correct status", () => {
    const eventBus = createEventBus();
    vi.setSystemTime(new Date("2026-04-06T10:00:00Z"));

    const config: CronConfig = {
      enabled: true,
      jobs: [
        { id: "j1", schedule: "*/10", agent: "a1", message: "m1", enabled: true },
        { id: "j2", schedule: "14:00", agent: "a2", message: "m2", enabled: false },
      ],
    };
    const scheduler = createCronScheduler(config, { eventBus, logger: mockLogger });

    const jobs = scheduler.getJobs();
    expect(jobs).toHaveLength(2);

    const j1 = jobs.find((j) => j.id === "j1")!;
    expect(j1.schedule).toBe("*/10");
    expect(j1.agentId).toBe("a1");
    expect(j1.enabled).toBe(true);

    const j2 = jobs.find((j) => j.id === "j2")!;
    expect(j2.schedule).toBe("14:00");
    expect(j2.agentId).toBe("a2");
    expect(j2.enabled).toBe(false);
  });
});
