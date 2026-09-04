# ENHE API Gateway Payment Integration Design

Date: 2026-07-05

Status: Phase 2 payment draft

## 1. 复用现有支付能力的边界

阶段 0 审计确认现有 ENHE 主站已有订单、ZPAY、支付回调、退款和后台能力。ENHE API Gateway 应复用这些能力作为支付入口，但不能把现有订单状态当作 API 钱包余额。

复用：

- 用户登录和购买入口。
- ZPAY 下单与回调验签能力。
- 支付状态查询。
- 管理员订单和支付排查能力。
- 退款基础能力。

新增：

- API 套餐/充值语义。
- `api_payments` 支付映射。
- `api_wallets` 钱包。
- `api_credit_transactions` 额度发放和扣费流水。
- 支付成功后的幂等发放。

## 2. API 套餐购买流程

1. 用户进入 `/user/api/billing`。
2. 主站读取 active `api_plans`。
3. 用户选择套餐。
4. 主站创建订单或 API payment 映射记录。
5. 主站调用 ZPAY 创建支付。
6. 用户完成支付。
7. ZPAY 回调主站。
8. 主站验签、校验订单号、金额、状态。
9. 主站将 `api_payments` 标记为 paid。
10. 发放套餐额度到 `plan_balance_usd`。
11. 写 `api_credit_transactions.plan_grant`。
12. 标记 `api_payments.status=credited`。
13. 用户在 `/user/api/usage` 看到余额。

## 3. API 充值余额流程

1. 用户进入 `/user/api/billing`。
2. 用户选择充值金额。
3. 主站创建充值订单或 `api_payments`。
4. 用户支付。
5. 支付回调验签通过。
6. 主站将充值金额或兑换额度发放到 `recharge_balance_usd`。
7. 写 `api_credit_transactions.recharge`。
8. 用户可立即使用 Gateway。

充值余额与套餐余额必须在钱包中分桶展示。

## 4. 支付回调验签

回调必须校验：

- ZPAY 签名。
- 商户号。
- 内部订单号。
- provider trade no。
- 支付状态。
- 支付金额。
- 支付类型。
- 订单是否属于当前用户和 API 产品。

验签失败：

- 不修改钱包。
- 不写正向额度流水。
- 写安全日志或支付异常记录。

## 5. 幂等处理

支付幂等层级：

| 层 | 幂等 key | 目的 |
| --- | --- | --- |
| 支付回调 | provider trade no + order no | 防重复回调 |
| API payment | `api_payments.idempotency_key` | 防重复状态推进 |
| 额度发放 | `api_credit_transactions.idempotency_key` | 防重复加钱 |
| 钱包更新 | wallet row lock/version | 防并发余额错乱 |

重复回调时：

- 如果已 credited，直接返回成功确认，不重复发放。
- 如果 paid 但未 credited，可继续执行发放。
- 如果金额不一致，进入异常状态，不发放。

## 6. 订单状态和钱包余额关系

| 订单/API payment 状态 | 钱包变化 |
| --- | --- |
| `pending` | 无变化 |
| `paid` | 支付确认，但尚未发放，不应对用户展示为可用余额 |
| `credited` | 已写额度流水并更新钱包 |
| `failed` | 无变化 |
| `refunded` | 按退款流水扣减或标记 |
| `canceled` | 无变化 |

用户可用余额只以 `api_wallets` 和 `api_credit_transactions` 为准，不以订单状态直接计算。

## 7. 支付成功后发放余额

发放余额必须在事务中完成：

1. 锁定 `api_payments` 或按幂等 key 查询。
2. 确认支付状态为 paid 且未 credited。
3. 锁定用户 `api_wallets`。
4. 更新对应余额桶。
5. 写 `api_credit_transactions`。
6. 更新 `api_payments.status=credited` 和 `credited_at`。
7. 提交事务。

发放失败：

- 保留 paid 状态。
- 后台显示“待补发”。
- 支持管理员手动补单，但必须走同一幂等发放流程。

## 8. 支付失败处理

- ZPAY 返回失败或用户取消时，订单/API payment 标记 failed 或 canceled。
- 不修改钱包。
- 用户账单页展示失败原因摘要。
- 用户可重新发起支付，生成新的 payment 记录。

## 9. 重复回调处理

重复回调不能重复发放额度。

处理规则：

- `provider_trade_no` 已处理且 credited：返回已处理。
- `provider_trade_no` 已存在但金额不一致：标记风险，不发放。
- 同一订单多个成功回调：只允许第一笔进入 credited。
- 重复回调应写入支付日志，但不写重复 credit transaction。

## 10. 手动补单处理

手动补单场景：

- 回调丢失。
- 支付成功但发放失败。
- 用户提供支付凭证。
- 管理员运营补偿。

流程：

1. 管理员进入 `/admin/api/orders` 或 `/admin/api/wallets`。
2. 查找订单/payment。
3. 填写补单原因。
4. 系统校验是否已 credited。
5. 通过幂等发放流程写钱包和流水。
6. 写 `api_admin_audit_logs`。

## 11. 退款处理

退款原则：

- 已消耗额度按法律条款处理。
- 未消耗充值余额可按规则退回。
- 推荐余额通常不退现金。
- 套餐余额按套餐有效期和条款处理。

退款流程：

1. 管理员或用户发起退款申请。
2. 计算可退余额。
3. 调用现有退款能力或人工处理。
4. 钱包写 `refund` 或 `correction` 流水。
5. `api_payments.status=refunded` 或部分退款状态。
6. 写 admin audit。

## 12. 与 `api_credit_transactions` 的关系

支付成功发放必须产生正向流水：

- 套餐：`transaction_type=plan_grant`，关联 `payment_id`。
- 充值：`transaction_type=recharge`，关联 `payment_id`。
- 退款：`transaction_type=refund`，关联 `payment_id` 和 admin audit。
- 补单：仍使用 `plan_grant` 或 `recharge`，但 reason 标明补单并关联 audit。

## 13. 与现有订单表兼容方案

兼容方案 A：

- 现有订单表新增 API 订单类型。
- `api_payments.order_id` 指向现有订单。
- 支付交易沿用现有 `PaymentTransaction`。
- API 钱包只通过 `api_payments` 和 `api_credit_transactions` 发放。

优点：复用最多。  
风险：现有订单模型可能与 API 套餐/充值语义不完全一致。

## 14. 新增 `api_payments/api_invoices` 方案

方案 B：

- 现有订单系统只负责支付基础能力。
- API 业务用 `api_payments` 表记录 API 产品语义。
- `api_invoices` 用作账单摘要，不承诺自动税务发票。
- 与现有订单表通过 nullable `order_id` 或 `payment_transaction_id` 关联。

优点：API 账务清晰，减少对现有订单模型侵入。  
风险：需要额外后台和对账页面。

MVP 推荐：先采用方案 B 的 API 映射表设计，同时评估现有订单表是否能安全扩展 API 类型。

