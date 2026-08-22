# Same-Host Capacity Gate

No capacity threshold can pass or fail from rejected output. Every observation below remains unknown.

| Gate | Required | Result |
| --- | ---: | --- |
| CPU cores | `>= 4` | `UNKNOWN_AUDIT_OUTPUT_REJECTED` |
| Memory total | `>= 8053063680` | `UNKNOWN_AUDIT_OUTPUT_REJECTED` |
| Root disk total | `>= 170000000000` | `UNKNOWN_AUDIT_OUTPUT_REJECTED` |
| CPU idle minimum | `>= 50%` | `UNKNOWN_AUDIT_OUTPUT_REJECTED` |
| Memory available minimum | `>= 4294967296` | `UNKNOWN_AUDIT_OUTPUT_REJECTED` |
| Load5 maximum | `<= 2.0` | `UNKNOWN_AUDIT_OUTPUT_REJECTED` |
| Swap in/out | `0 / 0` | `UNKNOWN_AUDIT_OUTPUT_REJECTED` |
| Root free bytes | `>= 40000000000` | `UNKNOWN_AUDIT_OUTPUT_REJECTED` |
| Root used percent | `<= 75` | `UNKNOWN_AUDIT_OUTPUT_REJECTED` |
| Root inode free percent | `>= 20` | `UNKNOWN_AUDIT_OUTPUT_REJECTED` |
| Docker-root free bytes | `>= 40000000000` | `UNKNOWN_AUDIT_OUTPUT_REJECTED` |
| Unhealthy containers | `0` | `UNKNOWN_AUDIT_OUTPUT_REJECTED` |
| Restarting containers | `0` | `UNKNOWN_AUDIT_OUTPUT_REJECTED` |
| Production resource change | `NO` | `UNKNOWN_AUDIT_OUTPUT_REJECTED` |
| Production restart delta | `0` | `UNKNOWN_AUDIT_OUTPUT_REJECTED` |
| Loopback port 3101 | free | `UNKNOWN_AUDIT_OUTPUT_REJECTED` |
| Existing ephemeral RC project | `0` | `UNKNOWN_AUDIT_OUTPUT_REJECTED` |
| Existing RC resources | `0` | `UNKNOWN_AUDIT_OUTPUT_REJECTED` |
| OOM events in 24h | `0` | `UNKNOWN_AUDIT_OUTPUT_REJECTED` |
| Filesystem fatal events in 24h | `0` | `UNKNOWN_AUDIT_OUTPUT_REJECTED` |
| Docker/runtime fatal events in 24h | `0` | `UNKNOWN_AUDIT_OUTPUT_REJECTED` |
| Kernel fatal events in 24h | `0` | `UNKNOWN_AUDIT_OUTPUT_REJECTED` |

```text
SAME_HOST_EPHEMERAL_RC_CAPACITY_STATUS=PARTIAL_EVIDENCE
HARD_PREFLIGHT_GATE_STATUS=UNKNOWN_AUDIT_OUTPUT_REJECTED
STAGING_DEPLOYMENT_APPROVAL_READY=NO
```

The phase-level security block takes priority over capacity evaluation. A failed or unknown metric is not converted into zero, `NO`, or `PASS`.
