# 代码库与架构审计

## 运行与依赖

- `package.json:5-26`：dev、standalone build、lint、typecheck、Vitest、Playwright、Prisma migrate/seed、SEO/a11y/performance audit 脚本。
- `package.json:28-63`：Next `^15.3.2`、React `^19.1.0`、TypeScript `^5.8.3`、Tailwind `^4.1.7`、Prisma `^6.8.2`、PostgreSQL provider、Fastify、GSAP、Motion、Nodemailer、COS SDK、bcrypt、zod。
- `src/app` 存在 App Router；未发现根 `app/` 或 `pages/`。代码页文件 104 条，API route 文件 24 条。
- `next.config.ts:23-24` 使用 `output: "standalone"`；`Dockerfile:1-25` 分三阶段构建，容器启动 `server.js`。
- `prisma/schema.prisma:1-8` 为 prisma-client-js + PostgreSQL；Schema 约 50 个模型/枚举，覆盖内容、订单、API、GEO、审计。
- `src/app/root-layout-shared.tsx:42-81` 是全局文档壳，同时挂载 AnalyticsTracker、交互背景、光标/边框控制器和外部脚本。

## 目录与模块

- 可复用：`src/lib/seo.ts`、`src/lib/public-slugs.ts`、`src/lib/tool-localization.ts`、`src/components/structured-data.tsx`、`src/components/ui.tsx`。
- 可复用但需边界评审：认证/CSRF、订单/支付、storage/access、analytics、admin audit。
- 需重构：公共 UI 壳、导航分类、支付/凭证双轨、文件存储的公开/私有分区、英文内容质量门。
- 需替换或隔离：旧首页视觉和全局 glass/glow/cursor 层；不是立即删除，需由设计稿和回滚策略决定。
- 不建议新增依赖：现有 Tailwind、Motion/GSAP、Lucide、Next Image、Vitest/Playwright 已覆盖需求；先复用。

## 配置与安全观察

- `next.config.ts:4-20` 有 HSTS、nosniff、SAMEORIGIN、Referrer-Policy、Permissions-Policy，以及 **CSP Report-Only**，不是 enforcement。
- `.env.example:1-48` 暴露配置名称清单（数据库、认证、COS、SMTP、ZPAY、内容导入、Baidu），本轮未读取值。
- 根无 `docker-compose.yml`、`docker-compose.yaml`、`nginx.conf`；仅有 `docker/nginx.conf` 和 deploy 目录。生产拓扑无法由根目录完整确认。
- 根无 `.github` 目录，CI 状态未知。
- `deploy.sh:7-21,41-86` 会 pull、build、Prisma migrate、seed，并在满足条件时 sed 修改宿主 Nginx、reload；本轮未运行。

## Git 与隔离

- HEAD：`bc66ea5032a414a1870bcb6890faeee1a8da08c1`，分支 `feature/enhe-api-gateway`，远程为 GitHub `hqwzhu/enhe-ai-tools`。
- 审计时工作区不干净，包含大量既有修改和未跟踪文件；不能据此区分本轮和历史变更。
- `git worktree list` 显示多个活动 worktree，且若干临时 worktree 标为 prunable；没有名为 redesign 的当前工作分支证据。
- 后续必须使用全新、干净、可回滚的 redesign worktree；不执行 reset/checkout/clean。

## 架构结论

现有栈足以承载总方案；Phase 1 的最小动作是冻结证据、定义契约和视觉 token，而非换框架或重写后端。

