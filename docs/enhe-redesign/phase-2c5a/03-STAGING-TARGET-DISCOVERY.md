# Dedicated Staging Target Discovery

## Method and evidence boundary

Discovery was local and read-only. It covered tracked deployment files, scripts, README files, Dockerfiles, Compose/Nginx material, required redesign/operations documentation, and tracked PowerShell definitions. No active environment body, credential, private key, Docker credential, SSH agent, remote system, database, object storage, registry, or cloud API was read.

The complete operations/configuration scan covered 205 tracked text files, 964483 bytes, and 20197 lines. The aggregate scan SHA-256 was `a88cbe692df03c8e69318cc81c935a445f5bf2d18a2302e901820e6361a1652c`. One tracked environment template was identified by filename and its body was deliberately skipped.

Eight non-document keyword matches were inspected as metadata. They were color names, local-development wording, visual-stage terminology, or EBOS workflow wording; none supplied a dedicated host/VM, domain, database, storage boundary, HTTPS configuration, access control, health check, logs, rollback authority, or Staging approval target.

The incomplete requirement reference is independently anchored without treating it as a candidate:

| referenceIdHash | sourceFile | sourceLine | referenceStatus |
| --- | --- | ---: | --- |
| `009021492a1ef30519698feaad4a75aa70e96f536c5ee956e8bbd44cc8207342` | `docs/enhe-redesign/phase-2c4/release-candidate-manifest.json` | 29-31 | `TRACKED_REFERENCE_INCOMPLETE` |

## Production exclusion anchor

```text
PRODUCTION_CONNECTION_CANDIDATE_ID=415a2c4d69ae288959439f1f4f1b323f1365e6bd6054dc0814ce41799e32bcb1
PRODUCTION_HOST_FINGERPRINT_HASH=NOT_AVAILABLE_NOT_TRACKED
PRODUCTION_RUNTIME_SHA=3497d1709a80b9c5a69d8c1b9eab41af2832f50f
```

The production-only connection reference has no staging/test marker and is explicitly excluded. It is not counted as a Staging candidate and must not be reused as one. No clear host, address, user, port, identity path, domain, connection string, bucket, or registry location is recorded here.

| candidateIdHash | sourceFile | sourceLine | candidateType | dedicatedHostClaim | dedicatedDomainClaim | dedicatedDatabaseClaim | dedicatedStorageClaim | httpsClaim | rollbackClaim | healthCheckClaim | logClaim | approvalClaim |
| --- | --- | ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `415a2c4d69ae288959439f1f4f1b323f1365e6bd6054dc0814ce41799e32bcb1` | `docs/enhe-redesign/phase-1b1/01-CONNECTION-DISCOVERY.md` | 4 | `PRODUCTION_TARGET_REJECTED` | `NO` | `NO` | `NO` | `NO` | `NO` | `NO` | `NO` | `NO` | `NO` |

## Disposition

```text
STAGING_CANDIDATE_COUNT=0
STAGING_CANDIDATE_STATUS=NO_CANDIDATE
STAGING_REFERENCE_STATUS=TRACKED_REFERENCE_INCOMPLETE
STAGING_CANDIDATE_ID=NOT_AVAILABLE_NO_CANDIDATE
STAGING_PRODUCTION_SEPARATION_STATUS=NOT_ESTABLISHED_NO_STAGING_CANDIDATE
PRODUCTION_TARGET_AS_STAGING=PRODUCTION_TARGET_REJECTED
REQUIRED_STAGING_TARGET_TYPE=DEDICATED_HOST_OR_VM
STAGING_HOST_ISOLATION_STATUS=NOT_PROVEN
DEDICATED_STAGING_TARGET_STATUS=NOT_PROVEN
STAGING_DEPLOYMENT_APPROVAL_READY=NO
PHASE_2C_5A_STATUS=COMPLETE_WITH_INPUT_REQUIRED
PHASE_2C_5A_NEXT_ACTION=USER_PROVIDES_DEDICATED_STAGING_TARGET_INPUTS
```
