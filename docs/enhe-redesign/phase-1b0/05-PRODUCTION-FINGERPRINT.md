PRODUCTION_ACCESS_STATUS=UNAVAILABLE
PRODUCTION_FINGERPRINT_STATUS=BLOCKED
REASON=NO_PRECONFIGURED_READONLY_ACCESS
PRODUCTION_GIT_SHA=UNKNOWN_CURRENT
PRODUCTION_IMAGE_DIGEST=UNKNOWN
PRODUCTION_MIGRATION_STATUS=UNKNOWN

# Production fingerprint collection

## Discovery result

The tracked deployment documentation and scripts were searched read-only. There is no documented `Host` declaration, `BatchMode` command, or `ConnectTimeout` command for a production alias. The only concrete deployment host reference is a mutable deployment script that requires a private key and runs `git pull`/deployment operations; it is not a safe read-only connection method and was not invoked. No SSH attempt was made.

The prior Phase 1B fingerprint helper only performed an anonymous HTTP HEAD probe and explicitly left Git/image/migration/route/file fields unavailable. It cannot be promoted to a production fingerprint.

## Historical but non-authoritative evidence

`reports/ebos/deployment/execution/command-results/2026-07-03-server-deployment-result.json` contains an operator-reported July candidate SHA `f3500ddf45a65211b017930b48324659ca1795a6` (commit timestamp `2026-07-05T16:58:00+08:00`). The report does not provide an immutable image digest, route-manifest hash, migration version, Compose/Nginx hashes, or current read-only host output. It is retained as `HISTORICAL_OPERATOR_REPORTED_SHA`, not as current production truth.

## Safe operator path

`tools/collect-production-fingerprint-readonly.ps1` is an operator-executable, fixed read-only command pack. It requires an already documented alias and an explicit confirmation switch before attempting:

```text
ssh -o BatchMode=yes -o ConnectTimeout=10 -o StrictHostKeyChecking=yes <existing-documented-alias>
```

The command set emits only tagged Git, clean-state, image ID/digest, OCI revision/created time, Next BUILD_ID, manifest/config hashes, route-key counts/hashes, and a non-credential migration status. It refuses literal hosts and does not print `env`, `.env`, inspect JSON, Compose/Nginx bodies, database URLs, secrets, or file contents.

Until an authorized operator runs it against the correct production host, `PRODUCTION_FINGERPRINT_STATUS=BLOCKED` remains mandatory.
