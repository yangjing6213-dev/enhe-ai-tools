# RC Runtime Memory Protection V2

## Authority boundary

This is a fail-closed runtime contract for a future, separately approved Phase 2C.5B same-host ephemeral RC. It does not authorize an RC, tunnel, transfer, deployment, or production change now.

Runtime may begin only after the contextual capacity gate passes on fresh evidence, every contract hash is bound, and the user confirms the exact Phase 2C.5B approval phrase.

```text
PRODUCTION_MONITOR_INTERVAL_SECONDS=15
RC_RUNTIME_SAMPLE_INTERVAL_SECONDS=15
RC_RUNTIME_MAX_SAMPLE_GAP_SECONDS=20
RC_RUNTIME_CLOCK_SOURCE=MONOTONIC
RC_RUNTIME_SCHEDULING_MODE=FIXED_RATE
RC_TOTAL_CPU_LIMIT=1.5
RC_TOTAL_MEMORY_LIMIT_MIB=1920
RC_TOTAL_MEMORY_LIMIT_BYTES=2013265920
RC_MAX_RUNTIME_MINUTES=90
RC_DATA_MODE=SANITIZED_PUBLIC_FIXTURES
RC_ACCESS_MODE=SSH_TUNNEL_LOOPBACK_ONLY
RC_APP_BIND=127.0.0.1:3101
```

## Existing immediate-stop conditions preserved

Each sample from the pre-start baseline through verified post-cleanup must carry an RFC 3339 UTC timestamp. Any one of these conditions requires immediate stop and complete RC cleanup:

```text
HOST_MEMORY_AVAILABLE_BYTES<2147483648
HOST_LOAD5>3.0
PRODUCTION_UNHEALTHY_CONTAINER_COUNT>0
PRODUCTION_RESTART_COUNT_DELTA>0
ROOT_DISK_FREE_BYTES<30000000000
RC_APP_UNHEALTHY_SECONDS>120
RC_DB_UNHEALTHY_SECONDS>60
```

## Swap runtime rules

Any new swap-out is an immediate-stop condition:

```text
RC_RUNTIME_SWAP_OUT_DELTA>0
ACTION=STOP_IMMEDIATELY_AND_COMPLETE_CLEANUP
```

Swap-in alone is diagnostic and is not an immediate-stop condition. The first `pswpin` sample establishes only the baseline and does not produce a delta or warning. For every later valid 15-second sample, `RC_RUNTIME_SWAP_IN_DELTA` is the current `pswpin` counter minus the previous valid 15-second sample's counter, and `RC_RUNTIME_SWAP_IN_NONZERO=YES` if and only if that delta is greater than zero.

```text
RC_RUNTIME_SWAP_IN_DELTA=CURRENT_PSWPIN_COUNTER-PREVIOUS_VALID_15_SECOND_SAMPLE_PSWPIN_COUNTER
RC_RUNTIME_SWAP_IN_NONZERO=YES_IFF_RC_RUNTIME_SWAP_IN_DELTA>0
RC_RUNTIME_FIRST_SAMPLE_ACTION=ESTABLISH_BASELINE_ONLY
RC_RUNTIME_SAMPLE_INTERVAL_SECONDS=15
RC_RUNTIME_MAX_SAMPLE_GAP_SECONDS=20
```

Use a monotonic clock and fixed-rate scheduling anchored to the nominal 15-second cadence. Do not implement sampling as `sleep(15)` after sample processing, because processing time would accumulate schedule drift. The 20-second maximum gap allows five seconds of bounded jitter while remaining below the approximately 30-second gap caused by missing one complete nominal sample.

A `pswpin` counter rollback or reset, an invalid counter, a negative `RC_RUNTIME_SWAP_IN_DELTA`, a missing sample, or an elapsed monotonic gap greater than `RC_RUNTIME_MAX_SAMPLE_GAP_SECONDS` makes telemetry invalid and requires immediate stop and complete cleanup. At each valid post-baseline sample:

```text
IF RC_RUNTIME_SWAP_IN_DELTA>0 AND HOST_MEMORY_AVAILABLE_BYTES<3221225472
THEN RC_RUNTIME_MEMORY_PRESSURE_WARNING=YES
ELSE RC_RUNTIME_MEMORY_PRESSURE_WARNING=NO
```

If `RC_RUNTIME_MEMORY_PRESSURE_WARNING=YES` for two consecutive valid nominal-cadence 15-second samples, stop immediately and complete cleanup. A valid sample that does not satisfy both warning predicates resets the warning counter to zero. Invalid telemetry fails closed as defined above.

```text
RC_RUNTIME_MEMORY_PRESSURE_WARNING_CONSECUTIVE_SAMPLE_LIMIT=2
RC_RUNTIME_MEMORY_PRESSURE_WARNING_SAMPLE_SECONDS=15
RC_RUNTIME_MEMORY_PRESSURE_WARNING_LIMIT_SECONDS=30
```

The runtime must not disable, clear, resize, reconfigure, or otherwise modify swap, and must not modify `swappiness`. No host tuning is authorized as a response to any warning or stop condition.

## Zero-impact invariants

- Production container identities, images, networks, volumes, secrets, ports, health, restart counters, and resource settings remain unchanged.
- No production process is restarted, recreated, reconfigured, paused, scaled, or attached to an RC network.
- No production Nginx, DNS, certificate, firewall, database, object-storage, application, deployment, or host configuration is changed.
- RC app/database health timeouts, any old kill condition, any new swap-out, two consecutive combined swap-in/low-memory warnings, identity mismatch, public exposure, or external side effect trigger complete cleanup.
- Cleanup runs on success, failure, signal, timeout, partial create, or any stop condition and verifies the pre-start production fingerprint after cleanup.
- The existing 60-second and 24-hour evidence cannot guarantee future pressure is absent; runtime monitoring is mandatory for the whole window.

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
