import { afterEach, describe, expect, it, vi } from "vitest";
import { createRuntimeHeartbeatLifecycle } from "./runtime-heartbeat-lifecycle.mjs";

function createFakeClock() {
  let now = 0;
  const timers = new Set();

  return {
    now: () => now,
    setInterval(callback, intervalMs) {
      const timer = { callback, intervalMs };
      timers.add(timer);
      return timer;
    },
    clearInterval(timer) {
      timers.delete(timer);
    },
    activeTimerCount() {
      return timers.size;
    },
    async advance(milliseconds) {
      now += milliseconds;
      for (const timer of [...timers]) await timer.callback();
    }
  };
}

function createWriter() {
  const writes = [];
  const writer = vi.fn(async (_path, _identity, payload) => {
    writes.push(payload);
  });
  return { writes, writer };
}

const identity = {
  releaseRef: "a".repeat(40),
  startedAt: "2026-08-13T00:00:00.000Z"
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("runtime heartbeat lifecycle contract", () => {
  it("keeps currentRunId alive through a fake 720-second task and pulses on interval", async () => {
    const clock = createFakeClock();
    const { writes, writer } = createWriter();
    const lifecycle = createRuntimeHeartbeatLifecycle({
      path: "heartbeat.json",
      identity,
      writer,
      clock,
      intervalMs: 30_000
    });
    const run = lifecycle.beginRun("run-720");

    await run.start();
    for (let pulse = 0; pulse < 24; pulse++) await clock.advance(30_000);

    expect(writer).toHaveBeenCalledTimes(25);
    expect(writes.every((payload) => payload.currentRunId === "run-720")).toBe(true);
    expect(clock.now()).toBe(720_000);
  });

  it("clears currentRunId only after stop and removes its timer", async () => {
    const clock = createFakeClock();
    const { writes, writer } = createWriter();
    const lifecycle = createRuntimeHeartbeatLifecycle({
      path: "heartbeat.json",
      identity,
      writer,
      clock,
      intervalMs: 30_000
    });
    const run = lifecycle.beginRun("run-a");

    await run.start();
    await run.stop();
    const writesAfterStop = writer.mock.calls.length;
    await clock.advance(30_000);

    expect(clock.activeTimerCount()).toBe(0);
    expect(writer).toHaveBeenCalledTimes(writesAfterStop);
    expect(writes.at(-1)).toMatchObject({ status: "ok", currentRunId: null });
  });

  it("makes stop idempotent", async () => {
    const clock = createFakeClock();
    const { writer } = createWriter();
    const lifecycle = createRuntimeHeartbeatLifecycle({
      path: "heartbeat.json",
      identity,
      writer,
      clock,
      intervalMs: 30_000
    });
    const run = lifecycle.beginRun("run-idempotent");

    await run.start();
    await Promise.all([run.stop(), run.stop(), run.stop()]);

    expect(writer).toHaveBeenCalledTimes(2);
  });

  it("does not let an old run stop clear a newer run", async () => {
    const clock = createFakeClock();
    const { writes, writer } = createWriter();
    const lifecycle = createRuntimeHeartbeatLifecycle({
      path: "heartbeat.json",
      identity,
      writer,
      clock,
      intervalMs: 30_000
    });
    const oldRun = lifecycle.beginRun("old-run");
    await oldRun.start();
    const newRun = lifecycle.beginRun("new-run");
    await newRun.start();

    await oldRun.stop();

    expect(writes.at(-1)).toMatchObject({ status: "ok", currentRunId: "new-run" });
    await newRun.stop();
  });

  it("does not let a delayed old pulse overwrite a newer run", async () => {
    const clock = createFakeClock();
    let releaseFirstPulse;
    const firstPulse = new Promise((resolve) => {
      releaseFirstPulse = resolve;
    });
    const writes = [];
    let callCount = 0;
    const writer = vi.fn(async (_path, _identity, payload) => {
      callCount++;
      if (callCount === 2) await firstPulse;
      writes.push(payload);
    });
    const lifecycle = createRuntimeHeartbeatLifecycle({
      path: "heartbeat.json",
      identity,
      writer,
      clock,
      intervalMs: 30_000
    });
    const oldRun = lifecycle.beginRun("old-run");
    await oldRun.start();
    const delayedPulse = oldRun.pulse();
    const newRun = lifecycle.beginRun("new-run");
    releaseFirstPulse();
    await delayedPulse;
    await newRun.start();

    expect(writes.at(-1)).toMatchObject({ status: "ok", currentRunId: "new-run" });
    await newRun.stop();
  });

  it("does not overlap slow pulse writes", async () => {
    const clock = createFakeClock();
    let releasePulse;
    const pendingPulse = new Promise((resolve) => {
      releasePulse = resolve;
    });
    let inFlight = 0;
    let maxInFlight = 0;
    let callCount = 0;
    const writer = vi.fn(async () => {
      callCount++;
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      if (callCount > 1) await pendingPulse;
      inFlight--;
    });
    const lifecycle = createRuntimeHeartbeatLifecycle({
      path: "heartbeat.json",
      identity,
      writer,
      clock,
      intervalMs: 30_000
    });
    const run = lifecycle.beginRun("slow-run");

    await run.start();
    const first = run.pulse();
    const second = run.pulse();
    await Promise.resolve();
    await Promise.resolve();
    expect(writer).toHaveBeenCalledTimes(2);
    expect(second).toBe(first);
    releasePulse();
    await first;
    await run.stop();

    expect(maxInFlight).toBe(1);
  });

  it("waits for a pending writer before stop resolves", async () => {
    const clock = createFakeClock();
    let releasePulse;
    const pendingPulse = new Promise((resolve) => {
      releasePulse = resolve;
    });
    let callCount = 0;
    const writer = vi.fn(async () => {
      callCount++;
      if (callCount > 1) await pendingPulse;
    });
    const lifecycle = createRuntimeHeartbeatLifecycle({
      path: "heartbeat.json",
      identity,
      writer,
      clock,
      intervalMs: 30_000
    });
    const run = lifecycle.beginRun("pending-run");

    await run.start();
    const pulse = run.pulse();
    let stopped = false;
    const stop = run.stop().then(() => {
      stopped = true;
    });
    await Promise.resolve();
    expect(stopped).toBe(false);
    releasePulse();
    await pulse;
    await stop;
    expect(stopped).toBe(true);
  });

  it("reports writer failures without an unhandled rejection", async () => {
    const clock = createFakeClock();
    const onError = vi.fn();
    let callCount = 0;
    const writer = vi.fn(async () => {
      callCount++;
      if (callCount === 2) throw new Error("WRITER_FAILURE");
    });
    const lifecycle = createRuntimeHeartbeatLifecycle({
      path: "heartbeat.json",
      identity,
      writer,
      clock,
      intervalMs: 30_000,
      onError
    });
    const run = lifecycle.beginRun("failure-run");

    await run.start();
    await clock.advance(30_000);

    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    await run.stop();
  });

  it("supports one-shot writes without starting a timer or main process", async () => {
    const clock = createFakeClock();
    const { writer } = createWriter();
    const lifecycle = createRuntimeHeartbeatLifecycle({
      path: "heartbeat.json",
      identity,
      writer,
      clock,
      intervalMs: 30_000
    });

    await lifecycle.write({ status: "blocked" });

    expect(writer).toHaveBeenCalledWith(
      "heartbeat.json",
      identity,
      expect.objectContaining({ status: "blocked" })
    );
    expect(clock.activeTimerCount()).toBe(0);
  });

  it("imports worker and scheduler without running main, timer, process, or socket code", async () => {
    const beforeSignals = process.listenerCount("SIGTERM");

    await import("./seo-audit-worker.mjs?contract");
    await import("./seo-audit-scheduler.mjs?contract");

    expect(process.listenerCount("SIGTERM")).toBe(beforeSignals);
  });
});
