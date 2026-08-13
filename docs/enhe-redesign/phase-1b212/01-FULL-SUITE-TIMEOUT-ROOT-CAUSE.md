# Full Suite Timeout Root Cause

## 结论

当前可确认的主要分类是 `CPU_OR_PROCESS_RESOURCE_CONTENTION`，并伴随若干测试中的固定短时异步等待。不能把所有完整套件失败归因于 GSC 单一测试：修复后失败对象仍在 Heartbeat、公共内容 fallback、新闻分页等测试之间变化。因此“完整套件已稳定”不能成立。

## 证据

- GSC 测试原实现通过 `git ls-files` 枚举约 1,630 个源码文件，再逐个同步读取并匹配文本；该检查单独运行正常，但会增加并行 worker 的同步 I/O 和 CPU 负载。
- 初始 GSC 单独运行：20/20。
- 按附件规定的正确四文件集合运行：20/20。
- 初始完整套件指定 seed 的失败曾分别落在 `schema-entity-reference.test.ts`、`publish-ai-trend-briefing-html.test.ts` 和 Heartbeat 集成测试，说明失败受并行负载影响而非稳定绑定 GSC。
- Heartbeat 集成测试单独运行 20 次得到 19/20，说明至少还有一个超出本阶段四文件修改范围的负载敏感测试。
- 修复后默认完整套件第一批为 4/5，第二批为 3/5；失败对象继续变化。

## 限制

附件要求修复前连续 3/3 的确定性 RED。当前机器能真实捕获失败，但在恢复旧 GSC 实现后，三个 seed 的一次复跑均通过，无法诚实地记录为确定性 RED 3/3。该证据缺口阻止 PASS，也阻止继续重应用 Seam。
