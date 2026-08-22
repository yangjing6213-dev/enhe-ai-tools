# Phase 2C.5B Execution Plan

## Scope and entry gate

```text
PHASE_2C5B_SCOPE=RC_VALIDATION_ONLY
PRODUCTION_UPGRADE_PHASE=PHASE_2C_6_IN_PLACE_PRODUCTION_UPGRADE
STAGING_DEPLOYMENT_APPROVAL_READY=NO
REQUIRED_INPUT=ONE_ADDITIONAL_READ_ONLY_CAPACITY_AUDIT_AUTHORIZATION_AFTER_PREVIOUS_SINGLE_CALL_EXIT_2
PRODUCTION_MONITOR_INTERVAL_SECONDS=15
HOST_MEMORY_AVAILABLE_BYTES<2147483648
HOST_LOAD5>3.0
PRODUCTION_UNHEALTHY_CONTAINER_COUNT>0
PRODUCTION_RESTART_COUNT_DELTA>0
ROOT_DISK_FREE_BYTES<30000000000
RC_APP_UNHEALTHY_SECONDS>120
RC_DB_UNHEALTHY_SECONDS>60
RC_SMOKE_MATRIX_STATUS=NOT_EXECUTED
RC_IMAGE_ARCHIVE_SHA256=NOT_EXECUTED
RC_IMAGE_ID=NOT_EXECUTED
RC_IMAGE_CONFIG_DIGEST=NOT_EXECUTED
RC_IMAGE_LABEL_STATUS=NOT_EXECUTED
RC_IMAGE_POST_ACCEPTANCE_POLICY=PRESERVE_FOR_PHASE_2C6_UPGRADE_APPROVAL
RC_APP_IMAGE=enhe-ai-tools:phase2c4-public-rc1-78357d7
RC_DB_IMAGE=postgres:16-alpine
RC_DB_HEALTHCHECK=pg_isready
RC_CONSOLE_ERROR_COUNT_REQUIRED=0
RC_PAGE_ERROR_COUNT_REQUIRED=0
RC_ROOT_HORIZONTAL_OVERFLOW_REQUIRED=0
RC_CONSOLE_ERROR_COUNT_OBSERVED=NOT_EXECUTED_APPROVAL_BLOCKED
RC_PAGE_ERROR_COUNT_OBSERVED=NOT_EXECUTED_APPROVAL_BLOCKED
RC_ROOT_HORIZONTAL_OVERFLOW_OBSERVED=NOT_EXECUTED_APPROVAL_BLOCKED
```

This is a fail-closed execution plan, not present authority to execute it. The previous authorized SSH batch exited 2 before sampling. No retry, audit, transfer, tunnel, or RC action is allowed until the user grants a new read-only capacity-audit authorization and the resulting evidence closes the approval gate.

## Ordered execution

### 1. Re-authorize and complete read-only audit

- Obtain explicit user authorization for one additional read-only capacity-audit batch.
- Preserve strict host-key checking and emit only sanitized, non-secret results.
- Collect the full 60-second sample, 24-hour log count, Docker count/fingerprint, production resource baseline, restart counters, port-free result, and RC-conflict result.
- Stop on transport failure, incomplete output, host-key mismatch, unexpected target identity, or any secret-bearing output.

### 2. Evaluate hard preflight

- Require CPU cores at least 4, memory total at least `8053063680` bytes, and root total at least `170000000000` bytes.
- Require CPU idle at least 50%, memory available at least `4294967296` bytes, load5 no more than 2, and swap in/out equal to zero.
- Require root free at least `40000000000` bytes, root used no more than 75%, inode free at least 20%, and Docker-root free at least `40000000000` bytes.
- Require no unhealthy/restarting production container, zero production restart delta, free loopback port 3101, and no RC project/resource conflict.
- Any missing or failed row stops Phase 2C.5B before mutation.
- Timestamp the pre-start baseline and every production sample in RFC 3339 UTC, then sample every 15 seconds through post-cleanup and evaluate every exact kill threshold at each sample.

### 3. Close approval and image gate

- Have the controller bind the approved candidate, source anchors, audit receipt, architecture, image, Compose, zero-impact, cleanup, and execution-plan hashes.
- Reconfirm that deployment approval is explicitly available before continuing.
- Build `enhe-ai-tools:phase2c4-public-rc1-78357d7` locally, save it, hash it, and verify it within the `8000000000`-byte RC disk budget.
- Require these exact OCI labels before save and after load:
  - `org.opencontainers.image.revision=78357d74962276d3036975d2197e9c284eb053b1`
  - `org.opencontainers.image.created=<RFC3339 UTC local-build timestamp recorded in receipt>`
  - `com.enhe.rc.id=ENHE-PHASE2C4-PUBLIC-RC1`
  - `com.enhe.runtime.source-tree=5f488a621539ac2b70efa0dbe4797e3be689b4aa`
  - `com.enhe.production-source-sha256=959ba31469cee929b70c66f9649d9029ded71f37985e3f0b8258ef1733a1dfab`
  - `com.enhe.package-lock-sha256=c61883c10346b28695eea52fbe6fcd8493783d141710aed8245f05398d296ca3`
  - `com.enhe.migration-tree-sha256=3e30a6ea9e3210abf97fc377cde1b85afdf8684d1214ac63a9fe6826e804c8dc`
- Record `RC_IMAGE_ARCHIVE_SHA256`, `RC_IMAGE_ID`, `RC_IMAGE_CONFIG_DIGEST`, and `RC_IMAGE_LABEL_STATUS`; their current observed state is `NOT_EXECUTED`.
- Transfer only through the separately authorized secure-copy action; require exact local/server archive SHA-256 equality before Docker load.
- Inspect the loaded image and require exact pre/post-load equality for image ID, image config digest, and all seven OCI label values before Compose.
- Never build on the server and never use `latest`.

### 4. Create isolated RC through the staging wrapper

- Use Compose project `enhe-public-rc1-ephemeral`.
- Use app image `enhe-ai-tools:phase2c4-public-rc1-78357d7` and database image `postgres:16-alpine`.
- Use database healthcheck `pg_isready`.
- Enforce the app/database CPU, memory, reservation, PID, tmpfs, logging, restart, init, network, and loopback-bind contracts.
- Inject only RC-specific ephemeral configuration and `SANITIZED_PUBLIC_FIXTURES`.
- Apply all three exact resource labels to every RC-created container and network:
  - `com.enhe.rc.id=ENHE-PHASE2C4-PUBLIC-RC1`
  - `com.enhe.ephemeral=true`
  - `com.enhe.phase=phase2c5b`
- Require create, inspect, stop, and cleanup to match all three labels simultaneously; prohibit fuzzy name, prefix, substring, or partial-label selection.
- Store secrets only in memory at `/run/enhe-public-rc1` (or trailing slash), with directory mode 0700 and file mode 0600. Create no persistent copy.
- Do not run existing deployment scripts directly.
- Do not run Git pull, production Compose, Nginx changes, migration, seed, production app restart, or any production mutation.

### 5. Run tunnel-only RC smoke

- Start the 90-minute timer before the first RC container is created.
- Establish loopback-only SSH tunnel access to `127.0.0.1:3101`; expose no database or public port.
- Require HTTP 200 for `/`, `/en`, `/software`, `/en/software`, `/robots.txt`, and `/sitemap.xml`.
- Require HTTP 404 for `/redesign-preview/motion`, `/redesign-preview/motion/category-layer`, `/redesign-preview/motion/product-stage`, and `/redesign-preview/motion/mobile-nav`; fail if any other `/redesign-preview/**` is exposed.
- Validate Header, Footer, Home, Software, Category, Product Stage, Mobile Nav, support entry, and support suppression-and-recovery as distinct checks at viewports 320/390/483/484/768/1440 in zh/en.
- Cover pointer, keyboard, reduced motion, no-JS, SSR, hydration, pagination, canonical, hreflang, JSON-LD, prototype isolation, and absence of `fileUrl`, `filePath`, and delivery-address data.
- Enforce `RC_CONSOLE_ERROR_COUNT_REQUIRED=0`, `RC_PAGE_ERROR_COUNT_REQUIRED=0`, and `RC_ROOT_HORIZONTAL_OVERFLOW_REQUIRED=0`; record each observed value as `NOT_EXECUTED_APPROVAL_BLOCKED` until smoke actually runs.
- Keep every unexecuted smoke cell `NOT_EXECUTED`; no neighboring viewport or locale inference is allowed.
- Observe production health, restart delta, memory available, load5, root free space, and RC health every 15 seconds with an RFC 3339 UTC timestamp.
- Kill and clean up on any runtime threshold, identity mismatch, side effect, public exposure, or production delta.

### 6. Cleanup and verify zero impact

- Remove RC app, database, project, networks, tmpfs, secrets, scripts, processes, copied logs, and transferred archive.
- Match all three exact `com.enhe.*` resource labels for inspect, stop, and cleanup; never use fuzzy name selection.
- Cleanup the memory-only `/run/enhe-public-rc1` secret root on success, failure, signal, timeout, and partial create, then verify the path, every 0600 secret file, and every persistent copy are absent.
- Always remove the transferred server archive and all runtime/database/network/secret/temp resources.
- Preserve only the uniquely loaded immutable RC image by default under `RC_IMAGE_POST_ACCEPTANCE_POLICY=PRESERVE_FOR_PHASE_2C6_UPGRADE_APPROVAL`, pending a later Phase 2C.6 approval decision or explicit user deletion. This does not mean Phase 2C.6 is approved.
- Compare sanitized production pre-start and post-cleanup fingerprints, with `PRODUCTION_IMAGE_SET_SHA256` scoped to pre-existing production images only.
- Treat zero or one exact retained image `enhe-ai-tools:phase2c4-public-rc1-78357d7` as the sole allowed host-image delta under `PRESERVE_FOR_PHASE_2C6_UPGRADE_APPROVAL`; subtract only that exact image and require the normalized host-image set to equal the pre-start set.
- Require no production resource change, zero production restart delta, restored port state, no unapproved host-image delta, and no residual RC runtime or temporary resource.

### 7. Issue Phase 2C.5B receipt

- Report every threshold with observed evidence and timestamps.
- Report image/archive identity, smoke results, kill-gate observations, cleanup inventory, and production delta.
- Mark missing evidence as unknown, never as zero or pass.
- State explicitly that the receipt validates only the RC and does not authorize Phase 2C.6.

```text
PHASE_2C5B_EXECUTION_STATUS=NOT_STARTED
RC_DEPLOYMENT_STARTED=NO
PRODUCTION_DEPLOYMENT_STARTED=NO
PRODUCTION_SITE_UPGRADE_STARTED=NO
```
