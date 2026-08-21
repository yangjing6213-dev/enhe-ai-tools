# Full Test Stability

## Static gates

- `npm run lint`: pass.
- `npm run typecheck`: pass.
- `git diff --check`: pass.
- D4R focused tests: pass.

## Full Vitest suites

Each run reported 458 passed files and 9 pre-existing skipped files; 2245 passed tests and 90 pre-existing skipped tests.

| Run | Configuration | Result |
| --- | --- | --- |
| Default 1 | Repository defaults | PASS |
| Default 2 | Repository defaults | PASS |
| Shuffle | Seed `21101` | PASS |

- `DEFAULT_FULL_SUITE_PASSED=2/2`
- `SHUFFLED_FULL_SUITE_PASSED=1/1`

No worker reduction, forced serial execution, global-timeout increase, new skip, deleted D4 test, or weakened geometry/SSR assertion was used.

## Browser suites

- Development acceptance: 181/181 passed.
- Production Standalone acceptance plus performance: 185/185 passed in 5.4 minutes.
