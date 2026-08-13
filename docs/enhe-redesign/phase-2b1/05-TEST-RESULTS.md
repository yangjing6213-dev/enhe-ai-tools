# Test Results

All commands ran in the integration worktree after the eight cherry-picks.

| Gate | Result | Evidence |
|---|---|---|
| `npm ci` | PASS | dependencies installed; package and lockfile unchanged |
| `npm run lint` | PASS | exit 0 |
| `npm run typecheck` | PASS | exit 0; Prisma client generation completed |
| focused public-shell and technical regression set | PASS | 9 files, 66 tests passed |
| default `npm test`, run 1 | PASS | 439 files passed, 9 skipped; 2,116 tests passed, 90 skipped |
| default `npm test`, run 2 | PASS | 439 files passed, 9 skipped; 2,116 tests passed, 90 skipped |
| default `npm test`, run 3 | PASS | 439 files passed, 9 skipped; 2,116 tests passed, 90 skipped |
| shuffle seed 21101 | PASS | 439 files passed, 9 skipped; 2,116 tests passed, 90 skipped |
| shuffle seed 21102 | PASS | 439 files passed, 9 skipped; 2,116 tests passed, 90 skipped |
| shuffle seed 21103 | PASS | 439 files passed, 9 skipped; 2,116 tests passed, 90 skipped |

The suite used the repository's normal Vitest worker configuration. No worker reduction, serial mode, global timeout increase, retry, or test skip was introduced. The nine skipped files and 90 skipped tests are the repository's existing skip set and were unchanged across all runs.

The focused set covered the public-shell candidate tests plus GSC, deploy-config, SEO public API, Heartbeat contract, state writer, engine protocol, and Heartbeat integration regressions. The public-shell candidate file contains 11 passing tests, including the standalone preview root-layout regression.
