# Phase 0.5 命令记录

| 命令/检查 | 结果 | 写入 |
|---|---|---|
| `Get-Content` 读取附件 | 指令已读取 | 否 |
| `Get-Content` 依次读取 10 个最高优先级文件 | 全部存在并完整读取；补充决策确认 Phase 0 通过和 623 条数据记录 | 否 |
| `git status --short --branch` / `--porcelain=v2` | 原工作区大量 M/??，分支 `feature/enhe-api-gateway` | 否 |
| `git diff --stat` / `--name-status` | 记录原工作区修改概况 | 否 |
| `git status --untracked-files=all` | 记录未跟踪路径；未读取 secret 内容 | 否 |
| `git worktree list --porcelain` / `git remote -v` | 多 worktree；origin 为旧 GitHub 仓库 | 否 |
| `git show-ref`、`Test-Path`、`git check-ignore` | 目标路径/分支不存在，`.worktrees` 已忽略 | 否 |
| `git worktree add -b redesign/typeshare-v1 ... bc66ea5` | 成功创建隔离 worktree | Git worktree 元数据/新目录 |
| `Copy-Item docs/enhe-redesign` | 仅复制方案/审计文档到新 worktree | 新 worktree 文档 |
| `Import-Csv ...03-ROUTE-URL-INVENTORY.csv` | `ROWS=623`、`LINES=624` | 否 |
| `git grep`/`Get-Content` ZPAY、订单、Schema、上传审核代码 | 只读形成支付差距矩阵 | 否 |

## 明确未执行

未运行 `npm install`、build、test、lint、typecheck、Prisma generate/migrate/db push/seed、真实支付/退款/OAuth、部署、Nginx/Docker、commit 原工作区、push、merge、rebase、reset、restore、clean、stash。
