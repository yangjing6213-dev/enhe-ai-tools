# 执行摘要

## 一句话架构

这是一个 Next.js 15 App Router + React 19 + TypeScript + Tailwind CSS 4 + Prisma 6/PostgreSQL 的单体站点，内含公共双语内容、密码认证、用户中心、后台、ZPAY 支付、上传/下载 API、Fastify API gateway 与 GEO/SEO 管理模块。

## 是否适合在现有技术栈上升级

适合。已有路由、元数据构建器、结构化数据、双语路径、订单/权限/审计模型和测试基础，没必要先换框架。风险集中在“旧交易链路与新版方案冲突”、私有文件边界、URL/sitemap 清理和工作区隔离，而不是 Next/Prisma 本身。

## Top 10 风险

1. **P0（条件性）永久下载地址泄露**：产品详情直接从 File 的 `fileUrl/filePath` 生成展示内容；本地上传 API 对文件公开读取且长缓存。是否已有商品包暴露需查生产数据，见 07。
2. **P1 支付方案冲突**：新版禁止付款截图和人工审核（总方案 1139-1149），当前仍有 `PaymentProof`、上传凭证和后台审核链路。
3. **P1 支付能力未闭环证明**：当前可见 ZPAY MD5 签名、金额/状态校验和 GET 通知；正式商户、证书/商户号/appId、主动查单、重试、对账和补偿的生产证据未知。
4. **P1 OAuth/优惠券缺失**：当前只有邮箱+密码；Schema 未见 Google/GitHub 账号关联和优惠券模型。
5. **P1 sitemap 与 URL 决策未收口**：线上 sitemap 514 条，包含旧 `/online-tools` 入口；公开线上存在 `/ai-topics`、`/product-demos`，当前 checkout 未找到对应 page 文件，存在代码/生产漂移。
6. **P1 总方案公共路由缺口**：`/help`、`/updates`、`/product-paths` 线上探测为 404，需决定新增、迁移或继续 404。
7. **P1 外部脚本和性能/隐私边界**：根布局在 beforeInteractive 注入 ByteDance 外部脚本；其来源、同意机制、性能预算未在本地得到证明。
8. **P1 工作区不可直接开发**：审计起点大量既有脏文件和多个 worktree，当前分支也不是明确的 redesign 隔离分支。
9. **P2 UI 与最终方案相反**：现有 CSS 是深色橙色渐变、玻璃拟态、光效和光标动效；总方案要求暖白/近黑/鼠尾草绿并禁用旧视觉。
10. **P2 测试/部署证据不足**：有脚本但本轮不能运行；仓库根无 `.github`，生产 deploy.sh 会 pull、build、migrate、seed 并可能改宿主 Nginx，不能当作已验证回滚能力。

## Top 10 可复用资产

1. App Router 与独立中英文路径。
2. `buildPageMetadata` 的 canonical、hreflang、OG/Twitter 统一构建。
3. robots 中对 OAI/主流 AI crawler 的显式 allow。
4. sitemap 从已发布 Prisma 数据生成，并过滤英文可索引性。
5. Prisma 的 User/Session/Order/PaymentTransaction/ToolPurchase/DownloadLog/AdminAuditLog。
6. 服务端 `requireUser/requireAdmin`、登录失败限制、CSRF HMAC。
7. ZPAY 创建、签名、通知验证和退款封装。
8. COS 短时签名下载与本地上传路径保护工具。
9. 公共 Tool/Skill/News/Trend 页面壳和结构化数据组件。
10. Vitest、Playwright、lint/typecheck/build 脚本及健康检查路由。

## 第一批开发前必须处理

- 冻结当前 checkout，建立归档 tag/分支和干净 redesign worktree。
- 取得生产 URL/数据库/对象存储/支付通道基线；逐 URL 决策并清理 sitemap。
- 先定私有文件存储迁移和永久地址泄露封堵方案。
- 决定新版支付正式商户、回调/查单/退款边界；保留旧凭证只读，不再扩展旧链路。
- 补 OAuth 方案、账号关联、冲突邮箱和优惠券数据契约。
- 确认真实评价、价格、公司资料、设计稿和五款视频。
- 降级/评估第三方脚本并建立性能、a11y、SEO/GEO 验收门槛。

## 推荐下一步

先做“数据/URL/支付/文件安全契约评审”，再进入总方案 Phase 1 设计系统。不要先改首页，也不要先迁移数据库。

## 现在禁止

禁止在当前脏工作区直接开始 Phase 1；禁止接入真实 OAuth/支付密钥；禁止删除旧 URL/旧凭证/旧文件；禁止依据线上 200 或本地脚本推断生产数据完整。

