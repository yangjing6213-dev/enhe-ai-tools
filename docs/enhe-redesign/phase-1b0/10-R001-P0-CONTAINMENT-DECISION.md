R001_EXPOSURE_CLASSIFICATION_STATUS=PARTIAL
R001_PRODUCTION_FILE_METADATA=BLOCKED
P0_CONTAINMENT_REQUIRED=YES
REASON=UNKNOWN_REQUIRES_OWNER_PRESENT

# R-001 P0 containment decision

## Verified classification baseline

`09-R001-EXPOSURE-CLASSIFICATION.csv` retains all 18 observations as SHA-256 values. Production File metadata was not available, so every row has `production_file_match=NO_METADATA`; paid, free, ownership, and entitlement state were not inferred.

| evidence class | count | current classification |
|---|---:|---|
| permanent cloud-share address | 8 | `UNKNOWN_REQUIRES_OWNER` |
| COS archive address | 1 | `UNKNOWN_REQUIRES_OWNER` |
| COS media address | 6 | `UNKNOWN_REQUIRES_OWNER` |
| external archive source | 2 | `EXTERNAL_SOURCE` |
| parser false positive | 1 | `PARSER_FALSE_POSITIVE` |
| confirmed paid delivery leak | 0 | none confirmed |
| confirmed legacy delivery leak | 0 | none confirmed |
| confirmed free public resource | 0 | none confirmed |
| confirmed public-media allowlist item | 0 | none confirmed |
| unclassified observations | 15 | `UNKNOWN_REQUIRES_OWNER` |

The 18 hash-only observations occur on seven public pages; the 15 owner-required observations occur on six pages. The two external sources and one parser false positive are classified from existing public evidence and are not counted as delivery leaks.

## Decision

`P0_CONTAINMENT_REQUIRED=YES` is triggered by the 15 `UNKNOWN_REQUIRES_OWNER` rows. This is a fail-closed containment gate, not a claim that 15 paid packages were exposed. There is currently no evidence-backed paid/free split.

No production address, object, cache entry, page, database row, or entitlement was changed in Phase 1B.0. Containment remains required until the hash-only owner mapping is complete and any resulting production action is separately authorized and verified.

## Authorized containment handoff

1. A database operator runs `08-R001-FILE-METADATA-V2.sql` with an approved read-only role and exports only its hash/flag metadata. The query must remain inside its read-only transaction and must not enable `pgcrypto`.
2. If `pgcrypto` is unavailable, stop with `R001_METADATA_QUERY_STATUS=BLOCKED` and `REASON=PGCRYPTO_NOT_AVAILABLE`; do not emit raw addresses as a fallback.
3. Join the operator-produced metadata to the 18 observed hashes with `tools/join-exposure-file-hashes.ps1`. The handoff file must not contain raw URL, path, object-key, signature, credential, user, order, or payment fields.
4. The storage and content owners classify each of the 15 unresolved hashes as one allowed class: `PUBLIC_MEDIA_ALLOWLIST`, `FREE_PUBLIC_RESOURCE_INTENTIONAL`, `PAID_DELIVERY_LEAK`, `LEGACY_DELIVERY_LEAK`, or `UNKNOWN_REQUIRES_OWNER`.
5. Any paid or legacy delivery finding requires a separately authorized removal of public presentation, entitlement-safe delivery, and cache/storage containment. Intentional public media or free resources require an explicit owner allowlist and policy record.
6. After authorized remediation, repeat anonymous HTML/RSC and metadata-only checks and verify the same hashes are absent, access-controlled, or explicitly allowlisted. Do not download package bodies.

## Closure conditions

This P0 gate closes only when production File metadata has been joined, all 15 owner-required rows have an approved disposition, every required containment action has independent evidence, and the anonymous re-scan passes. Until then, product-detail/download and overall Phase 1B readiness remain blocked.
