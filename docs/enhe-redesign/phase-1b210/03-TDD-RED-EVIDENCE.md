# TDD RED Evidence

Test file: `deploy/enhe-ai-tools/scripts/runtime-heartbeat-state-store.test.mjs`.

The first test used the real exported writer, a unique `os.tmpdir()` directory, 20 concurrent writes to one target, and no mocks.

```text
RED_RUNS=3
RED_RUN_1=FAIL
RED_RUN_2=FAIL
RED_RUN_3=FAIL
RED_FAILURE=ENOENT during rename of <target>.32516.tmp / <target>.35788.tmp / <target>.33100.tmp
```

All three failures occurred at the old PID-only temporary path. This was a stable production-writer reproduction, so no artificial failure or test-only mock was introduced.

