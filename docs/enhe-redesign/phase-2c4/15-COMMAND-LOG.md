# Command Log

Commands are summarized without credentials, environment values, host details, or database URLs.

1. Verified source/RC branch names, HEAD/tree, clean state, history, D4R commit scopes, and isolated worktree registration.
2. Validated the D4R ZIP path, size, SHA-256, path safety, CRC, counts, and clean-checkout byte correspondence.
3. Recorded package, lockfile, Dockerfile, Next config, Prisma schema, migration-tree, and production-source hashes.
4. Performed tracked staging-target discovery and filename-only environment classification.
5. Ran `npm ci`; package and lockfile remained unchanged.
6. Ran lint, typecheck, focused Vitest, two default full suites, and one seeded shuffled full suite.
7. Started Docker Desktop once; recorded baseline resource sets; created one labeled PostgreSQL tmpfs container.
8. Ran 49 migrations and status checks. No production seed or source was used.
9. Ran the production build and validated generated standalone/public/static assets.
10. Initial standalone probe failed formal pages because the temporary auth input was missing; corrected process input only and reran.
11. Initial reused-server Playwright run produced 180 pass / 5 fail because of one harness flag and an empty disposable catalog; created 25 local fixtures, passed a 7-case rerun, then passed 185/185 fresh.
12. Ran static/public HTML, formal/preview route, SEO/JSON-LD, no-JS, bundle, overflow, error, and media audits.
13. The temporary HTML audit first failed CJS parsing, then used two invalid `/zh*` assumptions; corrected the diagnostic wrapper and routes without changing product code.
14. Captured and visually inspected 8 PNGs; probed and frame-inspected 2 WebM files.
15. Stopped standalone, removed the only gate container, matched pre-start Docker resource hashes, stopped Docker Desktop once, and confirmed zero Docker-owned processes.
16. Removed `.next`, test results, diagnostics, extracted ZIP files, and all process-only environment state.
17. Prepared only Phase 2C.4 documentation/media for exact-path staging.

No deploy, push, tag, remote modification, production database access, publication, payment, download, OAuth, or product-data mutation command was run.

`DEPENDENCY_BOOTSTRAP_ACTION=NPM_CI`

## Sanitized fresh-result transcript

The following values were copied from this Phase 2C.4 run's command outputs. Only credential-bearing process inputs were omitted.

```text
LINT_EXIT=0
TYPECHECK_EXIT=0
FOCUSED_VITEST=5_FILES_36_PASSED_0_FAILED
DEFAULT_FULL_1=458_FILES_PASSED_9_SKIPPED_2245_TESTS_PASSED_90_SKIPPED_0_FAILED_34.46S
DEFAULT_FULL_2=458_FILES_PASSED_9_SKIPPED_2245_TESTS_PASSED_90_SKIPPED_0_FAILED_28.42S
SHUFFLE_SEED_21101=458_FILES_PASSED_9_SKIPPED_2245_TESTS_PASSED_90_SKIPPED_0_FAILED_28.85S
PLAYWRIGHT_INITIAL_REUSED_SERVER=180_PASSED_5_FAILED
PLAYWRIGHT_TARGETED_AFTER_HARNESS_FIX=7_PASSED_0_FAILED
PLAYWRIGHT_FRESH_STANDALONE=185_PASSED_0_FAILED_2_WORKERS_0_RETRIES
MIGRATION_DEPLOY=49_APPLIED
MIGRATION_STATUS=SCHEMA_UP_TO_DATE
BUILD_ID=XW2sFw32Br7G9npwDuTIT
BUILD_STATIC_PAGES=119_OF_119
BUILD_DURATION_MS=156598
STANDALONE_STATIC_COPY=228_OF_228_HASH_MATCH
STANDALONE_PUBLIC_COPY=491_OF_491_HASH_MATCH
FORMAL_ROUTE_200=6
PREVIEW_ROUTE_404=4
DOCKER_PRE_POST_CONTAINERS=0_MATCH
DOCKER_PRE_POST_VOLUMES=38_MATCH
DOCKER_PRE_POST_NETWORKS=3_MATCH
DOCKER_PRE_POST_IMAGES=1_MATCH
SCREENSHOTS=8
VIDEOS=2
MEDIA_BAD=0
MEDIA_DUPLICATE_HASHES=0
FINAL_STANDALONE_LISTENER_COUNT=0
FINAL_DOCKER_OWNED_PROCESS_COUNT=0
```
