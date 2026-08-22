# Data, Environment, and Side-Effect Contract

## Data mode

```text
RC_DATA_MODE=SANITIZED_PUBLIC_FIXTURES
PRODUCTION_DATA_COPY_ALLOWED=NO
PRODUCTION_DATABASE_ACCESS_ALLOWED=NO
PRODUCTION_OBJECT_STORAGE_ACCESS_ALLOWED=NO
```

Only deterministic sanitized public fixtures may be present in the ephemeral RC database. Real users, sessions, OAuth identities, orders, payments, refunds, payment proofs, download logs, private delivery records, private file paths, admin audit records, analytics identities, production object keys, and production URLs are prohibited.

Fixtures must be content-hash-audited, count-audited, removable, and owned only by the RC project. This package does not authorize a migration, seed, production dump, or import operation. If the immutable RC image cannot start against an already reviewed ephemeral schema/fixture bundle without those operations, Phase 2C.5B stops for a separate design decision.

## Environment boundary

- Use RC-only ephemeral configuration injected by the dedicated Phase 2C.5B wrapper.
- Do not read, copy, mount, print, or reuse a production `.env` body, Docker environment body, secret, database credential, storage credential, OAuth credential, SMTP credential, payment credential, analytics key, or webhook credential.
- Store no secret values in Git, the image archive receipt, Compose evidence, smoke evidence, or logs.
- Remove RC-only secret material and temporary scripts during cleanup.
- No production container environment inspection is authorized by this package.

## Memory-only secret contract

```text
RC_SECRET_ROOT=/run/enhe-public-rc1
RC_SECRET_STORAGE=MEMORY_ONLY
RC_SECRET_DIRECTORY_MODE=0700
RC_SECRET_FILE_MODE=0600
RC_SECRET_PERSISTENT_COPY_ALLOWED=NO
RC_SECRET_CLEANUP_ON_EVERY_EXIT=YES
RC_SECRET_POST_CLEANUP_ABSENCE_REQUIRED=YES
```

The wrapper must create `/run/enhe-public-rc1` or its trailing-slash equivalent only on memory-backed storage. The directory mode is 0700 and every secret file mode is 0600. No host-disk, image-layer, archive, log, evidence, or other persistent copy is allowed. Cleanup runs on success, failure, signal, timeout, and partial create; final verification must prove the path and every secret file are absent.

## Disabled side effects

| Capability | RC policy |
| --- | --- |
| Payment | `DISABLED` |
| OAuth | `DISABLED` |
| SMTP/email delivery | `DISABLED` |
| Production analytics/marketing | `DISABLED` |
| Webhooks | `DISABLED` |
| Imports | `DISABLED` |
| Scheduler/cron | `DISABLED` |
| Background workers | `DISABLED` |

Disabled means no live credential, no outbound side effect, no queue consumption, and no fallback to production configuration. Smoke must prove the disabled state without generating a real transaction or message.

## Deployment-script boundary

Existing deployment scripts require a separate staging wrapper and must not be run directly. The wrapper may not perform Git pull, production Compose operations, Nginx changes, migration, seed, or production app restart.

```text
DATA_ENVIRONMENT_SIDE_EFFECT_CONTRACT_STATUS=DEFINED_NOT_EXECUTED
PRODUCTION_SECRET_REUSED=NO
PRODUCTION_DATA_ACCESSED=NO
EXTERNAL_SIDE_EFFECT_TRIGGERED=NO
```
