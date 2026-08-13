# Default and Shuffle Stability

## 修复前观察

- 初始默认完整套件曾有一批 5/5 通过，但随后在并行负载下出现 timeout。
- seed 21101：曾失败于 `src/lib/schema-entity-reference.test.ts`。
- seed 21102：曾失败于 `scripts/publish-ai-trend-briefing-html.test.ts`。
- seed 21103：曾失败于 `deploy/enhe-ai-tools/scripts/runtime-heartbeat.test.mjs`。

失败测试变化，说明完整套件稳定性问题不是单一稳定失败点。

## 修复后观察

修复提交后默认完整套件两批结果：

- 第一批 5 次：4/5 通过；第 3 次 Heartbeat 720 秒 audit 测试 timeout。
- 第二批 5 次：3/5 通过；第 1 批出现公共内容 fallback 和新闻分页 timeout，第 2 批出现 Heartbeat timeout。

修复后没有取得默认 5/5，也没有执行修复后 shuffle 3/3 门禁，因为默认门禁已经失败。`PRE_SEAM_DEFAULT_FULL_SUITE_PASSED=NO`，`PRE_SEAM_SHUFFLED_FULL_SUITE_PASSED=NOT_RUN_AFTER_BLOCK`。
