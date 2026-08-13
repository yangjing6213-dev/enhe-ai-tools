import { writeRuntimeHeartbeat } from "./runtime-heartbeat.mjs";

const defaultClock = {
  now: Date.now,
  setInterval,
  clearInterval
};

export function createRuntimeHeartbeatLifecycle({
  path,
  identity,
  writer = writeRuntimeHeartbeat,
  clock = defaultClock,
  intervalMs = 30_000,
  onError = () => {}
}) {
  let activeRun = null;
  let writeTail = Promise.resolve();

  function notifyError(error) {
    try {
      const result = onError(error);
      if (result && typeof result.catch === "function") result.catch(() => {});
    } catch {
      // Error reporting must not create a second unhandled rejection.
    }
  }

  function queueWrite(payload, shouldWrite) {
    const current = writeTail.then(async () => {
      if (!shouldWrite()) return;
      await writer(path, identity, payload);
    });
    writeTail = current.catch(() => undefined);
    return current;
  }

  function deactivateRun(run) {
    run.stopped = true;
    if (run.timer !== null) {
      clock.clearInterval(run.timer);
      run.timer = null;
    }
  }

  function beginRun(
    runId,
    { pulse: pulseWork = null, onPulseResult = null, onError: runOnError = notifyError } = {}
  ) {
    if (activeRun) deactivateRun(activeRun);

    const run = {
      runId,
      stopped: false,
      timer: null,
      startPromise: null,
      pulsePromise: null,
      stopPromise: null
    };
    activeRun = run;

    async function performPulse(includePulseWork) {
      const result = includePulseWork && pulseWork
        ? await pulseWork(runId)
        : undefined;
      await queueWrite(
        { status: "ok", currentRunId: runId },
        () => activeRun === run && !run.stopped
      );
      if (includePulseWork && onPulseResult && activeRun === run && !run.stopped) {
        await onPulseResult(result);
      }
      return result;
    }

    function pulse(includePulseWork = true) {
      if (run.stopped || activeRun !== run) return Promise.resolve(undefined);
      if (run.pulsePromise) return run.pulsePromise;
      run.pulsePromise = performPulse(includePulseWork)
        .catch((error) => {
          try {
            const result = runOnError(error);
            if (result && typeof result.catch === "function") result.catch(() => {});
          } catch {
            // Error reporting must not create a second unhandled rejection.
          }
          throw error;
        })
        .finally(() => {
          run.pulsePromise = null;
        });
      return run.pulsePromise;
    }

    async function start() {
      if (run.startPromise) return run.startPromise;
      run.startPromise = queueWrite(
        { status: "ok", currentRunId: runId },
        () => activeRun === run && !run.stopped
      ).then(() => {
        if (activeRun !== run || run.stopped) return;
        run.timer = clock.setInterval(() => pulse(true).catch(() => {}), intervalMs);
      });
      return run.startPromise;
    }

    async function stop() {
      if (run.stopPromise) return run.stopPromise;
      deactivateRun(run);
      run.stopPromise = (async () => {
        if (run.pulsePromise) await run.pulsePromise.catch(() => undefined);
        if (activeRun !== run) return;
        await queueWrite(
          { status: "ok", currentRunId: null },
          () => activeRun === run
        );
      })();
      return run.stopPromise;
    }

    return {
      runId,
      start,
      pulse: () => pulse(true),
      recordPulse: () => {
        if (run.stopped || activeRun !== run) return Promise.resolve(undefined);
        return queueWrite(
          { status: "ok", currentRunId: runId },
          () => activeRun === run && !run.stopped
        );
      },
      stop
    };
  }

  return {
    beginRun,
    write: (payload) => queueWrite(payload, () => true)
  };
}
