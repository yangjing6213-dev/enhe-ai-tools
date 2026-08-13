# Concurrency Stress Results

The stress runner used real `writeRuntimeHeartbeat`, Windows temporary directories, no mocks, no database, and no network.

```text
SAME_PATH_STRESS_ROUNDS=100
SAME_PATH_TOTAL_WRITES=2000
SAME_PATH_ERRORS=0
SAME_PATH_FINAL_MISMATCHES=0

MULTI_PATH_STRESS_ROUNDS=50
MULTI_PATH_TOTAL_WRITES=2500
MULTI_PATH_ERRORS=0
MULTI_PATH_FINAL_MISMATCHES=0

MIXED_SEQUENCE_ERRORS=0
MIXED_SEQUENCE_FINAL={"status":"stopped","currentRunId":"runA"}
ENOENT_COUNT=0
TEMP_FILE_RESIDUE_COUNT=0
FINAL_WRITE_PRESERVES_INVOCATION_ORDER=YES
```

The mixed sequence exercised `null -> runA -> runA -> null` followed by `runA -> runB -> runA(stopped)`. The final JSON corresponded to the last invocation.

