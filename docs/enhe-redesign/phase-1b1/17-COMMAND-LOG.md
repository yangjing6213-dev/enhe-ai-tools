COMMAND_LOG_STATUS=COMPLETE
REMOTE_COMMAND_POLICY=FIXED_READ_ONLY
REMOTE_WRITE_COMMAND_COUNT=0
DATABASE_WRITE_COMMAND_COUNT=0
SECRET_VALUE_OUTPUT_COUNT=0
RAW_PRIVATE_ADDRESS_OUTPUT_COUNT=0

# Phase 1B.1 command log

## Logging and redaction boundary

This ledger records the commands that produced or validated the committed Phase 1B.1 evidence. Sensitive SSH parameters are represented only as `[redacted-target]` and `[redacted-identity]`; neither value is stored in this file. The connection candidate identifier is the only retained derivative of that tuple. No private-key body, secret, database connection string, raw private address, object key, source body, manifest body, or raw Nginx line was printed or persisted.

Local wrapper failures listed below occurred before the corrected command ran. They made no production request and changed no file.

## Command ledger

| ID | sanitized command or command class | exit | redacted result |
|---|---|---:|---|
| C01 | `Get-Location`; `git branch --show-current`; `git rev-parse HEAD`; `git status --short --branch`; `git status --porcelain`; `git log --oneline -8` | 0 | Expected worktree, branch, start SHA, and clean state confirmed. |
| C02 | `Get-Content` for every required Phase 0/0.5/1A/1B gate document, `package.json`, `prisma/schema.prisma`, `deploy.sh`, `Dockerfile`, and tracked deployment/Docker files | 0 | Required inputs read; `.env` and private-key content excluded. |
| C03 | `git ls-files` plus tracked-only deployment connection discovery; required `git grep` patterns included | 0 | 355 tracked files scanned; 43 matches across 16 source files; one safe candidate found in `scripts/push-and-deploy.ps1`. |
| C04 | `Test-Path -LiteralPath [redacted-identity] -PathType Leaf` | 0 | `KEY_FILE_EXISTS=YES`; file content was not opened. |
| C05 | `ssh -o BatchMode=yes -o ConnectTimeout=10 -o StrictHostKeyChecking=yes -o LogLevel=ERROR -o PasswordAuthentication=no -o KbdInteractiveAuthentication=no -o RequestTTY=no -o ClearAllForwardings=yes -o ForwardAgent=no -o ForwardX11=no -i [redacted-identity] [redacted-target] <fixed probe>` | 0 | Only `PRODUCTION_READONLY_CONNECTION=PASS` returned. |
| C06 | First fixed fingerprint script transport over the strict SSH contract | nonzero | CRLF reached remote `sh`; parser stopped at `for ... do`. No evidence artifact accepted. |
| C07 | LF/Base64 fingerprint transport with first migration-stat query | nonzero | Query lacked `FROM _prisma_migrations`; fingerprint rejected. No write occurred. |
| C08 | Corrected migration query with first nested file-hash extractor | nonzero | Multi-layer `awk` escaping produced empty Next hashes; fingerprint rejected. No write occurred. |
| C09 | `tools/collect-production-fingerprint-v3.ps1` with strict SSH options and LF/Base64 fixed script | 0 | Git/image/config/source/Next/container/migration fingerprint collected. App and DB each resolved by exact Compose service label. |
| C10 | `tools/collect-production-address-hashes-v3.ps1` with strict SSH options | 0 | Actual public-content schema mapped. `pgcrypto` absent; `psql` streamed directly into server-side `python3`; only SHA-256 and permitted metadata returned. |
| C11 | `tools/reconcile-production-source-v3.ps1` | 0 | Production source/config hashes reconciled against local refs without fetch or checkout; runtime commit matched 6/6 required source files. |
| C12 | `tools/join-r001-production-hashes-v3.ps1` | 0 | All 18 observations retained; 4 matched permitted production metadata; raw addresses were not inputs. |
| C13 | Local authoritative-route enumeration and V2-baseline reconciliation | 0 | 162 source route patterns and 601 V3 comparison rows generated; code/production drift count is zero. |
| C14 | Strict SSH fixed Nginx aggregation script, with query stripping before comparison | 0 | Two readable log files scanned; authorized old paths returned zero aggregate requests. No raw log row or request metadata left production. |
| C15 | Four-tool PowerShell AST parse plus CSV/import, schema, count, and status assertions | 0 | AST and structural checks passed; row counts were `6`, `150`, `6`, `18`, and `601`. |
| C16 | Sensitive-data scan over `docs/enhe-redesign/phase-1b1/**` | 0 | No target, public IPv4 literal, remote user, identity path, private-key marker, API/Bearer credential, database URL, raw address, or object key found. Public ENHE URLs only. |
| C17 | First local continuation inventory wrapper | 1 | Outer PowerShell expanded nested variables; parser rejected command. No file changed. |
| C18 | Corrected inventory wrapper using stop-parsing | 0 | 21 files present; `17-COMMAND-LOG.md` was the sole missing required artifact. A legacy PowerShell/.NET relative-path helper emitted non-terminating errors; count remained valid. |
| C19 | First corrected read-only safety assertion wrapper | 1 | Nested newline quoting was rejected locally. No production request and no file change. |
| C20 | Corrected read-only safety assertion wrapper | 0 | Four AST parses and all exact-label/read-only/no-mutation assertions passed. No fuzzy `docker ps ... | head -n 1` selection exists. |
| C21 | Exact Phase 1B.1 file-set check plus four-tool AST parse | 0 | Exactly 22 required files present; no extra file; all four tools parse successfully. |
| C22 | Fresh `Import-Csv`/schema/count assertions for 03, 05, 06, 07, and 11 | 0 | Row counts `6`, `150`, `6`, `18`, `601`; address hashes are 64-hex; R-001 and R-006 category counts match the evidence documents. |
| C23 | Fresh sensitive-data/object-key/private-URL scan over phase output | 0 | No secret, private key, database URL, remote tuple, identity path, raw address, object key, or public IPv4; one approved public ENHE host only. Loopback literals occur only in tool safety guards. |
| C24 | `git diff --exit-code` on protected paths; `git diff --check`; `git status --porcelain=v1 -uall`; branch/HEAD check | 0 | Protected paths unchanged; status contains only `docs/enhe-redesign/phase-1b1/**`; branch and start HEAD unchanged. |

## Production read-only statements

- Every Prisma migration query began with `BEGIN TRANSACTION READ ONLY` and ended with `ROLLBACK`.
- Schema discovery and public-content selection used read-only `SELECT`/`COPY` statements.
- Docker access was limited to `docker ps`, formatted `docker inspect`/`docker image inspect`, and read-only `docker exec` commands.
- Git access on production was limited to metadata, status category, tracked-file existence, and hashes; no diff body was emitted.
- Nginx logs were read and aggregated in memory. Query strings were removed before path comparison.

## Commands not run

No `git pull`, fetch, checkout, switch, merge, rebase, reset, restore, clean, or stash was run. No deploy, build, Compose up/down/pull/restart, container restart, Nginx reload, Prisma migrate/db push/seed, SQL mutation, payment, refund, OAuth, URL removal, file deletion, remote change, or push was run.

## Pre-commit validation

ZIP creation occurs only after the docs-only commit and therefore is not part of the committed command history; its independent size, SHA-256, path-prefix, extraction, and CRC checks are reported in the final receipt.
