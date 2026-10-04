# ENHE GitHub and Tencent Cloud release workflow

This document must be checked against the current remote and scripts before each release. The previous instructions using `-CommitMessage`, `-RunBuild`, and `-SkipChecks` did not match `scripts/push-and-deploy.ps1` and are withdrawn.

## Fresh GitHub evidence (2026-10-03; read-only)

- A direct `git ls-remote --symref origin HEAD refs/heads/main refs/heads/codex/enhe-recovery-baseline refs/heads/codex/enhe-release-candidate-20261003` query returned `codex/ai-news-publishing-v2` as remote HEAD at `b0288210215ef0e54f39ed93d66def931d8c7af6` and `codex/enhe-recovery-baseline` at `2af4a0534add5fa3eb094a943177327f9b919ce1`. It returned no `main` or candidate branch.
- The local symbolic `origin/HEAD` is stale: it points to `origin/main` at `12503ec50069f500c52b1d7107e530627791f262`, which disagrees with the direct remote query. Use fresh remote output, not that cached symbolic ref.
- The local candidate runtime commit is `df482044266fccc6be7e3818b70c5117abc8dc38`. It is 5 commits ahead and 0 behind the existing remote recovery branch. The candidate and remote default branch have no merge base; the comparison is 629 candidate-only and 8 remote-only commits. Do not merge or deploy either history by assumption.
- The same read-only `git ls-remote` query was repeated at 2026-10-02 23:33 UTC and returned the same refs. This does not select a push target or authorize a remote write.
- This was a read-only preflight. No GitHub write occurred. Recheck the exact target branch and integration path immediately before any approved remote write.

## 2026-10-03 release-script safety correction

The previous candidate version of `scripts/push-and-deploy.ps1` performed `git push` by default; `-NoDeploy` disabled only the server deployment. The current local worktree version defaults to local checks only. `-Push` is required to fetch/push, and `-Deploy` requires `-Push`; `-NoDeploy` is valid only with `-Push`. The script was syntax-parsed and its source tests passed, but the release script itself was not run. These changes are still an uncommitted worktree overlay, not part of runtime commit `df482…`.

## What the current runner does

`scripts/push-and-deploy.ps1` requires an exact 40-character `-ReleaseRef` that equals the current `HEAD`, an explicitly named `-Branch`, a clean worktree, Git/npm/Node/Docker, and a local Docker endpoint. `DOCKER_HOST` overrides are rejected. Accepted endpoints are a local Unix socket path, Docker Desktop's local Windows engine pipe (`docker_engine`), or Docker Desktop's local Linux engine pipe (`dockerDesktopLinuxEngine`); remote TCP endpoints and named pipes containing another host are rejected before containers start. The standalone migration check repeats the same strict endpoint check so it cannot be used to bypass the wrapper. PostgreSQL Vitest suites are skipped by default because database URL variables are cleared for `npm test`. Before `next build`, both `DATABASE_URL` and `DIRECT_URL` are set to a non-secret loopback-only port-1 placeholder so Next cannot reload real database URLs from local dotenv files; any unexpected database attempt stays on `127.0.0.1` and fails locally. Caller values are restored afterward. The local runner also disables Next telemetry and uses `--pull=never` for PostgreSQL containers, so those images must already be present locally. The database-mutating Vitest suite requires the separate `-AllowDatabaseMutatingVitest` switch. `-AllowDatabaseMutatingE2E` enables the database-writing Playwright group, including `commercial-flow.spec.ts`, `public-navigation-search.spec.ts`, and `seo-audit-commercial.spec.ts`; the default database-free suite excludes those files. The commercial-flow spec additionally requires a loopback Playwright base URL with no URL credentials; malformed or remote URLs keep it skipped and its request filter rejects all requests. Any database-test switch requires a dedicated local PostgreSQL test database. The database name must contain a delimited `test` or `e2e` marker and no delimited `prod`, `production`, or `live` marker. A loopback URL alone cannot rule out an SSH port-forward to a remote database. Do not run from a machine with an SSH/local port-forward, and confirm the selected endpoint is not forwarded before starting the release workflow.

The runner executes fresh-install and selected-branch migration checks, the release-shell check, full tests, typecheck, lint, build, and end-to-end tests. The default production E2E set excludes database-writing specs and synthetic admin visual-fixture specs but keeps the signed-out admin-shell boundary test. Admin visual fixtures require a separate explicit invocation with `--config=playwright.admin-visual.config.ts`; the release runner does not select that config. Unit/integration tests use no database by default; the PostgreSQL-backed Vitest and Playwright suites run only with their separate explicit switches and a dedicated local test database. Each database-writing browser spec also keeps its own loopback and test-database-name checks.

The script does not stage or create a commit. By default it runs local checks only: it does not fetch, push, SSH, or deploy. The named branch is validated before any fetch. With `-Push`, the runner fetches `refs/heads/<Branch>` directly into `refs/remotes/origin/<Branch>`, then checks ancestry and migrations against that refreshed ref before pushing the exact release ref. Tencent Cloud deployment is enabled by `-Deploy`, which requires `-Push`; `-NoDeploy` may be used only with `-Push` for a push-only run. The script has no default branch, so the target must be named on every run.

Before any approved deployment, set the server-side `INDEXNOW_KEY` environment
value when IndexNow notifications are required. It must match the value in the
tracked public verification file `public/<key>.txt`; the application now fails
closed when the variable is absent, and it never falls back to a source-embedded
key. Do not put the value in Git, browser code, logs, or this document. The
local `.env.example` contains only an empty placeholder.

## Current local security gate (2026-10-04)

The repository contains one deliberately narrow local Gitleaks exception for
the documented SHA-256 route-fingerprint false positive:
`.gitleaksignore` has exactly one fingerprint entry for
`docs/enhe-redesign/phase-1b1/04-PRODUCTION-ROUTE-FINGERPRINT.md`, rule
`generic-api-key`, line 7. It is not a secret allowlist and must not be
expanded to a directory, rule family, or historical commit set. The current
worktree scan is therefore expected to return zero findings; the remaining
historical findings still require separate disposition and do not authorize a
push or deployment.

With `-Deploy`, the script also requires the SSH key, checks the server's operation lock and clean checkout, pushes the exact release ref, fetches and checks that same ref on the server, then runs `deploy.sh`. That script builds the release image, checks the existing database volume, stops the application writers, creates and validates a pre-migration database backup, runs `prisma migrate deploy`, restarts services, and checks health. A deployment can change production data and must use an exact reviewed commit plus the documented backup, rollback, and health gates.

## Safe stage order

1. Finish local review and validation; prepare a clean, exact release commit without touching excluded files.
2. Recheck `git ls-remote --symref origin HEAD` and all target refs. Push only the explicitly selected recovery branch after the candidate SHA and path manifest are recorded.
3. Decide how the recovery branch relates to the current remote default. The unrelated histories require an explicit integration choice before changing the default branch or creating a release branch.
4. Before Tencent Cloud deployment, verify the exact server checkout, current runtime and database backup/rollback evidence, release configuration, and health checks. Deploy only the exact approved SHA.

Do not use a copied “one-click” command or skip checks to work around a missing local test database, absent branch, dirty worktree, or failed release gate.
