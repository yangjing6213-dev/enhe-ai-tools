# Final Test Stability

| 门禁 | 结果 | 备注 |
| --- | --- | --- |
| npm ci | PASS | 622 packages；仅既有 warning |
| npm run lint | PASS | 完整 lint |
| npm run typecheck | PASS | Prisma client generate + tsc --noEmit |
| Focused motion Vitest | 24/24 PASS | 4 files |
| Final source static test | 7/7 PASS | 已包含在 24 项 |
| Playwright list | 137 cases | acceptance 133 + performance 4 |
| 483/484 support targeted | 2/2 PASS | 单次实际输出 |
| deterministic cross stress targeted | 1/1 PASS | 单次实际输出 |
| software cross geometry targeted | 0/2 FAIL | 两路由均 1936 px² |
| SSR targeted | 2/4 PASS | 两个首页失败 |
| Default full suite run 1 | NOT_RUN_BLOCKED_UPSTREAM | 不冒充 PASS |
| Default full suite run 2 | NOT_RUN_BLOCKED_UPSTREAM | 不冒充 PASS |
| Shuffle seed 21101 | NOT_RUN_BLOCKED_UPSTREAM | 不冒充 PASS |

早期 E2E 曾暴露 H1、aria-live locator 和 modal 场景三个测试设计错误；这些测试本身已修正并定向通过。最终保留的四个失败可由生产 DOM 稳定复现，不是 locator 误报。

    LINT=PASS
    TYPECHECK=PASS
    FINAL_MOTION_FOCUSED_TESTS=PASS
    DEFAULT_FULL_SUITE_RUNS=0
    DEFAULT_FULL_SUITE_REQUIRED_RUNS=2
    DEFAULT_FULL_SUITE_STATUS=NOT_RUN_BLOCKED_UPSTREAM
    SHUFFLED_FULL_SUITE_RUNS=0
    SHUFFLED_FULL_SUITE_REQUIRED_RUNS=1
    SHUFFLED_FULL_SUITE_STATUS=NOT_RUN_BLOCKED_UPSTREAM
