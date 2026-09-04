# ENHE API Gateway Database Design Draft

Date: 2026-07-05

Status: Phase 2 schema draft. Do not apply as a migration yet.

## 1. 设计原则

- 本文只设计数据库草案，不修改真实 `prisma/schema.prisma`，不创建 migration。
- 新表优先使用 `api_` 前缀，避免污染现有业务表。
- 复用现有 `users`、订单、支付、管理员审计基础，但 API 钱包、日志、Key、模型路由必须独立建模。
- 所有金额使用 Decimal 兼容字段，建议 Decimal(18, 8) 或按最终财务精度确认。
- Gateway 热路径需要低查询成本：API Key、模型路由、钱包、日志表必须有明确索引。
- 扣费必须支持并发安全、幂等处理和防负余额。
- 请求日志必须支持用户侧查询、管理员排查和后续归档。

## 2. 复用与新增边界

| 能力 | 复用现有表/能力 | 新增 API 表 |
| --- | --- | --- |
| 用户身份 | `users` | `api_developer_profiles` |
| Web Session | `sessions`，仅主站使用 | Gateway 不读取 Session |
| 管理员权限 | 现有 admin gate | `api_admin_audit_logs` 可独立或映射到现有审计 |
| 支付订单 | 现有订单/ZPAY 能力可作为入口 | `api_payments`、`api_invoices`、`api_credit_transactions` |
| 余额账本 | 不复用现有 VIP/工具权益 | `api_wallets`、`api_credit_transactions` |
| 运行时 API | 无现有表 | `api_keys`、`api_usage_logs`、`api_model_routes`、`api_rate_limit_*` |

## 3. 表设计

### `api_developer_profiles`

| 项 | 设计 |
| --- | --- |
| 表用途 | 用户 API 开发者资料和 API 服务状态。 |
| 关键字段 | `id`, `user_id`, `developer_code`, `display_name`, `email_snapshot`, `status`, `suspended_reason`, `suspended_at`, `created_at`, `updated_at` |
| 字段类型建议 | `id String/UUID`, `user_id String`, `developer_code String`, `status Enum(active,suspended,pending)`, timestamps |
| 索引建议 | unique `user_id`; unique `developer_code`; index `(status, created_at)` |
| 关联关系 | `user_id` 关联现有 `users.id`; 与 `api_keys`, `api_wallets`, `api_usage_logs` 通过 user_id 关联 |
| 写入方 | 主站初始化；管理后台冻结/解冻 |
| 读取方 | 主站、Gateway、管理后台 |
| 数据保留策略 | 账号存在期间保留；注销后按法律策略匿名化或删除可删除字段 |
| 风险点 | 冻结状态未同步会导致异常用户继续调用；email snapshot 需避免成为身份真源 |

### `api_keys`

| 项 | 设计 |
| --- | --- |
| 表用途 | 存储 API Key 的 hash、前缀、状态和使用记录。 |
| 关键字段 | `id`, `user_id`, `developer_profile_id`, `name`, `key_hash`, `key_prefix`, `key_salt`, `hash_version`, `status`, `scopes`, `last_used_at`, `last_used_ip_hash`, `revoked_at`, `revoked_reason`, `created_at` |
| 字段类型建议 | `key_hash String`, `key_prefix String`, `key_salt String nullable if keyed hash`, `status Enum(active,revoked)`, `scopes Json`, timestamps |
| 索引建议 | unique `key_hash`; index `(user_id, status)`; index `key_prefix`; index `last_used_at`; partial index active keys if supported |
| 关联关系 | 关联 `users`, `api_developer_profiles`, `api_usage_logs` |
| 写入方 | 主站创建/撤销；管理后台撤销；Gateway 更新 last_used |
| 读取方 | 主站、Gateway、管理后台 |
| 数据保留策略 | revoked key 保留至少 180 天用于安全审计；明文永不保存 |
| 风险点 | 明文 Key 泄露、hash 策略过弱、撤销不即时生效、Key 前缀冲突 |

API Key 必须满足：

- Key 格式：`enhe_sk_live_xxx`。
- 数据库只保存 `key_hash`。
- 保存 `key_prefix` 用于展示和支持排查。
- 保存 `key_salt` 或使用服务端 pepper + 安全 KDF/hash 策略。
- 完整 Key 只在创建时返回一次。
- 支持 `revoked_at`、`last_used_at`、`active/revoked` 状态。

### `api_provider_accounts`

| 项 | 设计 |
| --- | --- |
| 表用途 | 记录上游 provider 的配置元数据、状态和成本规则引用。 |
| 关键字段 | `id`, `provider_code`, `display_name`, `base_url`, `secret_ref`, `status`, `priority`, `timeout_ms`, `created_at`, `updated_at` |
| 字段类型建议 | `secret_ref String` 存密钥引用，不存明文；`status Enum(active,disabled,maintenance)` |
| 索引建议 | unique `provider_code`; index `(status, priority)` |
| 关联关系 | 被 `api_model_routes` 引用 |
| 写入方 | 管理后台 |
| 读取方 | Gateway、管理后台 |
| 数据保留策略 | 配置变更保留审计；禁用 provider 不立即删除 |
| 风险点 | 明文上游密钥入库、禁用状态未生效、base_url 被错误配置 |

### `api_model_routes`

| 项 | 设计 |
| --- | --- |
| 表用途 | 公开模型名到上游 provider/model 的路由和价格配置。 |
| 关键字段 | `id`, `public_model_name`, `provider_account_id`, `upstream_model`, `status`, `input_price_usd_per_1k`, `output_price_usd_per_1k`, `cache_read_price_usd_per_1k`, `cache_write_price_usd_per_1k`, `max_tokens`, `supports_stream`, `created_at`, `updated_at` |
| 字段类型建议 | price fields Decimal; `status Enum(active,disabled,deprecated)`; booleans |
| 索引建议 | unique `(public_model_name, status)` if active-only supported; index `(status, public_model_name)`; index `provider_account_id` |
| 关联关系 | 关联 `api_provider_accounts`; 被 `api_usage_logs` 引用模型快照 |
| 写入方 | 管理后台 |
| 读取方 | 主站公开模型列表、Gateway、管理后台 |
| 数据保留策略 | 禁用/废弃路由保留历史；日志使用模型名快照避免价格追溯错误 |
| 风险点 | 改价影响历史账单、关闭模型未影响 Gateway、公开模型名与上游模型混淆 |

### `api_plans`

| 项 | 设计 |
| --- | --- |
| 表用途 | API 套餐和可购买额度包配置。 |
| 关键字段 | `id`, `plan_code`, `name`, `status`, `price_usd`, `grant_amount_usd`, `billing_period`, `rate_limit_policy_id`, `model_permissions`, `valid_days`, `created_at`, `updated_at` |
| 字段类型建议 | Decimal 金额；`billing_period Enum(one_time,monthly,manual)`; `model_permissions Json` |
| 索引建议 | unique `plan_code`; index `(status, created_at)` |
| 关联关系 | 关联 `api_subscriptions`, `api_payments`, `api_invoices` |
| 写入方 | 管理后台 |
| 读取方 | 主站、管理后台、Gateway 读取权限摘要 |
| 数据保留策略 | 下架计划保留，不删除历史订单引用 |
| 风险点 | 套餐承诺与实际模型权限不一致；价格变更影响老订单解释 |

### `api_subscriptions`

| 项 | 设计 |
| --- | --- |
| 表用途 | 用户套餐订阅或套餐权益记录。 |
| 关键字段 | `id`, `user_id`, `plan_id`, `status`, `starts_at`, `ends_at`, `granted_amount_usd`, `source_payment_id`, `created_at`, `updated_at` |
| 字段类型建议 | Decimal `granted_amount_usd`; `status Enum(active,expired,canceled,pending)` |
| 索引建议 | index `(user_id, status, ends_at)`; index `plan_id`; index `source_payment_id` |
| 关联关系 | 关联 `users`, `api_plans`, `api_payments`, `api_credit_transactions` |
| 写入方 | 主站、支付回调、管理后台 |
| 读取方 | 主站、Gateway、管理后台 |
| 数据保留策略 | 长期保留用于账单追溯 |
| 风险点 | 套餐过期后权限未失效；重复发放套餐余额 |

### `api_wallets`

| 项 | 设计 |
| --- | --- |
| 表用途 | 用户 API 钱包余额汇总。 |
| 关键字段 | `id`, `user_id`, `plan_balance_usd`, `recharge_balance_usd`, `referral_balance_usd`, `locked_balance_usd`, `version`, `created_at`, `updated_at` |
| 字段类型建议 | Decimal balances; `version Int` for optimistic lock |
| 索引建议 | unique `user_id`; index `updated_at` |
| 关联关系 | 关联 `users`; 与 `api_credit_transactions` 一对多 |
| 写入方 | Gateway 扣费；主站/支付回调发放；管理后台调整 |
| 读取方 | 主站、Gateway、管理后台 |
| 数据保留策略 | 用户存在期间保留；注销后按账务要求保留匿名余额流水 |
| 风险点 | 并发扣费导致负余额；余额汇总与流水不一致 |

钱包余额必须区分：

- `plan_balance_usd`
- `recharge_balance_usd`
- `referral_balance_usd`

### `api_credit_transactions`

| 项 | 设计 |
| --- | --- |
| 表用途 | API 钱包不可变余额流水。 |
| 关键字段 | `id`, `user_id`, `wallet_id`, `usage_log_id`, `payment_id`, `referral_id`, `admin_audit_id`, `idempotency_key`, `transaction_type`, `amount_usd`, `balance_after`, `balance_bucket`, `reason`, `created_at` |
| 字段类型建议 | Decimal `amount_usd`; Json `balance_after`; `transaction_type Enum(plan_grant,recharge,referral_reward,api_charge,admin_adjustment,refund,correction)` |
| 索引建议 | unique `idempotency_key`; index `(user_id, created_at)`; index `usage_log_id`; index `payment_id`; index `transaction_type` |
| 关联关系 | 关联 `api_wallets`, `api_usage_logs`, `api_payments`, `api_referrals`, `api_admin_audit_logs` |
| 写入方 | Gateway、支付回调、管理后台 |
| 读取方 | 主站、管理后台、对账任务 |
| 数据保留策略 | 账务流水长期保留，不物理删除 |
| 风险点 | 重复扣费、无关联来源、缺失余额快照、手动调整不可审计 |

扣费流水必须能追溯：

- `usage_log_id`
- `payment_id`
- `referral_id`
- `admin_audit_id`
- `transaction_type`
- `amount_usd`
- `balance_after`

### `api_usage_logs`

| 项 | 设计 |
| --- | --- |
| 表用途 | Gateway 每次请求的元数据日志和计费依据。 |
| 关键字段 | `request_id`, `user_id`, `api_key_id`, `method`, `path`, `model`, `public_model_name`, `upstream_provider`, `upstream_model`, `status_code`, `input_tokens`, `output_tokens`, `cache_read_tokens`, `cache_write_tokens`, `cost_usd`, `charged_usd`, `latency_ms`, `is_stream`, `error_code`, `error_message`, `client_ip_hash`, `user_agent_hash`, `billing_status`, `created_at` |
| 字段类型建议 | token counts Int; cost/charged Decimal; `is_stream Boolean`; `billing_status Enum(not_billable,pending,billed,review)` |
| 索引建议 | unique `request_id`; index `(user_id, created_at)`; index `(api_key_id, created_at)`; index `(public_model_name, created_at)`; index `(status_code, created_at)`; index `error_code` |
| 关联关系 | 关联 `users`, `api_keys`, `api_credit_transactions` |
| 写入方 | Gateway |
| 读取方 | 主站、管理后台、对账任务 |
| 数据保留策略 | MVP 元数据日志建议保留 180-365 天；聚合数据长期保留 |
| 风险点 | 日志量压垮 PostgreSQL；错误信息泄露敏感内容；日志与扣费不一致 |

MVP 不保存请求正文和响应正文。

### `api_rate_limit_policies`

| 项 | 设计 |
| --- | --- |
| 表用途 | 限流策略配置。 |
| 关键字段 | `id`, `policy_code`, `name`, `status`, `per_minute_requests`, `per_hour_requests`, `five_hour_spend_usd`, `seven_day_spend_usd`, `max_tokens_per_request`, `max_cost_per_request_usd`, `created_at`, `updated_at` |
| 字段类型建议 | Int counters; Decimal spend/cost; `status Enum(active,disabled)` |
| 索引建议 | unique `policy_code`; index `status` |
| 关联关系 | 被 `api_plans`, `api_developer_profiles` 或用户配置引用 |
| 写入方 | 管理后台 |
| 读取方 | Gateway、主站、管理后台 |
| 数据保留策略 | 旧策略保留以解释历史限流 |
| 风险点 | 策略过松导致成本暴涨；过严影响新用户首次成功调用 |

### `api_rate_limit_windows`

| 项 | 设计 |
| --- | --- |
| 表用途 | 数据库兜底的限流窗口记录，Redis 不可用或对账时使用。 |
| 关键字段 | `id`, `scope_type`, `scope_id`, `window_type`, `window_start`, `request_count`, `spend_usd`, `updated_at` |
| 字段类型建议 | `scope_type Enum(ip,user,api_key,model,path,plan)`; Decimal `spend_usd` |
| 索引建议 | unique `(scope_type, scope_id, window_type, window_start)`; index `(window_type, window_start)` |
| 关联关系 | 逻辑关联 user/key/model，不强制所有外键 |
| 写入方 | Gateway 兜底或异步汇总 |
| 读取方 | Gateway、管理后台 |
| 数据保留策略 | 短窗口 7-30 天；聚合后可清理 |
| 风险点 | 高并发下写放大；不能替代 Redis 热路径 |

### `api_payments`

| 项 | 设计 |
| --- | --- |
| 表用途 | API 套餐/充值与现有订单支付的映射和发放状态。 |
| 关键字段 | `id`, `user_id`, `order_id`, `payment_transaction_id`, `plan_id`, `payment_type`, `amount_paid_usd`, `grant_amount_usd`, `status`, `provider`, `provider_trade_no`, `credited_at`, `idempotency_key`, `created_at`, `updated_at` |
| 字段类型建议 | Decimal amounts; `status Enum(pending,paid,credited,failed,refunded,canceled)` |
| 索引建议 | unique `idempotency_key`; unique nullable `provider_trade_no`; index `(user_id, created_at)`; index `(status, created_at)` |
| 关联关系 | 关联现有 order/payment transaction 可为空；关联 `api_plans`, `api_credit_transactions` |
| 写入方 | 主站、支付回调、管理后台补单 |
| 读取方 | 主站、管理后台、对账任务 |
| 数据保留策略 | 支付记录长期保留 |
| 风险点 | 重复回调重复加钱；订单金额与发放额度不一致 |

### `api_invoices`

| 项 | 设计 |
| --- | --- |
| 表用途 | API 用户账单/发票占位记录，MVP 可作为账单摘要，不做自动发票。 |
| 关键字段 | `id`, `user_id`, `invoice_no`, `period_start`, `period_end`, `amount_usd`, `status`, `payment_id`, `created_at` |
| 字段类型建议 | Decimal amount; `status Enum(draft,issued,void)` |
| 索引建议 | unique `invoice_no`; index `(user_id, created_at)`; index `payment_id` |
| 关联关系 | 关联 `api_payments` |
| 写入方 | 主站或后台任务 |
| 读取方 | 主站、管理后台 |
| 数据保留策略 | 财务记录长期保留 |
| 风险点 | 与真实发票概念混淆；MVP 文案需称账单记录而非税务发票 |

### `api_referral_codes`

| 项 | 设计 |
| --- | --- |
| 表用途 | 用户 API 推荐码。 |
| 关键字段 | `id`, `user_id`, `code`, `status`, `created_at`, `disabled_at` |
| 字段类型建议 | `status Enum(active,disabled)` |
| 索引建议 | unique `code`; unique `user_id`; index `status` |
| 关联关系 | 关联 `users`, `api_referrals` |
| 写入方 | 主站 |
| 读取方 | 主站、管理后台 |
| 数据保留策略 | 禁用码保留，避免复用导致争议 |
| 风险点 | 推荐码枚举、伪造邀请关系 |

### `api_referrals`

| 项 | 设计 |
| --- | --- |
| 表用途 | 推荐关系、激活状态和奖励发放记录。 |
| 关键字段 | `id`, `referrer_user_id`, `referred_user_id`, `referral_code_id`, `status`, `verified_at`, `first_valid_usage_log_id`, `rewarded_at`, `reward_amount_usd`, `risk_flags`, `created_at` |
| 字段类型建议 | Decimal reward; `status Enum(pending,verified,rewarded,blocked)`; Json risk flags |
| 索引建议 | unique `referred_user_id`; index `(referrer_user_id, created_at)`; index `status`; index `first_valid_usage_log_id` |
| 关联关系 | 关联 `users`, `api_referral_codes`, `api_usage_logs`, `api_credit_transactions` |
| 写入方 | 主站、Gateway 首次有效调用触发、管理后台 |
| 读取方 | 主站、管理后台 |
| 数据保留策略 | 推荐关系长期保留；风险字段按隐私策略保留 |
| 风险点 | 注册刷量、同人多号、奖励重复发放 |

### `api_admin_audit_logs`

| 项 | 设计 |
| --- | --- |
| 表用途 | API 模块管理员操作审计；也可映射到现有 `AdminAuditLog`。 |
| 关键字段 | `id`, `admin_user_id`, `action`, `target_type`, `target_id`, `summary`, `metadata`, `ip_hash`, `user_agent_hash`, `created_at` |
| 字段类型建议 | Json `metadata`; hash fields String |
| 索引建议 | index `(admin_user_id, created_at)`; index `(target_type, target_id)`; index `(action, created_at)` |
| 关联关系 | 可关联 `users`; 被 `api_credit_transactions.admin_audit_id` 引用 |
| 写入方 | 管理后台 |
| 读取方 | 管理后台、合规审计 |
| 数据保留策略 | 长期保留，不允许普通删除 |
| 风险点 | 管理员调余额或冻结无审计；metadata 泄露敏感信息 |

### `api_gateway_idempotency_keys`

| 项 | 设计 |
| --- | --- |
| 表用途 | Gateway 请求、扣费、支付发放的幂等保护。 |
| 关键字段 | `id`, `idempotency_key`, `scope`, `request_id`, `user_id`, `status`, `result_ref`, `expires_at`, `created_at`, `updated_at` |
| 字段类型建议 | `scope Enum(gateway_request,billing_charge,payment_credit,referral_reward)`; `status Enum(started,succeeded,failed)` |
| 索引建议 | unique `(scope, idempotency_key)`; index `(expires_at)`; index `(user_id, created_at)` |
| 关联关系 | 逻辑关联 usage log、payment、credit transaction |
| 写入方 | Gateway、支付回调、推荐奖励任务 |
| 读取方 | Gateway、支付回调、对账任务 |
| 数据保留策略 | 短期幂等记录 30-90 天；支付相关可长期保留摘要 |
| 风险点 | 幂等 key 粒度错误导致重复扣费或误拒绝正常请求 |

## 4. 并发扣费建议

MVP 扣费应采用数据库事务：

1. 根据 `request_id` 或结算幂等 key 查询是否已扣费。
2. 锁定 `api_wallets` 当前用户行，或使用 `version` 乐观锁。
3. 按扣费顺序扣减 `plan_balance_usd`、`recharge_balance_usd`、`referral_balance_usd`。
4. 若余额不足则回滚，不写 `api_charge`，usage log 标记余额不足。
5. 写入 `api_credit_transactions`，记录 `balance_after`。
6. 更新 usage log 的 `billing_status`。

扣费顺序与钱包设计详见 `docs/enhe-api/25-billing-wallet-design.md`。

## 5. 日志查询性能建议

- `api_usage_logs` 按 `created_at`、`user_id`、`api_key_id`、`public_model_name`、`status_code` 建索引。
- 用户控制台默认查询最近 7 天，最长 90 天。
- 管理后台默认查询最近 24 小时，长区间需要强筛选条件。
- 日志量增长后考虑按月分区或同步到 ClickHouse。
- 错误信息字段限制长度，避免大文本进入行存储。

## 6. 阶段 3 前需确认

- Prisma 命名风格采用 camelCase model + snake_case map，还是直接 snake_case。
- API 金额精度和结算币种是否统一为 USD 计价。
- 是否新增独立 `api_admin_audit_logs`，或复用现有 admin audit 表。
- 现有订单表能否扩展 API 订单类型，还是必须使用 `api_payments` 独立映射。

