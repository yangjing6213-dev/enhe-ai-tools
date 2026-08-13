# Current Runtime Heartbeat Lifecycle

## Observed production flow

`runtime-heartbeat.mjs` exports `loadRuntimeHeartbeatIdentity` and `writeRuntimeHeartbeat`.

Worker flow:

1. Load config and identity.
2. Write an initial heartbeat with `currentRunId: null`.
3. Claim a job.
4. Write `currentRunId: job.id`.
5. Send prepare, crawl, report and upload heartbeats.
6. Run the engine with a periodic heartbeat timer.
7. Clear the timer after engine exit.
8. Write `currentRunId: null` after job processing.

Scheduler flow:

1. Enqueue a schedule request.
2. Write `status: "ok"`, or `status: "blocked"` on failure.
3. Sleep for the configured interval.

## Critical writer behavior

The production writer creates its temporary path as:

```text
<target-path>.<process.pid>.tmp
```

Concurrent writes to one target in one process therefore share one temporary pathname. The Phase 1B.2.9 probe launched 20 concurrent real writer calls against one target and observed 4 successes and 16 `ENOENT` failures.

This is a production writer concurrency defect, not a test-only architecture issue.
