# Cleanup, Rollback, and In-Place Upgrade Boundary

## Mandatory RC cleanup

Cleanup runs after smoke, after any abort, and before the 90-minute deadline. It removes:

1. RC app container and RC database container.
2. The `enhe-public-rc1-ephemeral` Compose project.
3. All RC-owned app and internal DB networks.
4. Database tmpfs and every RC writable layer.
5. RC-only secrets and temporary configuration material.
6. Temporary audit, launch, tunnel, and cleanup scripts.
7. RC-owned processes and tunnel processes.
8. Copied RC logs and sanitized evidence working copies after their approved hashes are recorded.
9. The transferred image archive.

The transferred server archive is always removed. The uniquely loaded immutable RC image `enhe-ai-tools:phase2c4-public-rc1-78357d7` is preserved by default pending the Phase 2C.6 approval decision or a later explicit user deletion instruction. This preservation does not mean Phase 2C.6 is approved. No long-running RC website, database, port, network, volume, secret, or process may survive cleanup.

## Exact cleanup ownership and secret checks

```text
com.enhe.rc.id=ENHE-PHASE2C4-PUBLIC-RC1
com.enhe.ephemeral=true
com.enhe.phase=phase2c5b

RC_SECRET_ROOT=/run/enhe-public-rc1
RC_SECRET_STORAGE=MEMORY_ONLY
RC_SECRET_DIRECTORY_MODE=0700
RC_SECRET_FILE_MODE=0600
RC_SECRET_PERSISTENT_COPY_ALLOWED=NO
RC_SECRET_CLEANUP_ON_EVERY_EXIT=YES
RC_SECRET_POST_CLEANUP_ABSENCE_REQUIRED=YES
RC_IMAGE_POST_ACCEPTANCE_POLICY=PRESERVE_FOR_PHASE_2C6_UPGRADE_APPROVAL
```

Inspect, stop, and cleanup must select resources by an exact simultaneous match on all three labels. Fuzzy name, prefix, substring, or partial-label cleanup is prohibited. Cleanup runs on normal completion, failure, signal, timeout, and partial create. It must verify that `/run/enhe-public-rc1` (or its trailing-slash equivalent), every 0600 secret file, and every persistent secret copy are absent.

## RC rollback model

Because the RC is ephemeral and cannot mutate production, rollback is deterministic teardown to the exact pre-start production fingerprint. The pre-existing production-image set must be unchanged. Separately, the post-cleanup host-image set may contain only the exact retained immutable RC image allowed by `PRESERVE_FOR_PHASE_2C6_UPGRADE_APPROVAL`; subtracting that one exact image must make the host-image set equal the pre-start set. No other host-image delta is allowed. No production image, Compose project, Nginx configuration, database, volume, network, secret, or process is a rollback target. Any other production or host-image delta is a zero-impact gate failure requiring immediate stop and evidence preservation; it is not permission to improvise a production rollback.

Cleanup is incomplete until:

- every RC-owned runtime and temporary resource is absent, excluding only the exact immutable image allowed by `PRESERVE_FOR_PHASE_2C6_UPGRADE_APPROVAL`;
- loopback port 3101 matches its pre-start state;
- production container identities and resource settings match the baseline;
- production restart delta is zero;
- production health is restored or unchanged;
- root and Docker-root free-space checks satisfy the post-cleanup gate.

## In-place production upgrade boundary

```text
PHASE_2C5B_SCOPE=RC_VALIDATION_ONLY
PRODUCTION_UPGRADE_PHASE=PHASE_2C_6_IN_PLACE_PRODUCTION_UPGRADE
UPGRADE_MODEL=IN_PLACE_EXISTING_SITE_UPGRADE
NEW_WEBSITE_CREATED=NO
SECOND_LONG_RUNNING_WEBSITE=NO
SECOND_LONG_RUNNING_DATABASE=NO
```

Phase 2C.5B cannot run Git pull, production Compose, Nginx changes, migration, seed, production app restart, production image replacement, or production traffic switching. Those actions require a separate Phase 2C.6 plan, evidence package, approval, and rollback contract.

```text
CLEANUP_STATUS=NOT_EXECUTED_RC_NOT_DEPLOYED
ROLLBACK_STATUS=NOT_EXECUTED_RC_NOT_DEPLOYED
PRODUCTION_SITE_UPGRADE_STARTED=NO
LIVE_PRODUCTION_CHANGED=NO
```
