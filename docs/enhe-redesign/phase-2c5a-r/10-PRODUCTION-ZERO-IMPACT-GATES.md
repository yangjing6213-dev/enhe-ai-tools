# Production Zero-Impact Gates

## Pre-start gate

RC create/start is prohibited until fresh read-only evidence proves all hard capacity thresholds and records:

- current production container count and sanitized runtime fingerprint;
- current production health, restarting state, and restart counters;
- current production resource state and 24-hour log count;
- current Docker-root and root-filesystem capacity;
- loopback port 3101 availability;
- absence of RC project, container, network, and image-tag conflicts.

Current evidence for every item above is `NOT_COLLECTED_REMOTE_AUDIT_EXIT_2` or `UNKNOWN_AUDIT_INCOMPLETE`. Therefore the pre-start gate is not closed.

```text
PRODUCTION_MONITOR_INTERVAL_SECONDS=15
HOST_MEMORY_AVAILABLE_BYTES<2147483648
HOST_LOAD5>3.0
PRODUCTION_UNHEALTHY_CONTAINER_COUNT>0
PRODUCTION_RESTART_COUNT_DELTA>0
ROOT_DISK_FREE_BYTES<30000000000
RC_APP_UNHEALTHY_SECONDS>120
RC_DB_UNHEALTHY_SECONDS>60
```

The production baseline sample and every sample through post-cleanup must carry an RFC 3339 UTC timestamp. Sampling repeats every 15 seconds without gaps and evaluates the exact memory, load5, production-health, production-restart, root-free, RC-app-health, and RC-database-health kill thresholds at each timestamp.

## During-window gate

- Production container identities, image identities, networks, volumes, secrets, published ports, health, restart counters, and resource settings must remain unchanged.
- No production container may be restarted, recreated, paused, scaled, connected to an RC network, or used by the RC.
- No Nginx, DNS, domain, certificate, firewall/public-port, crawler, database, object-storage, or production configuration change is permitted.
- Production unhealthy greater than zero, production restart delta greater than zero, memory available below `2147483648` bytes, load5 above `3`, or root free below `30000000000` bytes triggers immediate RC cleanup.
- Resource checks continue at the 15-second interval through cleanup; a healthy RC does not override a production delta.

## Post-cleanup gate

The sanitized post-cleanup production fingerprint, including the pre-existing production-image set, must equal the pre-start fingerprint. The host-image inventory has one explicit exception: zero or one exact immutable image `enhe-ai-tools:phase2c4-public-rc1-78357d7` may remain under `PRESERVE_FOR_PHASE_2C6_UPGRADE_APPROVAL`. The comparison must remove only that exact image from the post-cleanup host-image set and then require equality with the pre-start host-image set. Any other image delta fails. Port 3101 must return to its original state, production restart delta must be zero, production resource-change result must be no change, and no RC-owned runtime or temporary container, database, project, network, tmpfs, secret, script, process, log copy, or archive may remain.

```text
PRODUCTION_IMAGE_SET_FINGERPRINT_SCOPE=PRE_EXISTING_PRODUCTION_IMAGES_ONLY
HOST_IMAGE_SET_ALLOWED_DELTA=ZERO_OR_ONE_EXACT_RETAINED_RC_IMAGE
HOST_IMAGE_SET_ALLOWED_DELTA_TAG=enhe-ai-tools:phase2c4-public-rc1-78357d7
HOST_IMAGE_SET_NORMALIZED_COMPARISON=POST_CLEANUP_MINUS_EXACT_RETAINED_RC_IMAGE_EQUALS_PRE_START
UNAPPROVED_HOST_IMAGE_SET_DELTA_ALLOWED=NO
```

```text
LIVE_PRODUCTION_RESOURCE_CHANGE_RESULT=UNKNOWN_AUDIT_INCOMPLETE
LIVE_PRODUCTION_RESTART_DELTA=UNKNOWN_AUDIT_INCOMPLETE
LIVE_PORT_3101_FREE_RESULT=UNKNOWN_AUDIT_INCOMPLETE
LIVE_RC_CONFLICT_RESULT=UNKNOWN_AUDIT_INCOMPLETE
PRODUCTION_ZERO_IMPACT_DESIGN_STATUS=PASS
PRODUCTION_ZERO_IMPACT_RUNTIME_STATUS=NOT_EXECUTED
RC_DEPLOYMENT_STARTED=NO
PRODUCTION_DEPLOYMENT_STARTED=NO
LIVE_PRODUCTION_CHANGED=NO
```

`PRODUCTION_ZERO_IMPACT_DESIGN_STATUS=PASS` means the fail-closed gates are defined. It does not claim the unexecuted runtime checks passed.
