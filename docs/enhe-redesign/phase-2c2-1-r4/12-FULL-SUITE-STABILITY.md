# 测试与完整套件稳定性

| 门禁 | 最终结果 |
| --- | --- |
| `npm ci` | PASS；锁文件安装 622 个包，仅上游弃用告警 |
| 相关 Vitest（4 文件） | 23/23 通过 |
| Phase 2C.2.1R4 Playwright | 15/15 通过 |
| lint | PASS，错误 0 |
| typecheck | PASS |
| 默认完整套件 run 1 | 454 文件通过、9 skipped；2,213 测试通过、90 skipped |
| 默认完整套件 run 2 | 454 文件通过、9 skipped；2,213 测试通过、90 skipped |
| shuffle seed 21101 | 454 文件通过、9 skipped；2,213 测试通过、90 skipped |

`DEFAULT_FULL_SUITE_PASSED=2/2`

`SHUFFLED_FULL_SUITE_PASSED=1/1`

## 失败历史没有隐藏

- 初次完整套件有 2 个旧断点字符串断言失败；生产合同改为 484px 后同步更新直接断言，再进入最终三次完整运行。
- 较早一次 shuffle 出现一个无关的 5 秒偶发 timeout；该测试单独 685ms 通过，连续 20/20 通过，同一 seed 完整重跑通过。最终要求的两次默认与一次 shuffle 均为干净退出 0。
- 审查阶段的预期 RED、无效单轮阈值扫描、第一次 standalone 配置失败均分别记录，未用局部成功覆盖。

没有降低 worker、强制串行、增加全局 timeout、新增 skip 或删除失败测试。现有 9 文件/90 测试 skipped 为既有 opt-in 范围，本轮未修改。

