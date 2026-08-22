# Swap Pressure Policy V2

## Purpose and boundary

`SWAP_PRESSURE_GATE_VERSION=2` is an ENHE project-specific admission policy for the Phase 2C.5B same-host ephemeral RC. It is not a Linux-wide health threshold and it does not redefine the R2 contract retroactively.

R2 correctly applied its then-current rule that total swap-in across the six samples had to equal zero. R3 preserves that failed result and replaces only the forward-looking engineering decision model.

```text
PREVIOUS_PHASE_2C5A_R2_STATUS=COMPLETE_WITH_CAPACITY_REMEDIATION_REQUIRED_PRESERVED
PREVIOUS_R2_CAPACITY_GATE=HOST_SWAP_IN_TOTAL_EQUALS_ZERO
PREVIOUS_R2_CAPACITY_GATE_RESULT=FAIL_16
PREVIOUS_R2_EVIDENCE_MODIFIED=NO
PREVIOUS_R2_CAPACITY_DATA_CHANGED=NO
R2_CAPACITY_GATE_POLICY_SUPERSEDED=YES
R2_RAW_CAPACITY_EVIDENCE_REUSED=YES
SWAP_PRESSURE_GATE_VERSION=2
```

## Metric semantics

Linux `pswpin` is the kernel's cumulative count of pages swapped into memory. Each R2 sample is the adjacent counter delta over one 10-second interval. It is not bytes, current swap usage, swap-out, an OOM event, a container restart, or by itself proof of sustained memory pressure.

The six 10-second swap-in deltas are `0, 7, 5, 3, 0, 1`, for a total of 16 pages over 60 seconds. The six swap-out deltas are all zero, for a total of zero.

## Deterministic arithmetic

- Use integer arithmetic or arbitrary-precision decimal arithmetic; binary floating point is prohibited.
- Rate decisions use exact fractions. The average swap-in rate is judged as `16/60` pages per second and displayed as `0.2666666667` using `ROUND_HALF_UP` to ten decimal places.
- The maximum interval rate is judged exactly as `7/10=0.7` pages per second.
- Upper-bound ratios use the exact fraction for judgment and `ROUND_CEILING` for the gate field so truncation cannot hide a failure.
- Lower-bound ratios use the exact fraction for judgment and `ROUND_FLOOR` for the gate field so upward rounding cannot hide a failure.

## Gate V2

Conditions A through J must all be true. A missing or invalid input fails closed.

| ID | Required condition |
| --- | --- |
| A | `HOST_SWAP_OUT_TOTAL=0` |
| B | Exact average swap-in rate `HOST_SWAP_IN_TOTAL/60 <= 1.0` pages/s |
| C | Exact maximum interval swap-in rate `max(samples.swap_in)/10 <= 1.0` pages/s |
| D | Exact swap-used ratio `swap_used_bytes*10000/swap_total_bytes <= 2500` bps; gate field uses `ROUND_CEILING` |
| E | Exact minimum available-memory ratio `memory_available_min*10000/memory_total >= 5000` bps; gate field uses `ROUND_FLOOR` |
| F | `memory_available_min-RC_TOTAL_MEMORY_LIMIT_BYTES >= 3221225472`, with `RC_TOTAL_MEMORY_LIMIT_BYTES=2013265920` |
| G | `HOST_CPU_IDLE_MIN_BPS>=5000` and `HOST_LOAD5_MAX_MILLI<=2000` |
| H | OOM, filesystem-error, Docker-fatal, and kernel-fatal counts over 24 hours are all zero |
| I | Unhealthy and restarting container counts are zero, the resource set is unchanged, and restart delta is zero |
| J | CPU cores `>=4`; total memory `>=8053063680`; root total `>=170000000000`; root free `>=40000000000`; root used `<=7500` bps; inode free `>=2000` bps; Docker-root free `>=40000000000`; loopback port 3101 free; existing RC project and resource counts both zero |

Passing this gate means only that the existing 60-second sample and 24-hour counters contain no evidence of sustained memory pressure under this project policy. It does not guarantee that future pressure cannot occur. Phase 2C.5B still requires fresh pre-start checks and continuous runtime protection.

## Evidence and scope anchors

```text
SOURCE_BRANCH=codex/enhe-phase2c5-same-host-rc-audit-r2
SOURCE_HEAD=fa94ac7b394c2cb63838e8456e56c4661efec973
SOURCE_TREE=67252addff00927146f2ebb88c23da2404c4cf81
START_HEAD=fa94ac7b394c2cb63838e8456e56c4661efec973
CAPACITY_AUTHORITY=docs/enhe-redesign/phase-2c5a-r2/capacity-audit-v3-manifest.json
HOST_CAPACITY_AUDIT_SHA256=793580d056cee6c1f156bd9de47f2aa2630125270f1e38f68291b5654bb2ca09
R2_ZIP_STATUS=PASS
R2_ZIP_SIZE=20544
R2_ZIP_SHA256=f5b2822df702bcaa92856e9c99772daa595b4cf844aa0b7f6388fbf950117c46
R2_ZIP_FILE_COUNT=18
R2_ZIP_MARKDOWN_COUNT=17
R2_ZIP_JSON_COUNT=1
R2_ZIP_BAD_CRC=0
R2_ZIP_INVALID_PATH_COUNT=0
R2_ZIP_GIT_FILE_SET_MATCH=YES
R2_ZIP_GIT_FILE_HASH_MATCH=YES
R2_ZIP_GIT_MISMATCH_COUNT=0
R2_CAPACITY_DATA_CHANGED=NO
R2_PROTOCOL_CHANGED=NO
R2_MANIFEST_CHANGED=NO
SSH_INVOCATION_LIMIT=0
SSH_INVOCATION_COUNT=0
NETWORK_ACCESS_COUNT=0
REMOTE_MUTATION_OR_ACCESS=NO
APPLICATION_OR_DEPLOYMENT_SOURCE_CHANGED=NO
RC_OR_PRODUCTION_DEPLOYMENT_STARTED=NO
PUSHED=NO
REMOTE_CHANGED=NO
TAG_CREATED=NO
```
