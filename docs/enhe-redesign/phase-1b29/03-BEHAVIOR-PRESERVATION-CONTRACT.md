# Behavior Preservation Contract

The pre-change characterization command passed:

```text
npm test -- deploy/enhe-ai-tools/scripts/runtime-heartbeat.test.mjs
```

Observed result: 1 test file, 6 tests passed. This is characterization evidence only; it does not validate the unimplemented seam.

The following behavior must remain unchanged when a future seam phase is authorized:

- release identity validation and output shape;
- heartbeat JSON fields and status values;
- `currentRunId` set to the claimed job ID during processing;
- `currentRunId` cleared after processing;
- Worker and Scheduler environment variable names;
- default heartbeat paths and interval bounds;
- CLI direct-execution behavior and exit codes;
- signal handling;
- engine startup, claim and external HTTP protocols;
- secret filtering from the engine environment.

No behavior-preserving production change was made in this phase.
