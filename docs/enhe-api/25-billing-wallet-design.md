# ENHE API Gateway Billing And Wallet Design

Date: 2026-07-05

Status: Phase 2 billing draft

## 1. 设计目标

钱包与扣费系统必须解决四件事：

- 用户余额可解释：余额来源清楚，用户能理解。
- 扣费可追溯：每笔扣费能关联 request id、usage log 和模型。
- 并发安全：并发请求不能造成负余额或重复扣费。
- 支付安全：支付成功只幂等发放一次额度。

## 2. 钱包余额类型

`api_wallets` 必须区分三个余额桶：

| 余额字段 | 来源 | 用途 | 退款倾向 |
| --- | --- | --- | --- |
| `plan_balance_usd` | 套餐发放、管理员开通套餐 | 优先消费，适合有有效期或套餐权益 | 按套餐规则处理 |
| `recharge_balance_usd` | 用户充值、补单发放 | 用户付费余额 | 未消耗部分可按规则退款 |
| `referral_balance_usd` | 推荐奖励、活动赠送 | 增长奖励和试用 | 通常不可提现，不退现金 |

所有字段使用 Decimal，不使用浮点数。

## 3. 扣费顺序

MVP 扣费顺序固定为：

1. `plan_balance_usd`
2. `recharge_balance_usd`
3. `referral_balance_usd`

原因：

- 套餐额度通常有有效期和模型范围，应优先消耗。
- 充值余额更接近现金，应在套餐额度后消耗。
- 推荐余额是奖励性质，放在最后降低滥用收益。

每次扣费需要记录各余额桶扣减前后状态，写入 `api_credit_transactions.balance_after`。

## 4. 余额检查策略

### 请求前预检查

Gateway 在调用上游前必须做预检查：

- 用户 API 状态 active。
- 模型 active。
- 钱包总余额大于 0。
- 请求 `max_tokens` 不超过模型和套餐上限。
- 单请求最大预估成本不超过用户/套餐/模型限制。

预检查失败时：

- 返回 `402 insufficient_credit` 或对应错误。
- 不调用上游 provider。
- 写失败 usage log。
- 不写 `api_charge` 扣费流水。

### 请求后实际结算

请求成功后按实际 token 结算：

- `input_tokens`
- `output_tokens`
- `cache_read_tokens`
- `cache_write_tokens`
- 模型价格快照
- ENHE 收费规则

结算金额写入 `charged_usd`，上游成本写入 `cost_usd`。两者都应是 Decimal。

### `max_tokens` 风险控制

- 用户请求 `max_tokens` 为空时，Gateway 应设置模型默认上限。
- 用户请求超过模型或套餐上限时拒绝或裁剪，MVP 建议拒绝并返回明确错误。
- 超高上下文模型需要单独设置更严格的单请求最大成本。

### 单请求最大成本限制

每个请求在上游调用前计算粗略最大成本：

```text
estimated_max_cost = input_estimate + max_tokens * output_price
```

如果超过用户、Key、模型或套餐限制，返回 `402 insufficient_credit` 或 `429 rate_limit_exceeded`，避免一次请求耗尽余额。

## 5. 并发安全

MVP 推荐事务模型：

1. 使用 `request_id` 创建或查询幂等记录。
2. 成功拿到幂等执行权后进入结算。
3. 数据库事务内锁定 `api_wallets` 用户行，或使用 `version` 乐观锁。
4. 检查总余额是否足够支付实际 `charged_usd`。
5. 按余额桶顺序扣减。
6. 写入 `api_credit_transactions`。
7. 更新 `api_usage_logs.billing_status`。
8. 提交事务。

必须防止：

- 余额扣为负数。
- 同一 `request_id` 重复扣费。
- usage log 成功但扣费流水缺失。
- 扣费流水存在但 usage log 缺失。

## 6. 失败请求计费

| 场景 | 是否扣费 | 处理 |
| --- | --- | --- |
| Gateway 鉴权失败 | 不扣费 | 写失败日志，可不关联用户 |
| Gateway 限流拒绝 | 不扣费 | 写失败日志 |
| Gateway 余额不足拒绝 | 不扣费 | 写失败日志，不调用上游 |
| 模型关闭或不存在 | 不扣费 | 写失败日志 |
| 上游未产生 token | 不扣费 | 写上游失败日志 |
| 上游已产生可确认 token 但中途失败 | 可按可确认 token 处理 | usage log 标记 partial，扣费或待审计按政策执行 |
| 无法确认 token | 不自动扣费 | `billing_status=review`，管理员审计 |

MVP 不应对无法确认 token 的失败请求直接扣费。

## 7. `api_credit_transactions` 类型

| 类型 | 含义 | 金额方向 |
| --- | --- | --- |
| `plan_grant` | 套餐发放额度 | 正数 |
| `recharge` | 充值发放额度 | 正数 |
| `referral_reward` | 推荐奖励 | 正数 |
| `api_charge` | API 请求扣费 | 负数 |
| `admin_adjustment` | 管理员手动调整 | 正数或负数 |
| `refund` | 退款或余额回退 | 负数或按财务规则 |
| `correction` | 纠错补偿或冲正 | 正数或负数 |

每条流水必须包含：

- `transaction_type`
- `amount_usd`
- `balance_after`
- 来源引用：`usage_log_id`、`payment_id`、`referral_id`、`admin_audit_id` 至少一个或明确 reason。

## 8. 退款和纠错机制

退款原则：

- 已消耗额度不直接退回，除非属于系统错误或服务不可用补偿。
- 未消耗充值余额可按法律条款处理。
- 推荐余额通常不退现金。
- 套餐余额按套餐条款处理。

纠错流程：

1. 管理员定位 request id、payment id 或 referral id。
2. 计算应调整金额。
3. 创建 `correction` 或 `refund` 流水。
4. 更新钱包余额。
5. 写 admin audit。
6. 在用户账单页展示调整原因的用户可见摘要。

## 9. 管理员手动调整余额流程

1. 管理员进入 `/admin/api/wallets`。
2. 搜索用户。
3. 选择余额桶。
4. 输入 Decimal 金额和原因。
5. 系统校验扣减后不能为负。
6. 写入 `api_admin_audit_logs`。
7. 事务内更新 `api_wallets`，写 `api_credit_transactions.admin_adjustment`。
8. 返回调整后余额。

大额调整建议 Phase 2 增加二次确认或双人审批。

## 10. 与 usage log 的关系

- 每个成功可计费 usage log 应最多对应一组 `api_charge` 流水。
- 一次请求如果跨多个余额桶扣费，可以有一条流水记录 Json 明细，或多条流水分别对应桶；MVP 建议一条流水 + `balance_after` 快照，降低复杂度。
- `api_usage_logs.charged_usd` 应等于对应 `api_credit_transactions.amount_usd` 的绝对值。
- 失败不扣费请求保留 usage log，但没有 `api_charge`。

## 11. 对账策略

每日对账任务建议检查：

- 钱包余额 = 初始余额 + 所有流水汇总。
- usage log 中 `billing_status=billed` 均有关联扣费流水。
- `api_credit_transactions.api_charge` 均有关联 usage log。
- 支付成功 `api_payments.status=credited` 均有关联充值或套餐发放流水。
- 推荐已奖励均有关联 `referral_reward` 流水。

发现不一致时：

- 标记异常。
- 不自动删除流水。
- 通过 `correction` 纠错。

