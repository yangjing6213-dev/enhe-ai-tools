# User Staging Input Checklist

Phase 2C.5A found no dedicated target. The following inputs are required before an approval phrase can exist.

## Can be confirmed in chat

- Whether an independent Staging server/VM already exists.
- Whether a dedicated Staging domain is planned and who owns DNS/TLS changes.
- Data mode: recommended `SANITIZED_PUBLIC_FIXTURES`, or separately reviewed sanitized public copy.
- Object-storage isolation mode: dedicated bucket or dedicated prefix.
- Payment policy: disabled or sandbox.
- OAuth policy: disabled or dedicated test app.
- SMTP policy: disabled or mail sink.
- Analytics policy: disabled or dedicated Staging property.
- Whether webhooks, imports, schedulers, and background workers remain disabled.
- Access mode: Basic Auth or IP allowlist.
- Maintenance window, target owner, deployment operator, rollback operator, Smoke owner, and final acceptance owner.
- Rollback time limit and health-failure threshold.

## Must be provided only through local secure configuration

Provide references, not values, for the SSH host alias, SSH user, identity file, Staging environment secrets, database password, object-storage credential, registry credential, and Basic Auth credential. Phase 2C.5B may read only the authorized references needed for execution; secret values must never be copied into chat, Git, the approval package, command output, or logs.

## Required local non-secret metadata

- Normalized candidate identity metadata sufficient to create `STAGING_CANDIDATE_ID`.
- Dedicated host fingerprint hash.
- Host/VM resource limits and isolated runtime layout.
- Dedicated domain/TLS and access-control plan.
- Database, storage, logs, health/readiness, backup, and rollback metadata.
- Staging-only registry namespace or approved OCI archive transfer mode.

```text
USER_INPUT_STATUS=REQUIRED
PHASE_2C_5A_NEXT_ACTION=USER_PROVIDES_DEDICATED_STAGING_TARGET_INPUTS
```
