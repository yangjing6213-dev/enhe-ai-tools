# ENHE Phase 1B.2.12 Manifest

阶段状态：`BLOCKED`

本阶段目标是稳定完整 Vitest 套件，并在所有前置门禁通过后重新应用既有 Heartbeat Seam。当前未达到 Seam 重应用门禁，因此没有修改源 Heartbeat worktree，也没有执行 build、数据库或 R-008。

## Worktree

- 源 worktree：`C:\Users\HU\Documents\New project 2\.worktrees\enhe-runtime-heartbeat-seam-v1`
- 源分支：`codex/enhe-runtime-heartbeat-seam-v1`
- stability worktree：`C:\Users\HU\Documents\New project 2\.worktrees\enhe-full-suite-stability-v1`
- stability 分支：`codex/enhe-full-suite-stability-v1`
- stability 基线：`0d231711ab3374f851071692a47644da4e1b7733`

## 已知提交

- Writer 修复：`cf3affb`
- Writer 文档：`1b3df7c`
- Heartbeat Seam：`b50ad52`
- Heartbeat 测试架构：`fd3e4c1`
- 本阶段测试稳定性修复：`7acebac2062c150e76e46b73c5a94921acda043c`

## 本阶段实际变更

仅修改 `src/lib/google-search-console-source.test.ts`。变更把逐文件同步读取的 tracked-source 扫描替换为 Git 内容检索，并保留原有排除项与断言语义。未修改生产实现、Vitest 全局配置、package、lockfile、Prisma、数据库或远端。

## 文档清单

本目录包含本阶段所需的 00-14 文件。`14-HEARTBEAT-SEAM-REAPPLY.patch` 明确记录未重应用，而不是伪造不存在的 diff。
