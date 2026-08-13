# Regression Evidence

The four heartbeat-related test files passed together once and then passed in the required 50-run heartbeat set.

```text
HEARTBEAT_TEST_FILES=4
HEARTBEAT_TEST_SET_RUNS=50
HEARTBEAT_TEST_SET_PASSED=50
```

The full default suite passed in isolated runs with the normal Vitest parallel configuration, including one observed run of 438 passed test files, 9 skipped files, 2105 passed tests, and 90 skipped tests. However, the required five consecutive run gate was not achieved.

The strict consecutive attempt stopped at run 2 after run 1 passed. Run 2 had five pre-existing non-Heartbeat timeout failures, including `scripts/publish-ai-trend-briefing-html.test.ts`, `src/lib/ai-news-translation-action.test.ts`, `src/lib/google-search-console-source.test.ts`, and `src/lib/schema-entity-reference.test.ts`. The four isolated files later passed 18/18, so this evidence indicates parallel full-suite resource flakiness, not a stable Heartbeat assertion failure; it still fails the requested gate.

Native Vitest shuffle also failed all three requested seeds. Each seed reached 2104 passed tests and one timeout in `src/lib/google-search-console-source.test.ts`; that file passed when run in isolation.

```text
DEFAULT_FULL_SUITE_REQUIRED_RUNS=5
DEFAULT_FULL_SUITE_CONSECUTIVE_ATTEMPTED=2
DEFAULT_FULL_SUITE_CONSECUTIVE_PASSED=1
DEFAULT_FULL_SUITE_STATUS=BLOCKED
SHUFFLED_FULL_SUITE_REQUIRED_RUNS=3
SHUFFLED_FULL_SUITE_SEEDS=21101,21102,21103
SHUFFLED_FULL_SUITE_PASSED=0/3
SHUFFLED_FULL_SUITE_STATUS=BLOCKED
```
