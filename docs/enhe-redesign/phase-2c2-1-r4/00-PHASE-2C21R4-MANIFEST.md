# ENHE Phase 2C.2.1R4 执行清单

## 结论

`PHASE_2C_2_1R4_STATUS=PASS`

`SUPPORT_EXCLUSION_MODEL=COMPONENT_SCOPED_STATIC_EXCLUSION_ZONE`

R4 用组件级静态排除区关闭移动客服遮挡门禁。它没有改写此前结论：

- `PHASE_2C_2_1R_STATUS=BLOCKED`：361px 与 390px 的旧断点合同冲突。
- `PHASE_2C_2_1R2_STATUS=BLOCKED`：320px 全部产品 CTA 碰撞超出当轮授权范围。
- `PHASE_2C_2_1R3_STATUS=BLOCKED`：320—480px 自然宽度扫描 644/644 失败，不存在可用自然断点。
- `PHASE_2C_2_STATUS=PASS_UNCHANGED`：正式双语软件页合同没有被 R/R2/R3 的阻塞结果撤销。

R4 改变的是解决模型，不是历史证据。全部产品 CTA 的自然断点搜索已停止，R/R2/R3 文档和隔离产物均未修改。

## 基线与 Git

- 起始 HEAD：`f3a1f7a9e99975716e1aefd489136d1856435c4e`
- worktree：`C:\Users\HU\Documents\New project 2\.worktrees\enhe-support-exclusion-v1`
- branch：`codex/enhe-support-exclusion-v1`
- 代码与测试提交：`4662af4a1280b19a38f04a2f01bab1bcca815726`
- 生产文件数：7（达到但未超过硬上限）
- 文档提交：本目录的自提交，完整 SHA 在最终交接中记录。

## R3 完整性

- 隔离 manifest source HEAD 与稳定源码一致。
- manifest SHA-256：`c84fb58d63827e5fa0245bd1eb77320e701700d3784f7ac11593e5eecabad4fe`
- `R3_QUARANTINE_MANIFEST_STATUS=PASS`
- `R3_QUARANTINE_FILE_HASHES_VERIFIED=YES`
- `R3_CANDIDATE_RESTORE_STATUS=PASS`
- `R3_CANDIDATE_RESTORED_FILE_COUNT=6`
- R3 ZIP：23,566 字节、19 个文件、CRC 错误 0，SHA-256 `bbcf0bdbf1b428a9ec295b14370b92c194d9dc81a7af598aa2667dae91b75e29`。

## 锁定参数

| 参数 | 值 | 证据 |
| --- | ---: | --- |
| 图标入口 | 44×44px | 双语浏览器与压力矩阵 |
| 图标排除区 | 52px | 44px + 8px |
| 最大文字入口宽度 | 95.546875px | 英文正式页面最大值 |
| 文字排除区 | 104px | ceil((95.546875 + 8) / 4) × 4 |
| 文字模式自然安全起点 | 481px | 双语两轮、逐像素模拟扫描 |
| 正式文字模式起点 | 484px | 481px 向上取整到 4px 倍数 |
| 正式图标模式终点 | 483px | 484px - 1px |

## 核心门禁

- 文本模拟扫描：46,080 条，失败 0，最小相关水平间距 12.453125px。
- 生产全宽扫描：16,440 条，失败 0，二维碰撞 0，最小相关水平间距 12px。
- 全部产品矩阵：500 条，失败 0；右列缺失 0；非右列误加 0。
- 横向 rail 矩阵：126 条，失败 0；卡宽、rail 宽、scroll-snap、键盘和静止位置不变。
- 关键几何矩阵：216 条，碰撞 0，最小相关水平间距 12px。
- 压力：20/20 轮通过。
- 最终浏览器矩阵：60/60 通过；console error 0；page error 0。
- 正式截图：14 张，双语、320/390/483/484/768/1440。
- lint、typecheck、默认完整测试 2/2、seed 21101 shuffle 1/1、build、standalone 均通过。

## 安全边界

未部署、未 push、未修改 remote、未修改生产环境；未读取/创建/修改 `.env`；未连接生产数据库。产品数据、12/页分页、分类、详情、下载、支付、OAuth、Prisma、migration、package、lockfile、R-008、Heartbeat 和 Writer 均未修改。

