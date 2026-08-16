# R4 稳定基线解析

## 已验证事实

```text
R4_SOURCE_BRANCH=codex/enhe-support-exclusion-v1
R4_CODE_COMMIT=4662af4a1280b19a38f04a2f01bab1bcca815726
R4_DOCS_COMMIT=06f488462efe84933a92dad867a49b7c188c08e5
R4_FINAL_HEAD=06f488462efe84933a92dad867a49b7c188c08e5
R4_ZIP_SHA256=bc8bbde7bfe01bfdb97da702fa535283c18a6733cf756470ceb77d8f1c549b53
R4_PLACEHOLDER_RECEIPT_PRESERVED=YES
```

来源分支与 HEAD 匹配指令指定值，来源 worktree 在读取时 clean；`4662af4` 是当前 HEAD 的祖先。`06f4884` 的提交范围只有 `docs/enhe-redesign/phase-2c2-1-r4/**`，未夹带应用源码。

## SELF_RESOLVED 的解释

R4 ZIP 中旧 `19-FINAL-RECEIPT.md` 的 `DOCS_COMMIT=SELF_RESOLVED_IN_FINAL_HANDOFF` 与相关 ZIP 字段是有意的自引用占位：一个提交内的文件无法预先包含该提交自身的 SHA；一个 ZIP 内的文件也无法预先包含最终 ZIP 的哈希而不改变归档本身。R4 终端交接给出的真实 docs/final SHA 是 `06f488462efe84933a92dad867a49b7c188c08e5`，本阶段只记录解析，不改旧收据、不 amend、不改写历史。

## R4 证据复核

- 强制文字模式扫描：46,080 行，481—1440px，双语、两轮，失败 0，二维碰撞 0，最小相关间距 12.453125px。
- 生产全宽扫描：16,440 行，320—1440px、685 个宽度，失败 0，二维碰撞 0，最小相关间距 12px。
- 全部产品矩阵：500 行，失败 0，排除区缺失 0，误加 0，卡宽/grid 回归 0。
- 横向 rail：126 行，失败 0，键盘失败 0，自动滚动 0，卡宽/rail 宽回归 0。
- 关键几何：216 行，失败 0，二维碰撞 0。
- 正式入口仍是 44×44；图标模式止于 483px，文字模式始于 484px；静态组件级排除区仍为 52/104px。

## 历史门禁保持

只读历史确认以下提交均为当前 HEAD 的祖先：

- `4061dee`：关闭 Phase 1B.2.13 build 与 R-008 门禁。
- `85cb3dc`、`64d1e72`：Heartbeat 生命周期 seam 与分层合同。
- `cf3affb`：Heartbeat writer 同路径并发写修复。
- `4662af4`：组件级静态客服排除区。

因此：

```text
R008_STATUS=CLOSED_UNCHANGED
HEARTBEAT_SEAM_STATUS=PASS_UNCHANGED
WRITER_FIX_STATUS=PASS_UNCHANGED
STAGING_SOURCE_READINESS=PASS_UNCHANGED
STAGING_VISUAL_READINESS=PASS_UNCHANGED
```

本阶段没有重新运行 R4 测试或 build，也没有把历史 PASS 冒充为本轮新执行结果。
