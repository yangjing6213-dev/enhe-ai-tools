# Phase 2C.5B Execution Plan V2

## Scope and entry gate

This is a fail-closed execution plan, not current authority to execute it. The next action is the user's exact approval confirmation after reviewing this R3 package.

```text
PHASE_2C5B_SCOPE=RC_VALIDATION_ONLY
PRODUCTION_UPGRADE_PHASE=PHASE_2C_6_IN_PLACE_PRODUCTION_UPGRADE
RC_ID=ENHE-PHASE2C4-PUBLIC-RC1
RC_RUNTIME_SOURCE_HEAD=78357d74962276d3036975d2197e9c284eb053b1
SAME_HOST_RC_CANDIDATE_ID=255E85F9A06C58D800CAACB7A7516AF035F89F4B16573E02869BB78FC7600608
RC_DATA_MODE=SANITIZED_PUBLIC_FIXTURES
RC_ACCESS_MODE=SSH_TUNNEL_LOOPBACK_ONLY
RC_APP_BIND=127.0.0.1:3101
RC_TOTAL_CPU_LIMIT=1.5
RC_TOTAL_MEMORY_LIMIT_MIB=1920
RC_TOTAL_MEMORY_LIMIT_BYTES=2013265920
RC_MAX_RUNTIME_MINUTES=90
PRODUCTION_MONITOR_INTERVAL_SECONDS=15
RC_RUNTIME_SAMPLE_INTERVAL_SECONDS=15
RC_RUNTIME_MAX_SAMPLE_GAP_SECONDS=20
RC_RUNTIME_CLOCK_SOURCE=MONOTONIC
RC_RUNTIME_SCHEDULING_MODE=FIXED_RATE
STAGING_DEPLOYMENT_APPROVAL_READY=YES
CURRENT_EXECUTION_AUTHORIZATION=NO_PENDING_EXACT_USER_CONFIRMATION
NEXT_ACTION=USER_CONFIRMS_EXACT_PHASE_2C5B_SAME_HOST_RC_APPROVAL
```

## Ordered execution

### 1. Confirm exact approval and immutable bindings

- Require the exact approval phrase from `11-DEPLOYMENT-APPROVAL-RECEIPT.md`; package generation alone is not approval.
- Bind the RC ID, runtime source HEAD, same-host candidate ID, capacity evidence hash, contextual swap-policy hash, image contract hash, Compose contract hash, runtime zero-impact V2 hash, cleanup hash, and this plan's externally calculated normalized hash.
- Stop before any connection or mutation if any identifier, hash, scope, resource limit, or approval text differs.

### 2. Re-evaluate the fresh pre-start gate

- Read capacity values through the approved read-only audit contract and evaluate Swap Pressure Gate V2 conditions A through J with integer or arbitrary-precision decimal arithmetic.
- Require zero swap-out, bounded exact swap-in rates, bounded exact swap use, sufficient available-memory ratio and post-RC headroom, CPU/load margin, zero 24-hour fatal counts, unchanged healthy production resources, disk/inode margin, free loopback port 3101, and no existing RC conflict.
- A missing, stale, malformed, or failed field stops before RC creation. Do not alter swap, `swappiness`, production resources, or host configuration to make the gate pass.
- Timestamp the baseline and every later 15-second sample in RFC 3339 UTC.

### 3. Verify immutable image and isolated resource contract

- Build and hash the locked RC image locally, verify the approved image identity and OCI labels, and stay within the existing RC disk budget.
- Any later transfer or load requires separate execution authority, exact archive-hash equality, and exact pre/post-load image identity. Never build on the server and never use a mutable image tag.
- Use only the isolated RC project, exact ownership labels, app/database resource ceilings, `restart: no`, bounded logs, internal database network, and no database host bind.
- Inject only RC-specific ephemeral configuration and deterministic `SANITIZED_PUBLIC_FIXTURES`. Real payment, OAuth, user, order, private-file, production database, or object-storage data is prohibited.

### 4. Create the temporary RC only after every gate closes

- Start the 90-minute timer before the first RC resource is created.
- Bind the app only to `127.0.0.1:3101` and access it only through the approved loopback SSH tunnel. Expose no public listener and no database port.
- Enforce total CPU `1.5` and total memory `1920MiB`. Do not reuse or modify any production container, network, volume, secret, project, configuration, or process.
- Disable real payment, OAuth, SMTP, analytics, webhooks, imports, schedulers, and background workers.

### 5. Monitor and stop fail-closed

The existing immediate-stop conditions remain unchanged:

```text
HOST_MEMORY_AVAILABLE_BYTES<2147483648
HOST_LOAD5>3.0
PRODUCTION_UNHEALTHY_CONTAINER_COUNT>0
PRODUCTION_RESTART_COUNT_DELTA>0
ROOT_DISK_FREE_BYTES<30000000000
RC_APP_UNHEALTHY_SECONDS>120
RC_DB_UNHEALTHY_SECONDS>60
```

Additionally, `RC_RUNTIME_SWAP_OUT_DELTA>0` requires immediate stop and complete cleanup. Swap-in alone is diagnostic. The first `pswpin` sample establishes only the baseline. For each later valid nominal-cadence 15-second sample, `RC_RUNTIME_SWAP_IN_DELTA` equals the current `pswpin` counter minus the previous valid sample's counter, and `RC_RUNTIME_SWAP_IN_NONZERO=YES` if and only if `RC_RUNTIME_SWAP_IN_DELTA>0`. Use a monotonic clock and fixed-rate scheduling anchored to the 15-second cadence; do not use `sleep(15)` after sample processing and accumulate drift. The maximum elapsed monotonic gap is 20 seconds, allowing five seconds of bounded jitter while remaining below the approximately 30-second gap caused by missing one complete nominal sample. A counter rollback/reset, invalid counter, negative delta, missing sample, or elapsed monotonic gap greater than 20 seconds makes telemetry invalid and requires immediate stop and complete cleanup.

Set `RC_RUNTIME_MEMORY_PRESSURE_WARNING=YES` only when `RC_RUNTIME_SWAP_IN_DELTA>0` and `HOST_MEMORY_AVAILABLE_BYTES<3221225472`. Two consecutive valid nominal-cadence 15-second warning samples require immediate stop and complete cleanup; any valid sample that does not satisfy both predicates resets the warning counter to zero. Never disable, clear, resize, or tune swap or `swappiness`.

### 6. Run tunnel-only acceptance checks

- Validate the locked route, locale, viewport, interaction, reduced-motion, SSR/hydration, metadata, prototype-isolation, accessibility, console/page-error, overflow, support, and sensitive-field smoke contracts through the loopback tunnel.
- Keep unexecuted cells `NOT_EXECUTED`; do not infer them from another locale or viewport.
- Keep production monitoring active without gaps through acceptance and cleanup. A healthy RC never overrides a production delta or memory-protection stop condition.

### 7. Complete cleanup and issue the receipt

- On acceptance, failure, signal, timeout, partial creation, or any stop condition, preserve only the unique immutable RC image that the existing cleanup contract allows by default. Remove every other temporary App, DB, project, network, tmpfs/writable layer, Secret/configuration material, archive, script/process/tunnel, log copy/evidence working copy, and RC runtime resource covered by that contract.
- Finish before the 90-minute deadline and verify the loopback port, production identity, health, resources, restart delta, and normalized image-set rules against the pre-start baseline.
- Report every observed threshold, timestamp, warning, stop condition, smoke result, cleanup result, and production delta. Missing evidence remains unknown, never pass.
- Retaining the one contract-allowed immutable RC image does not approve Phase 2C.6. The receipt validates only the temporary RC and cannot authorize the Phase 2C.6 production upgrade.

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
