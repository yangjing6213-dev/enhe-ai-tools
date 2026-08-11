# 商品、内容、支付与数据模型审计

## 当前可复用模型

- `ToolCategory/Tool/ToolTag/ToolFaq/ToolChangelog/ToolPriceSpec/File/Tutorial`：`prisma/schema.prisma:282-457`，覆盖分类、商品、标签、FAQ、更新、价格、媒体、教程。
- `Order/PaymentTransaction/OrderRefundRecord/ToolPurchase/PaymentProof/DownloadLog/ToolUsageLog/AnalyticsEvent`：`458-643`，覆盖订单、支付流水、退款、购买权限、付款凭证、下载/使用/事件。
- `NewsCategory/NewsTag/NewsArticle/NewsExternalSource/AiTrendBriefing`：`967-1135`；双语资讯、来源和趋势日期/信号可复用。
- `AdminAuditLog/VipAdjustmentLog`：`708-743`，有高风险操作审计基础。

## 目标差距

- 商品目前以 Tool 为中心，`OrderType` 只有 vip/software_download（`schema.prisma:100-103`）；Skill/在线服务/软件下载通过 Tool type 和价格字段复用，目标需要更明确的 delivery/entitlement 语义。
- 无 Coupon/ExplorerPass/折扣锁定/核销模型；总方案要求 ¥5、30 天、唯一用户、回调后核销（1128-1257），不能靠前端字段拼接。
- `Comment` 有内容和审核，但没有 rating、verifiedPurchase/orderId 或用户确认字段（`schema.prisma:579-594`）；无法安全生成真实购买评价或 Review/AggregateRating。
- 资讯有作者/来源/canonicalUrl/更新时间（`schema.prisma:998-1082`），趋势有 sourceSignals（1111-1135），但生产数据完整性/真实性未知。
- `File` 同时有 filePath/fileUrl/storage 语义（420-437）；公开媒体和商品交付包尚未从 Schema 层强制分区。
- `PaymentProof` 与 reviewStatus/reviewer 字段（558-577）是旧人工审核链路；新版要求旧历史只读保留、停止新上传。
- 没有 OAuth identity、退款通道对账、coupon 唯一领取或支付回调幂等专用实体；PaymentTransaction.orderId unique 和 providerTradeNo index 只能部分覆盖。

## 建议数据契约（Phase 1 评审，不在本轮改 Schema）

- `AccountIdentity`、`CouponGrant`、`CouponRedemption`、`Entitlement`、`PaymentAttempt/Callback`、`RefundAttempt/Reconciliation`、`VerifiedReview`。
- 为 File 增加明确 visibility/storageClass、objectKey、signed-download policy；历史 PaymentProof 标记 legacy read-only。
- 订单状态机至少覆盖待支付、支付确认中、已支付、支付失败、已关闭、退款处理中、已退款，并以服务端事件驱动。
- 所有金额由服务端从已存价格快照+有效券计算；回调金额与实付金额严格相等，重复回调幂等。

