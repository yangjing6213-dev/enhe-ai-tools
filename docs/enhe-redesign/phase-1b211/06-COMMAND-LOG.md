# Command Log Summary

The following gates were run in the isolated worktree:

```text
BASELINE_HEAD=1b3df7c706c5b7f9d8c8a844787da5708e702683
npm ci=PASS
npm run typecheck=PASS
TDD_RED=3 runs, 3 expected missing-seam failures
core contract focused=10/10
state writer focused=5/5
synthetic engine protocol=50/50
heartbeat set=50/50
npm run lint=PASS
npm run typecheck=PASS
default suite isolated observations=PASS, 438 files passed / 2105 tests passed
default suite required consecutive gate=BLOCKED
shuffle seed 21101=BLOCKED by unrelated timeout
shuffle seed 21102=BLOCKED by unrelated timeout
shuffle seed 21103=BLOCKED by unrelated timeout
database build=NOT RUN after hard gate failure
```

The unsupported `--reporter=silent` spelling was diagnosed as a Vitest 3.2.4 reporter configuration error and excluded from code conclusions. Subsequent stress runs used the supported `dot` reporter.
