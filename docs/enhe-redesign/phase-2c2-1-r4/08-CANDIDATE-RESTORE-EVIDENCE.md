# R3 候选恢复证据

`R3_CANDIDATE_RESTORE_STATUS=PASS`

`R3_CANDIDATE_RESTORED_FILE_COUNT=6`

## 隔离完整性

- manifest：`C:\Users\HU\Desktop\ENHE-Quarantine\phase2c21r3-no-natural-safe-width-blocked-20260816-130523\manifest.json`
- manifest SHA-256：`c84fb58d63827e5fa0245bd1eb77320e701700d3784f7ac11593e5eecabad4fe`
- source HEAD：`f3a1f7a9e99975716e1aefd489136d1856435c4e`
- tracked binary patch SHA-256：`a8cd61b0950064937cd1cd9c12646918dcc15ea3a4090458ede38953805e3367`
- manifest 的 26 个备份/证据条目逐项通过存在性、大小与 SHA-256 检查。

## 精确恢复清单

| 路径 | R3 manifest 状态 | 验证 |
| --- | --- | --- |
| `src/components/customer-support-widget.tsx` | tracked modified | binary patch 应用与 reverse-check；patch SHA 匹配 |
| `src/lib/customer-support-widget-source.test.ts` | tracked modified | binary patch 应用与 reverse-check；patch SHA 匹配 |
| `src/styles/redesign/software.css` | tracked modified | binary patch 应用与 reverse-check；patch SHA 匹配 |
| `tests/e2e/mobile-support-r2-harness.mjs` | untracked | SHA-256 `aeedc445225aed920316cecd32040f7c6afdacda6999c3f5af08f2bd2ff4df82` |
| `tests/e2e/mobile-support-r3-harness.mjs` | untracked | SHA-256 `83dd81ac8b05ed55c07ca16212f0f9a60a7474b055cbfc220f84b0d6e502016c` |
| `tests/e2e/mobile-support-trigger.spec.ts` | untracked | SHA-256 `99bebbbd684970a1c2453f8294a81d06523c549de422ead27d64fc01e7ac4cd9` |

R3 文档没有恢复到 R4 worktree。R3 helper 在完成结构性 RED 后演进为本轮 `mobile-support-r4-harness.mjs`；原始 R3 文件仍保存在隔离目录，没有被删除或修改。最终源码与测试哈希因 R4 实现而变化是预期结果，不被冒充为“仍等于 R3 候选”。

## R3 结果 ZIP

- 路径：`C:\Users\HU\Desktop\ENHE-Phase2C.2.1R3-All-Products-Safe-Zone-Results.zip`
- 大小：23,566 字节
- 文件数：19
- CRC 错误：0
- SHA-256：`bbcf0bdbf1b428a9ec295b14370b92c194d9dc81a7af598aa2667dae91b75e29`

已有 R、R2、R3 隔离目录与 ZIP 均未移动、覆盖或修改。

