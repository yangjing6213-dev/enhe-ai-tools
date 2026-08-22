# Same-Host Capacity Gate

## Hard preflight thresholds

Every row is mandatory. A screenshot reference cannot replace a live observation, and an uncollected value cannot be recorded as zero or pass.

| Gate | Required threshold | Current evidence | Gate result |
| --- | ---: | --- | --- |
| CPU cores | `>= 4` | `NOT_COLLECTED_REMOTE_AUDIT_EXIT_2` | `UNKNOWN_AUDIT_INCOMPLETE` |
| Memory total | `>= 8053063680` bytes | `NOT_COLLECTED_REMOTE_AUDIT_EXIT_2` | `UNKNOWN_AUDIT_INCOMPLETE` |
| Root total | `>= 170000000000` bytes | `NOT_COLLECTED_REMOTE_AUDIT_EXIT_2` | `UNKNOWN_AUDIT_INCOMPLETE` |
| CPU idle | `>= 50%` | `NOT_COLLECTED_REMOTE_AUDIT_EXIT_2` | `UNKNOWN_AUDIT_INCOMPLETE` |
| Memory available | `>= 4294967296` bytes | `NOT_COLLECTED_REMOTE_AUDIT_EXIT_2` | `UNKNOWN_AUDIT_INCOMPLETE` |
| Five-minute load | `<= 2` | `NOT_COLLECTED_REMOTE_AUDIT_EXIT_2` | `UNKNOWN_AUDIT_INCOMPLETE` |
| Swap in/out | `0 / 0` | `NOT_COLLECTED_REMOTE_AUDIT_EXIT_2` | `UNKNOWN_AUDIT_INCOMPLETE` |
| Root free | `>= 40000000000` bytes | `NOT_COLLECTED_REMOTE_AUDIT_EXIT_2` | `UNKNOWN_AUDIT_INCOMPLETE` |
| Root used | `<= 75%` | `NOT_COLLECTED_REMOTE_AUDIT_EXIT_2` | `UNKNOWN_AUDIT_INCOMPLETE` |
| Root inode free | `>= 20%` | `NOT_COLLECTED_REMOTE_AUDIT_EXIT_2` | `UNKNOWN_AUDIT_INCOMPLETE` |
| Docker-root free | `>= 40000000000` bytes | `NOT_COLLECTED_REMOTE_AUDIT_EXIT_2` | `UNKNOWN_AUDIT_INCOMPLETE` |
| Unhealthy/restarting production containers | `0` | `NOT_COLLECTED_REMOTE_AUDIT_EXIT_2` | `UNKNOWN_AUDIT_INCOMPLETE` |
| Production restart delta | `0` | `UNKNOWN_AUDIT_INCOMPLETE` | `UNKNOWN_AUDIT_INCOMPLETE` |
| Loopback port 3101 | free | `UNKNOWN_AUDIT_INCOMPLETE` | `UNKNOWN_AUDIT_INCOMPLETE` |
| RC project/container/network conflict | none | `UNKNOWN_AUDIT_INCOMPLETE` | `UNKNOWN_AUDIT_INCOMPLETE` |

The screenshot's 4 CPU, 8 GB memory, 180 GB disk, 1.816% UI CPU, 1693.333 MB used memory, and 101.9 GB / 56.6% used disk are supporting references only. Timestamp, byte interpretation, sample duration, Docker-root allocation, and concurrent production load are omitted variables.

## Runtime kill thresholds

Phase 2C.5B must stop RC smoke and begin cleanup immediately when any threshold is crossed.

```text
PRODUCTION_MONITOR_INTERVAL_SECONDS=15
```

| Runtime signal | Kill condition |
| --- | --- |
| Memory available | `< 2147483648` bytes |
| Five-minute load | `> 3` |
| Production unhealthy | `> 0` |
| Production restart delta | `> 0` |
| Root free | `< 30000000000` bytes |
| RC app unhealthy | `> 120` seconds |
| RC database unhealthy | `> 60` seconds |

Every production-monitor sample must carry an RFC 3339 UTC timestamp. Sampling starts at the pre-start baseline, repeats every 15 seconds through RC create, health, smoke, stop, and cleanup, and ends only after the post-cleanup fingerprint. Every sample is evaluated against every exact kill threshold above; a missing or late sample is incomplete evidence, never a pass.

A preflight pass would be time-bound evidence for a single acceptance window, not permanent host capacity. The gate must be rechecked immediately before RC start and observed throughout the maximum 90-minute window.

```text
SAME_HOST_EPHEMERAL_RC_CAPACITY_STATUS=PARTIAL_EVIDENCE
HARD_PREFLIGHT_GATE_STATUS=UNKNOWN_AUDIT_INCOMPLETE
RUNTIME_KILL_GATE_STATUS=DEFINED_NOT_EXECUTED
STAGING_DEPLOYMENT_APPROVAL_READY=NO
```
