# Same-Host Capacity Gate

| Gate | Required | Observed | Result |
| --- | ---: | ---: | --- |
| CPU cores | >= 4 | 4 | PASS |
| Memory total bytes | >= 8053063680 | 8058544128 | PASS |
| CPU idle minimum bps | >= 5000 | 9774 | PASS |
| Memory available minimum bytes | >= 4294967296 | 5781549056 | PASS |
| Load5 maximum milli | <= 2000 | 330 | PASS |
| Swap in total | 0 | 16 | **FAIL** |
| Swap out total | 0 | 0 | PASS |
| Root free bytes | >= 40000000000 | 78999416832 | PASS |
| Root used bps | <= 7500 | 5431 | PASS |
| Root inode free bps | >= 2000 | 8137 | PASS |
| Docker-root free bytes | >= 40000000000 | 78999416832 | PASS |
| Unhealthy containers | 0 | 0 | PASS |
| Restarting containers | 0 | 0 | PASS |
| Resource set changed | NO | NO | PASS |
| Restart delta | 0 | 0 | PASS |
| Loopback port 3101 free | YES | YES | PASS |
| Existing ephemeral project count | 0 | 0 | PASS |
| Existing RC resource count | 0 | 0 | PASS |
| OOM / filesystem / Docker / kernel fatal | all 0 | all 0 | PASS |

```text
SAME_HOST_EPHEMERAL_RC_CAPACITY_STATUS=FAIL
PHASE_2C_5A_R2_STATUS=COMPLETE_WITH_CAPACITY_REMEDIATION_REQUIRED
STAGING_DEPLOYMENT_APPROVAL_READY=NO
FAILED_CAPACITY_GATE_COUNT=1
FAILED_CAPACITY_GATE=HOST_SWAP_IN_TOTAL
NEXT_ACTION=USER_APPROVES_CAPACITY_REMEDIATION_OR_DEFERS_RC
```
