# Full-Suite Stability

`npm ci` completed successfully with 622 packages installed.

| Gate | Runs | Result per run |
| --- | ---: | --- |
| `npm run lint` | 1 | PASS, 0 errors |
| `npm run typecheck` | 1 | PASS |
| default `npm test` | 2 | 454 files passed, 9 skipped; 2217 tests passed, 90 skipped |
| shuffled suite, seed `21101` | 1 | 454 files passed, 9 skipped; 2217 tests passed, 90 skipped |

The skipped PostgreSQL-dependent cases were the existing conditional 9-file/90-test set; Phase 2C.3B added no skip. No worker reduction, forced serial mode, global timeout increase, or failure suppression was used.

`LINT_ERRORS=0`

`TYPECHECK=PASS`

`PHASE_2C3B_DEFAULT_FULL_SUITE_PASSED=2/2`

`PHASE_2C3B_SHUFFLED_FULL_SUITE_PASSED=1/1`

`SHUFFLE_SEED=21101`
