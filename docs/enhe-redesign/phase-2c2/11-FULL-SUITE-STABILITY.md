# Full-suite stability

| Gate | Result |
| --- | --- |
| npm ci | PASS; 622 packages installed from the lockfile, upstream deprecation warnings only |
| lint | PASS; changed catalog image warnings: 0 |
| typecheck | PASS |
| default full suite, run 1 | 454 files passed, 9 skipped; 2209 tests passed, 90 skipped |
| default full suite, run 2 | 454 files passed, 9 skipped; 2209 tests passed, 90 skipped |
| shuffled full suite, seed 21101 | 454 files passed, 9 skipped; 2209 tests passed, 90 skipped |

All three full runs exited 0. No worker reduction, forced serial mode, global timeout increase, new skip, or failure suppression was used. The skipped PostgreSQL suites were pre-existing opt-in suites and were not altered by this phase.

DEFAULT_FULL_SUITE_PASSED=2/2

SHUFFLED_FULL_SUITE_PASSED=1/1
