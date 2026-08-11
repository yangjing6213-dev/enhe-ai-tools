# 后台、分析与运维审计

## 后台

- `src/app/admin/layout.tsx:4,41-53` 服务端 `requireAdmin`，菜单覆盖 orders/payments/payment-codes/refunds/users/tools/content/files/SEO/GEO/audit/settings。
- `src/app/admin/actions.ts` 多处调用 `requireAdmin`、Prisma transaction 和 `writeAdminAuditLog`；价格、文件、角色、退款、内容变更都有审计基础。
- `src/app/admin/page.tsx:37-88,106-161` 有用户、商品、订单、支付审核、退款、收入、漏斗、趋势和提醒概览。
- 缺口：未验证管理员 2FA、移动端紧急操作、审计日志不可篡改/留存策略、最小权限角色（Schema 只有 user/admin）、生产告警与值班流程。

## 分析

- `src/lib/analytics.ts:25-62,139-171` 有客户端/服务端事件白名单、归因 cookie、IP/User-Agent 和 Prisma AnalyticsEvent；`src/app/api/analytics/route.ts:10-43` 接收校验事件并写库。
- 已有 product purchase CTA、begin checkout、download click、AI news search 等事件；总方案要求的 coupon_apply、payment_method_select、purchase_success、download_success 及服务端权限开通/回调耗时/对账异常尚未在当前事件白名单中全部出现。
- 搜索页面把结果页 noindex（`src/app/search/page-shell.tsx:13-25`），但搜索词、无结果、点击后购买和中英文/设备差异的生产报表未由本地代码证明。
- GEO 结构（GeoQuery/Provider/Run/Result/Recommendation）存在，但没有本轮真实平台回答样本；不能把模型结果或“可见度分数”当生产事实。

## 部署、备份、回滚

- `Dockerfile:1-25` 可构建 standalone 镜像；`deploy.sh:14-39` build/migrate/seed/health check，`41-86` 可能修改并 reload 宿主 Nginx。
- 根没有 `.github`，CI 未知；`README.md:38-52` 仍描述本地 Compose、迁移和本地/COS 上传方式，不能作为当前生产拓扑证明。
- 未执行 build/test/migrate/deploy/backup；数据库备份、恢复演练、蓝绿环境、当前镜像 SHA、Nginx 配置和日志保留均未知。总方案的正式备份/四环境/蓝绿要求见 2018-2076 行。

## 建议

Phase 1 前形成部署清单：源 SHA→镜像 digest→数据库备份→迁移 dry-run→健康检查→回滚；生产脚本必须由人工批准后运行，并与只读审计分离。

