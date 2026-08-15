# Test, build, and standalone receipt

Status: PASS

## Application checks

| Gate | Result |
| --- | --- |
| Focused copy/shell group | 7 files / 50 tests PASS |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| Counted default full suite 1 | 446 files passed, 9 skipped; 2164 tests passed, 90 skipped |
| Counted default full suite 2 | 446 files passed, 9 skipped; 2164 tests passed, 90 skipped |
| Shuffle seed `21101` | 446 files passed, 9 skipped; 2164 tests passed, 90 skipped |
| Fresh R-008/Heartbeat/Writer group | 5 files / 29 tests PASS |
| `git diff --check` | PASS |

No worker reduction, forced serialization, global timeout increase, retry, or new skip was used. The 9 skipped files / 90 skipped tests are the repository's existing PostgreSQL-conditional tests.

## Non-counting diagnostic attempt

An earlier default full-suite attempt overlapped an independent code-review process and ended with three unrelated 5000ms timeouts. Those three files immediately passed together under unchanged default configuration (3 files / 16 tests), after which both counted default suites and the shuffled suite passed. The verified facts are the timeout pattern, isolated pass, and three subsequent full passes; resource contention is the most plausible explanation, not a directly measured certainty. The failed attempt was not counted and was not hidden.

Expected test-local stderr for missing Baidu submission token and unavailable SMTP was emitted by assertions designed for those conditions; all associated tests passed.

## Disposable Docker gate

| Item | Result |
| --- | --- |
| Docker context | `desktop-linux` |
| Client/server | 29.7.2 / 29.7.2 |
| Image | `postgres:16-alpine` |
| Network exposure | loopback-bound random host port only |
| Data | container tmpfs, no named volume, no host mount |
| Migration directories | 49 |
| `prisma migrate deploy` | PASS, all 49 applied |
| `prisma migrate status` | schema up to date |
| Seed | NOT RUN |
| Container cleanup | PASS, exact container absent afterward |

Only process-level temporary database variables and a non-production temporary auth value were used. No `.env` was read or created, and no credential or connection string is stored in this evidence package.

## Production build

`npm run build` passed: Prisma client generation succeeded, Next compiled successfully, type validity passed, 118 static pages were generated, and build traces completed. Next emitted the known non-blocking multiple-lockfile workspace-root warning; no lockfile was changed.

## Traced standalone

The traced server at `.next/standalone/.worktrees/enhe-production-wiring-v1/server.js` was started after copying generated public/static assets into its traced root.

| Route | Status |
| --- | ---: |
| `/` | 200 |
| `/en` | 200 |
| `/robots.txt` | 200 |
| `/sitemap.xml` | 200 |
| `/redesign-preview/home` | 404 |
| `/redesign-preview/shell` | 404 |
| `/redesign-preview/software` | 404 |
| `/__redesign-preview/shell` | 404 |

Standalone HTML contained exact production navigation and verified filing values. It contained no generic filing phrase, ByteDance loader, `fileUrl`, `filePath`, or permanent archive/executable download link. Source regression confirms `<AnalyticsTracker />` remains in `root-layout-shared.tsx`.
