# Test and build receipt

## Application checks

| Command/check | Result |
| --- | --- |
| Focused redesign suite, 7 files | 49 passed |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm test` — run 1 | 445 files passed, 9 existing Postgres files conditionally skipped; 2154 passed, 90 skipped |
| `npm test` — run 2 | 445 files passed, 9 existing Postgres files conditionally skipped; 2154 passed, 90 skipped |
| `npm test -- --sequence.shuffle --sequence.seed=21101` | 445 files passed, 9 existing Postgres files conditionally skipped; 2154 passed, 90 skipped |
| `git diff --check` | PASS |

The skipped files are the repository's `.postgres.test` files, which self-skip when no test database is configured. No manual skip, retry, serial-worker, reduced-worker, or timeout option was supplied. The full suite also emitted expected test-local warnings for missing Baidu token and SMTP configuration; their assertions passed.

## Docker Linux-engine gate

Docker Desktop Linux engine was available (`desktop-linux`, client/server 29.7.2). The disposable validation database used `postgres:16-alpine`, a container tmpfs for PostgreSQL data, no host mount, and no host network. It was removed by exact container name after the run; no persistent database was used.

The build script produced:

- `TEMP_DB_READY=PASS`
- `MIGRATION_DIRECTORY_COUNT=49`
- `MIGRATION_DEPLOY=PASS`
- `BUILD=PASS`
- `BROWSER_ACCEPTANCE=PASS`
- standalone `/`, `/en`, `/robots.txt`, `/sitemap.xml`: `200`
- standalone `/redesign-preview/home`, `/redesign-preview/shell`, `/redesign-preview/software`, `/__redesign-preview/shell`: `404`
- `STANDALONE=PASS`
- final container listing: no `enhe-phase2c11-build-*` container remained

Next emitted a non-blocking workspace-root warning because the repository and worktree both have lockfiles. No production deployment or remote operation was performed.

