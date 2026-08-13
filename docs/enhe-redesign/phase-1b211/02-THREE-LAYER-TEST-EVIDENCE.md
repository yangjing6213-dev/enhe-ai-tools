# Three-Layer Test Evidence

## Core Heartbeat contract

`runtime-heartbeat-contract.test.mjs` uses a fake clock and an injected Writer. It covers the 720-second logical task, interval pulses, stop cleanup, idempotent stop, stale-run protection, delayed pulse protection, non-overlapping slow writes, pending-writer wait, Writer error reporting, one-shot writes, and side-effect-free Worker/Scheduler imports.

```text
CORE_CONTRACT_GREEN_STATUS=PASS
CORE_CONTRACT_FOCUSED_TESTS=10/10
CORE_CONTRACT_STRESS_RUNS=100
CORE_CONTRACT_STRESS_PASSED=100
```

## State Writer

The existing Phase 1B.2.10 five tests were retained. The second commit also retained the real production Writer path and its failure-recovery behavior.

```text
STATE_STORE_FOCUSED_TESTS=5/5
STATE_STORE_STRESS_RUNS=100
STATE_STORE_STRESS_PASSED=100
STATE_STORE_ENOENT_COUNT=0
STATE_STORE_TEMP_RESIDUE_COUNT=0
```

## Synthetic Engine protocol

`runtime-heartbeat-engine-fixture.mjs` is test-only. It uses `READY`, `HOLD`, `RELEASE`, and `ABORT` with explicit acknowledgements, no fixed port, no shared claim file, and waits for `close` after release/abort. The test cleans children in `afterEach`.

```text
ENGINE_PROTOCOL_STRESS_RUNS=50
ENGINE_PROTOCOL_STRESS_PASSED=50
```

The original Worker environment-secret assertion was restored in the Worker integration test. The deleted long-running process/socket fixture was intentionally not retained in that monolithic test; its lifecycle behavior is covered by the fake-clock seam contract.
