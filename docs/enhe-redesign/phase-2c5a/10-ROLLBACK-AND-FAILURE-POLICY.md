# Rollback and Failure Policy

## Preconditions

Rollback may be executed only by the named rollback operator within the approved maintenance window. Before deployment, Phase 2C.5B must record the current Staging backup, previous immutable image digest, previous Compose manifest hash, database backup hash, target identity hash, rollback time limit, and health-failure threshold.

For a proved first-ever installation with no prior Staging state, current backup, previous image, and previous manifest may be `NOT_APPLICABLE_WITH_JUSTIFICATION`. The approved rollback target is then the empty baseline: remove only exact Phase 2C.5B-owned runtime resources, restore or remove the dedicated pre-migration database according to the approved first-install backup decision, revoke access, and verify that no listener, container, network, volume, or storage object owned by the failed install remains. This exception is not available until target ownership and empty-baseline evidence are proved.

## Stop and rollback triggers

| Trigger | Immediate action | Required recovery evidence |
| --- | --- | --- |
| Target identity or production-separation mismatch | Stop before mutation | No remote state changed |
| Image digest/label mismatch | Reject image | Approved digest remains active |
| Migration failure | Stop app promotion; preserve logs; invoke DB recovery decision | Backup identity and migration state verified |
| Container/readiness failure | Stop promotion | Previous digest restored and healthy |
| Security/privacy/SEO failure | Remove candidate from access | Correct prior runtime restored |
| Functional, bilingual, motion, or accessibility Smoke failure | Stop acceptance | Previous digest restored and Smoke baseline rechecked |
| Resource or log threshold breach | Stop promotion | Resource state and health recovered |

## Directed rollback

1. Freeze further deploy/migration/seed actions.
2. Capture only approved, redacted failure metadata.
3. Reconfirm rollback authority and the dedicated target identity.
4. Restore the previous immutable application digest and previous Compose manifest.
5. For a database-affecting failure, use the approved backup/restore runbook; do not invent down migrations.
6. Restore the previous isolated Staging storage references if they changed.
7. Recheck health, readiness, logs, formal routes, access protection, and production separation.
8. Record elapsed time, residual resources, and final disposition.

Production resources must never be used as a rollback source. Production seed is prohibited. Failure must not be hidden by continuing to subsequent gates. No concrete rollback command is executable until a dedicated target, operators, backup identities, and time limits are supplied and approved.

A desktop rollback rehearsal is planning evidence only. It cannot set runtime rollback acceptance to PASS; an authorized runtime drill or first-install empty-baseline teardown must be observed.

```text
STAGING_ROLLBACK_STATUS=MISSING_TARGET_INPUTS
ROLLBACK_PLAN_STATUS=DEFINED_NOT_APPROVED
ROLLBACK_EXECUTED=NO
```
