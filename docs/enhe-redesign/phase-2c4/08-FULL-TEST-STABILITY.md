# Full Test Stability

## Static and unit gates

- Lint: pass.
- Typecheck: pass.
- Focused Vitest: 5 files, 36 tests passed.
- Default full run 1: 458 files passed, 9 skipped; 2245 tests passed, 90 skipped; 0 failed; 34.46 s.
- Default full run 2: same counts; 0 failed; 28.42 s.
- Shuffled full run, seed 21101: same counts; 0 failed; 28.85 s.
- New skips: 0.

Expected fail-closed test stderr for absent Baidu/SMTP credentials was observed; it did not perform publication or hidden network work.

## Production browser gate

The first reused-server Playwright run was not treated as a pass: 180 passed and 5 failed. One failure came from a harness flag set to 0 instead of 1; four software/support checks lacked the disposable 25-record catalog. No production source was changed. After adding only local tmpfs fixtures and correcting the process flag, a focused rerun passed 7/7, then a fresh Playwright-managed standalone run passed 185/185 with 2 workers and 0 retries.

Two earlier standalone diagnostics are also retained: the first production start lacked a minimum-length process-only auth value and formal pages returned 500; a later temporary HTML audit initially used invalid `/zh*` assumptions. Both were harness/input errors, corrected without changing product code.

- `RC_FOCUSED_TESTS=PASS`
- `DEFAULT_FULL_SUITE_PASSED=2/2`
- `SHUFFLED_FULL_SUITE_PASSED=1/1`
- `SEED=21101`
- `RC_BROWSER_MATRIX_FAILED=0`
