# TDD and Seam Evidence

The required RED-first order was followed before the production seam existed.

```text
TDD_RED_RUNS=3
TDD_RED_FAILED=3
TDD_RED_FAILURE=ERR_MODULE_NOT_FOUND_for_runtime-heartbeat-lifecycle.mjs
TDD_RED_FAILURE_CLASS=missing-production-seam
TDD_RED_SYNTAX_OR_MOCK_FAILURE=NO
```

The production seam is `createRuntimeHeartbeatLifecycle` in `deploy/enhe-ai-tools/scripts/runtime-heartbeat-lifecycle.mjs`. It injects the clock, timer functions, and Writer; accepts an explicit run id; has idempotent stop; serializes writes; prevents overlapping pulses; clears timers; waits for an in-flight pulse before final cleanup; and guards stale runs from clearing or overwriting newer runs.

Worker and Scheduler use the seam. Their direct-execution guards preserve CLI execution while allowing side-effect-free imports for the contract test. The seam itself has no top-level environment read, timer creation, child process, socket, or database operation.

The implementation was reviewed for the minimal requested surface. The production Writer fix from Phase 1B.2.10 was reused rather than copied or rewritten.
