# State Store Evidence

`STATE_STORE_ATOMICITY_STATUS=BLOCKED_PRODUCTION_WRITER_CONCURRENCY_BUG_CONFIRMED`

## Reproduction

The real production `writeRuntimeHeartbeat` was called 20 times concurrently against one temporary target path, using a unique temporary directory and no production database or network.

```text
runs=20
passed=4
failed=16
errors=ENOENT (16 occurrences)
```

The writer uses a PID-derived temporary filename. Concurrent calls can overwrite or rename the same temporary path, leaving later calls without the expected source path. The observed `ENOENT` failures are direct evidence from the real writer.

`STATE_STORE_STRESS_RUNS=100`

`STATE_STORE_STRESS_PASSED=NOT_RUN`

The required 100-run stress test, rename-failure matrix and full atomicity suite were not started after the first hard gate failed. The writer was not modified.
