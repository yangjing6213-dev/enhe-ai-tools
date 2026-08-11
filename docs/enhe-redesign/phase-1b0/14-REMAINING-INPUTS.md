REMAINING_INPUT_STATUS=OPEN
PRODUCTION_FINGERPRINT_STATUS=BLOCKED
AUTHORITATIVE_SOURCE_BASELINE=BLOCKED
R001_PRODUCTION_FILE_METADATA=BLOCKED
P0_CONTAINMENT_REQUIRED=YES

# Remaining Phase 1B inputs and operator handoff

Only inputs that are still missing are listed below. Phase 1B.0 already completed the public URL V2 collection and classified the two external-source rows and one parser false positive; those steps do not need to be repeated unless production changes.

## Required inputs

| priority | owner | missing input | safe handoff | closure check |
|---:|---|---|---|---|
| P0 | release operator | current production Git SHA or immutable image digest, clean state, OCI revision/created time, Next BUILD_ID, route-manifest hash, Compose/Nginx hashes, and migration status | use the fixed read-only fingerprint tool with an already documented non-interactive SSH alias | output maps the running build to one source ref and contains no environment/config bodies or credentials |
| P0 | database operator | complete production File inventory, including separate `file_url_sha256`, `file_path_sha256`, and `effective_address_sha256` values plus permitted tool/storage/status/paid flags | run `08-R001-FILE-METADATA-V2.sql` with an approved read-only role; return hash/flag columns only | all metadata rows parse; no raw address, key, signature, user, order, payment, or file body is present |
| P0 | storage and content owners | disposition of the 15 `UNKNOWN_REQUIRES_OWNER` hashes | review `09-R001-EXPOSURE-CLASSIFICATION.csv` joined to the hash-only File export | every hash has an allowed classification, owner, action, and verification result |
| P0 | storage/web operators | ACL, signed-link TTL, cache category, and `/uploads`/`/api/uploads` proxy behavior for every matched object class | policy summary/config hash plus anonymous metadata-only checks | paid/legacy objects are access-controlled; public items are explicitly allowlisted; required caches are verified after authorized action |
| P1 gate | SEO/content owner | disposition of five core 404s, the `/online-tools` 301, the original 32 drift paths, two missing language partners, eight language mismatches, and 15 local-only patterns | review `02-R006-COLLECTOR-V2-REPORT.md` and `04-R006-DIFF-V2.csv`; use public paths only | every conflict is marked keep, redirect, create, remove, expected local-only, or repair with an owner and verification check |
| P1 gate | release/integration owner | production-backed authoritative source selection and R-008 integration baseline | reconcile the production fingerprint with redesign, local main, feature, existing refs, and route/build hashes | authoritative source is confirmed; loader contract and tests agree on that baseline while `AnalyticsTracker` remains |
| P1 gate | implementation owner | recoverable typecheck/build/test baseline on the selected source | reconcile the four missing source/fixture items from tracked refs; never copy dirty untracked worktree files as authority | typecheck, build, lint, focused R-008 test, and full test pass on a clean worktree |
| P1 maintenance | test owner | isolation and cleanup for `tmp-ebos-optimized-redeploy-test` | replace `process.cwd()` output with a unique system temporary directory and guaranteed cleanup in the later authorized fix | focused test leaves no repository-root directory before or after success/failure |
| separate gate | commerce owner | payment, order, refund, OAuth, entitlement, and transaction readiness evidence | run a separately authorized commerce/security gate | explicit approval and independent tests; Phase 1A design approval is not authorization |

## Authorized read-only command handoff

The release operator may run the following only when `<documented-alias>` already exists, is documented for the production host, and works non-interactively. A literal host, password prompt, or newly supplied private key is not an acceptable substitute.

```powershell
$documentedAlias = "<documented-alias>"
& .\docs\enhe-redesign\phase-1b0\tools\collect-production-fingerprint-readonly.ps1 `
  -SshAlias $documentedAlias `
  -DocumentedAliasConfirmed
```

The database operator runs the SQL through an approved preconfigured `psql` service/profile; the command log must not include a connection string. If the resulting export contains only the permitted hash/flag columns, the local classification join is:

```powershell
$hashOnlyMetadataCsv = "<hash-only-file-metadata.csv>"
& .\docs\enhe-redesign\phase-1b0\tools\join-exposure-file-hashes.ps1 `
  -MetadataCsv $hashOnlyMetadataCsv
```

Placeholders above are handoff labels, not values to commit. Operators must not paste secrets, complete private addresses, object keys, signed query values, database URLs, or production file contents into the repository or task transcript.

## Inputs not requested from the user

- No secret, private key, password, database connection string, complete delivery URL, object key, or signed query value is requested.
- No production deploy, restart, reload, pull, build, migration, seed, payment, refund, OAuth, or content publication is authorized by this handoff.
- No branch fetch, checkout, merge, rebase, or dirty-worktree file copy is needed to provide the missing evidence.

The P0 rows are necessary but not sufficient; the P1 gate rows must also close. Until then, `PHASE_1B_PUBLIC_SHELL_STATUS=NOT_READY`, `PHASE_1B_PRODUCT_DETAIL_STATUS=NOT_READY`, and `PHASE_1B_OVERALL_STATUS=NOT_READY` remain mandatory.
