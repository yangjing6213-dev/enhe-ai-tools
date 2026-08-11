# 隔离工作区基线

## 原工作区

- 路径：`C:\Users\HU\Documents\New project 2`
- 分支：`feature/enhe-api-gateway`
- HEAD：`bc66ea5032a414a1870bcb6890faeee1a8da08c1`
- 状态：大量已修改和未跟踪文件；原状态未清理、未 stash、未提交。
- origin：`https://github.com/hqwzhu/enhe-ai-tools.git`（本阶段未修改；首次 push 前需用户确认目标仓库）。

## 新工作区

- 路径：`C:\Users\HU\Documents\New project 2\.worktrees\redesign-typeshare-v1`
- 分支：`redesign/typeshare-v1`
- 基线：`bc66ea5032a414a1870bcb6890faeee1a8da08c1`
- 创建命令：`git worktree add -b redesign/typeshare-v1 "C:\Users\HU\Documents\New project 2\.worktrees\redesign-typeshare-v1" bc66ea5032a414a1870bcb6890faeee1a8da08c1`
- 创建后状态：干净；仅复制 `docs/enhe-redesign/` 后产生本轮文档变更。

## 文档基线提交

- 文档基线提交：`6d164a3040aaba8ac38b15af2736ce3a33f375f3`
- 收据回填提交：`a7bc49ee9c49a3a8e00b2d8a6692655ae5ba0053`
- 两次提交均仅发生在新 worktree，未提交原工作区。
- 当前修正文档提交的 SHA 不写入它自身，由最终终端回执报告，避免自引用提交。

## 未触碰证据

创建前已记录原 checkout 的 `git status --short --branch`、`git status --porcelain=v2`、`git diff --stat`、`git diff --name-status`、未跟踪清单、`git worktree list --porcelain`、`git remote -v`。创建后未在原 checkout 执行 add/commit/stash/reset/restore/clean。
