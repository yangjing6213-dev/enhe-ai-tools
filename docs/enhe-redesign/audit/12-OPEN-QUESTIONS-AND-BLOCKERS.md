# 未决问题与阻塞项

## 必须由用户/运维提供

1. 当前生产部署 SHA、镜像 digest、数据库 schema/migration 版本、Nginx 配置和对象存储桶/生命周期（只读）。
2. 生产 File 清单（仅元数据：storage、key/path、公开/私有、关联 Tool），以及 CDN/cache 配置；不要提供文件内容。
3. 支付宝/微信正式商户产品、回调/查单/退款能力、商户号/appId/证书归属和 sandbox 方案；不要提供密钥到本轮。
4. Google/GitHub OAuth 应用是否已创建、允许回调 URI、组织所有权和隐私政策 URL。
5. 真实产品/促销价格、交付范围、退款边界和 AI Explorer Pass 最终规则。
6. 真实购买用户评价、用户确认、评分和是否允许展示头像。
7. 公司主体、地址、电话、官方社交账号最终值。
8. 教程/帮助/更新现有 URL 的流量、外链、收录和替代页面。
9. Search Console/Analytics/站长平台只读导出；AI 引用抽样查询集。
10. 第一批高保真设计稿、五款产品真实视频/字幕/封面。

## 需要明确的决策

- `/help`、`/updates`、`/product-paths` 404 是继续 404、补页面还是迁移到现有 `/tutorials`/法律页。
- `/ai-topics`、`/product-demos` 线上 200 与当前 checkout 无 page 文件的部署漂移如何处理。
- `/online-tools` 是否永久 301 到 `/account-services`，以及 sitemap 何时移除旧别名。
- 旧 `PaymentProof` 是否仅历史只读；现有用户如何完成未结订单迁移。
- local upload fallback 是否允许继续存在；若不允许，迁移窗口和失效策略。
- 最小后台角色/2FA/二次确认/审计留存年限。

## 当前硬阻塞

- P0 条件性私有下载地址未完成生产盘点。
- 生产支付商户能力与回调/查单/对账未知。
- 无 OAuth/Explorer Pass 数据契约。
- 工作区脏且缺少明确 redesign 基线；不能直接进入开发。

