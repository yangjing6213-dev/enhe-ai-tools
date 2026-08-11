# Phase 0 命令记录

以下均为只读命令或允许的新建审计目录操作；未运行安装、构建、测试、Prisma 生成/迁移、部署、支付、OAuth 或生产写入。

| 时间/用途 | 命令或检查 | 结果 |
|---|---|---|
| 前置 | `Get-Content docs/enhe-redesign/00-MASTER-SPEC.md` | 总方案存在并完整读取 |
| Git | `git status --short --branch` | 分支 `feature/enhe-api-gateway`；工作区大量 M/?? |
| Git | `git rev-parse HEAD; git remote -v; git log -5` | HEAD `bc66ea5032a414a1870bcb6890faeee1a8da08c1`；origin 为 hqwzhu/enhe-ai-tools |
| Git | `git branch -a; git worktree list --porcelain` | 多个功能分支/worktree；若干临时 worktree prunable |
| 结构 | `Get-ChildItem` 检查 AGENTS/README/package/next/prisma/Docker/src/public/scripts/tests | 真实存在/缺失按 02 报告记录 |
| 路由 | 递归列出 `src/app/**/page.tsx` 与 `route.ts` | 104 页文件、24 API route 文件 |
| 静态 | `git grep` 认证、OAuth、支付、下载、SEO、评价、优惠券、GEO | 形成 04-10 证据 |
| 线上 | `Invoke-WebRequest` 公开代表路径、robots、sitemap、404 | 页面状态/title/H1/canonical/robots/JSON-LD 记录于 04 和 CSV |
| sitemap | 读取并解析 `https://www.enhe-tech.com.cn/sitemap.xml` | HTTP 200，514 个 `<loc>`；中文 259、英文 255 |
| robots | 读取 `https://www.enhe-tech.com.cn/robots.txt` | HTTP 200；OAI/主流 crawler allow，私有前缀 disallow |
| 文件 | 读取 CSS、Schema、auth/storage/payment/admin/deploy 关键文件 | 仅输出路径/行号/配置名称，不读取 .env 值 |
| 新建 | 创建 `docs/enhe-redesign/audit/` | 仅新增本目录报告 |

## 未执行

`npm install`、`npm run build`、`npm test`、`npm run lint`、`npm run typecheck`、`prisma generate/migrate/db push/seed`、`deploy.sh`、Docker/Nginx/服务器命令、真实支付/OAuth、commit/push/merge/rebase、删除/移动/重命名。

