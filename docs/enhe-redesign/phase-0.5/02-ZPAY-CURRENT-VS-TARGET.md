# ZPAY 当前实现与目标契约差距

| Contract item | Current evidence | Status | Gap | Target phase |
|---|---|---|---|---|
| 共用 ZPAY、支付宝/微信 type | `src/lib/zpay-config.ts:4-13,46-74`; `src/lib/zpay.ts:76-83` | READY | 生产配置值未验证 | Phase 4 验收 |
| 默认支付宝 | `zpay-config.ts:62`; `zpay.ts:76-79` | READY | 生产默认值未读取 | Phase 4 验收 |
| 服务端签名 | `src/lib/zpay.ts:23-38`; `zpay-orders.ts:110-124` | READY | 当前创建入口不是目标 `/submit.php` POST 表单 | Phase 4 |
| 目标页面 POST `/submit.php` | `zpay-orders.ts:126-129` 使用 `mapi.php`；`postZpayForm:159-170` 为服务器 fetch | PARTIAL | 需确认网关页面跳转协议并切换到目标入口 | Phase 4 |
| notify GET | `src/app/api/zpay/notify/route.ts:4-8` | READY | 未做真实 sandbox 回调验证 | Phase 4 |
| return 只展示查询 | `zpay-orders.ts:116-117` 写死 `/login?payment=success`；无专用 return route | PARTIAL | return URL 不应宣称成功，应建立查询状态页面 | Phase 4 |
| 签名、pid、订单、状态、金额校验 | `zpay-orders.ts:143-156` | PARTIAL | 未校验 `sign_type`、`type` 与支付尝试、`trade_no` 存在/唯一 | Phase 4 |
| out_trade_no 独立且每次尝试唯一 | `zpay-orders.ts:115`; pending 重建订单号 `201-209`；`Order.orderNo` unique | PARTIAL | 当前字段复用 `orderNo`，未见独立 provider out-trade-no 字段；“每次尝试”语义需专用模型/字段 | Phase 4 |
| Decimal 服务端金额 | `src/app/actions.ts:155-180`; `schema.prisma:467` Decimal；`zpay.ts:50-55` | PARTIAL | 当前无优惠券折扣模型；订单金额快照需扩展券后金额语义 | Phase 4 |
| 回调事务幂等 | `zpay-orders.ts:286-345`; `PaymentTransaction.orderId @unique` | PARTIAL | 事务有 upsert，但未见按 provider trade_no 唯一约束或重复通知专用审计 | Phase 4 |
| 重复回调返回 success 且不重复副作用 | `zpay-orders.ts:316-344` upsert/购买 upsert | PARTIAL | 未见“已处理即 success”专门分支；通知/券副作用闭环待验 | Phase 4 |
| 主动查单 `api.php?act=order` | `zpay-orders.ts:350-383` 仅退款相关 | MISSING | 未发现订单查单 wrapper 或定时补偿任务 | Phase 4 |
| 退款 `api.php?act=refund` | `zpay-orders.ts:350-380`; 管理员退款调用链存在 | READY | 结果落库/对账和失败重试仍需验证 | Phase 4 |
| 支付成功权限开通 | `zpay-orders.ts:316-344` 更新 activated/upsert ToolPurchase | READY | 仅覆盖 software_download；券/通知补偿未完成 | Phase 4 |
| 超时、重试、对账、异常告警 | 未发现 ZPAY 专用查单/对账/补偿闭环证据 | MISSING | 需要运维任务和可审计报告 | Phase 4/8 |
| 日志脱敏 | `zpay-orders.ts:168-170` 错误截断网关非 JSON 文本；notify route:9 记录错误对象 | PARTIAL | 未证明生产日志会移除 pid/key/signature/完整 URL | Phase 4 |
| 旧 PaymentProof 上传/审核入口 | `src/app/actions.ts:202-228`; `src/app/api/uploads/payment-proof/route.ts:26-98`; admin review action | READY | 按目标必须停止新订单使用，历史只读迁移待做 | Phase 4 |

### 计数

- READY：7
- PARTIAL：8
- MISSING：2
- UNKNOWN_PRODUCTION：0

合计 17 项，与上表项目数一致。统计按每行 `Status` 列直接重算；未改变任何表格行的分类。

“生产验证待完成”是契约状态，不将其误写为 `UNKNOWN_PRODUCTION`；代码差距状态按上表严格使用允许枚举。
