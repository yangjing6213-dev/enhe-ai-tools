# Phase 1B.2.3 baseline test failure root cause

## Common baseline

```text
INTEGRATION_BRANCH=codex/enhe-phase1b-integration-3497d170
START_HEAD=ec3dde6f84303cca0911ae095b39fbd76d7ae750
START_WORKTREE_CLEAN=YES
TYPECHECK_BEFORE_FIXES=PASS
SEED_DIFF_EXIT=0
SEED_HEAD_BLOB=14db43f7aef16cb5a1a546a8d27b66e837552a60
SEED_WORKTREE_BLOB=14db43f7aef16cb5a1a546a8d27b66e837552a60
SEED_GIT_EQUIVALENCE=PASS
```

The two existing failures were reproduced independently before any source edit. Both were test determinism defects: the deployment test assumed LF-only service delimiters, while the SEO audit test allowed two assertions to use the wall clock against a fixed expiry date. Neither failure established a missing production source, missing deployment contract, Prisma defect, network dependency, or database defect.

## Confirmed outcomes

| target | RED | confirmed root cause | changed surface | GREEN | commit |
|---|---|---|---|---|---|
| `src/lib/deploy-config.test.ts` | 12 passed, 1 failed | `DEPLOY_TEST_ENVIRONMENT_DEPENDENT` — LF-only service block extraction against a CRLF checkout | test only | 13 passed | `264aed53f3839f8b679f9f31268b21b0fa1b9af5` |
| `src/lib/seo-audit/public-api.test.ts` | 6 passed, 1 failed | `OTHER_CONFIRMED_ROOT_CAUSE` — recheck test clock not pinned | test only | 7 passed | `44024d555ddbabd3d431379a337e7eb99d516b4e` |

No production Compose file, deploy script, SEO audit implementation, fixture, adapter, Prisma path, lockfile, environment file, database, production runtime, or remote was changed by either fix.

## Final baseline status

Both original non-Prisma failures are closed. The authoritative baseline later stopped at `npm run build`: Next.js compilation and type validation succeeded, but static-page collection attempted Prisma reads without `DATABASE_URL` and failed before a database connection could be made. Under the Phase 1B.2.3 gate this is a blocking environment precondition, so R-008 and the public-shell planning sections were not started. Full evidence is recorded in `17-COMMAND-LOG.md`, `16-PHASE-1B2-READINESS.md`, and `18-FINAL-RECEIPT.md`.
