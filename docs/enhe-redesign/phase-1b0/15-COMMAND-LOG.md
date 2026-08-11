# Phase 1B.0 read-only command log

All commands below were run from `C:\Users\HU\Documents\New project 2\.worktrees\redesign-typeshare-v1` unless a different path is stated. Exit codes are recorded as observed. Outputs contain no secret values or complete private delivery addresses.

## Baseline and source evidence

| command/action | exit/result |
|---|---|
| `Get-Location; git branch --show-current; git rev-parse HEAD; git status --short --branch; git status --porcelain; git log --oneline -8` | 0; path and branch matched; `START_HEAD=ef9465b8c8b5010233f0117f5456bce347d499a4`; starting worktree clean |
| read the required Phase 0/1A and Phase 1B gate documents, CSVs, scripts, `package.json`, `tsconfig.json`, and relevant source references | 0; read-only |
| `git worktree list`, `git show`, `git ls-tree`, `git log --all -- <path>`, and SHA-256 metadata checks for candidate refs | 0; no checkout, fetch, copy, or source write |
| read-only status check of `C:\Users\HU\Documents\New project 2` | 0; 375 rows (`M=122`, `D=1`, `??=252`), matching the preflight count; no write |

## R-006 V2

| command/action | exit/result |
|---|---|
| PowerShell parse of `tools/collect-public-url-baseline-v2.ps1` | 0; `AllowAutoRedirect` syntax and handler parse successfully |
| `powershell -ExecutionPolicy Bypass -File tools/collect-public-url-baseline-v2.ps1 -MaxConcurrency 1 -DelayMilliseconds 350` | 0; sitemap 200, 528 sitemap URLs, 24 core memberships, 534 union rows, 0 fetch errors |
| V2 collection assertions over `03-R006-PUBLIC-URL-BASELINE-V2.csv` | 0; initial 301=1, initial 302=0, final 200=529, final 404=5; six core-only URLs were actually requested |
| read-only reconciliation of V2 public rows against the local route inventory | 0; `04-R006-DIFF-V2.csv` has 549 rows: MATCHED=493, CODE_PRODUCTION_DRIFT=25, CONTENT_LANGUAGE_MISMATCH=8, LANGUAGE_PARTNER_MISSING=2, CORE_REDIRECT=1, CORE_404=5, LOCAL_ONLY=15 |

Observed collection timestamp: `2026-08-10T20:33:31.1130635Z`; sitemap SHA-256: `9597C70AC8A859FDFB434DAC3FA835EC6CC0E6C4689579324DF65EFD29522C4B`.

## Production and source gates

| command/action | exit/result |
|---|---|
| `tools/collect-production-fingerprint-readonly.ps1` with no alias | 0; `PRODUCTION_ACCESS_STATUS=UNAVAILABLE`, `PRODUCTION_FINGERPRINT_STATUS=BLOCKED`, `SSH_ATTEMPTED=NO` |
| fresh parse/run of `tools/reconcile-source-baseline.ps1` | 0; `ROWS=4`, `OTHER_REF_COUNT=58`, `AUTHORITATIVE_SOURCE_BASELINE=BLOCKED`; `normalizeMediaSrc` is reported as definition-missing/reference-present on redesign and feature |
| fresh parse/run of `tools/join-exposure-file-hashes.ps1` without production metadata | 0; `ROWS=18`, `HASH_MATCHES=0`, external=2, parser-false-positive=1, unknown=15 |
| read-only R-008 source/test comparison | 0; redesign is loader-negative, local main/old positive contract is loader-positive; `R008_INTEGRATION_STATUS=BLOCKED_PRODUCTION_BASELINE` |

## R-001 and build/test evidence

| command/action | exit/result |
|---|---|
| static SQL gate for `08-R001-FILE-METADATA-V2.sql` | 0; read-only transaction, pgcrypto availability gate, separate URL/path/effective hashes, no raw-address output column, no DDL |
| `Import-Csv` structural and field assertions for all four Phase 1B.0 CSV files | 0; baseline=534, diff=549, provenance=4, exposure=18; all exposure hashes are 64-hex and allowed classifications only |
| secret/private-value and URL-host scan of the output directory | 0; no private-key/API-key/token/database-URL value; all emitted URL hosts are the public ENHE origin; collected URLs contain no query/signature parameters |
| `git diff --check` and scoped `git diff --exit-code` checks for Phase 1A input, old Phase 1B gates, `src`, `prisma`, and package configuration | 0; no tracked changes outside the new Phase 1B.0 directory |
| full test/typecheck/build commands | not rerun in Phase 1B.0; latest committed evidence is recorded in `12-TEST-SIDE-EFFECT-REPORT.md`; the known `tmp-ebos-optimized-redeploy-test` side effect was not repaired |

## Delivery commands

The following exact commands are the only state-changing Git actions authorized by the Phase 1B.0 contract; they were executed after the checks above and their final exit/status is reported in the task receipt:

```text
git add -- docs/enhe-redesign/phase-1b0
git commit -m "docs(audit): reconcile production baseline and public exposure evidence"
```

No `git add .`, push, fetch, checkout, switch, merge, rebase, reset, restore, clean, stash, deployment, database write, payment, refund, OAuth, or production mutation was run.
