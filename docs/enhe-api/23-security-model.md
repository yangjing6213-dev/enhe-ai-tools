# ENHE API Gateway Security Model

Date: 2026-07-05

Status: Phase 2 security draft

## 1. 安全目标

ENHE API Gateway 的安全目标是防止密钥泄露、越权访问、重复扣费、负余额、上游成本失控、支付重复加钱和日志隐私泄露。

阶段 0/1 已确认的底线：

- 主站 Web Session 只用于控制台和后台。
- Gateway 运行时只校验 ENHE API Key。
- API Key 明文只显示一次，数据库只保存 hash。
- 上游 provider key 只存在 Gateway 服务端。
- MVP 默认不保存请求正文。

## 2. API Key 安全

### 生成策略

- Key 格式为 `enhe_sk_live_xxx`。
- `xxx` 使用高强度随机字节编码，长度需满足不可枚举要求。
- Key 前缀建议展示前 12-16 个可识别字符，例如 `enhe_sk_live_abcd...`。
- 创建 Key 时允许用户填写名称，便于按工具或项目区分。

### 存储策略

- 数据库只保存 `key_hash`、`key_prefix`、`key_salt` 或 hash 参数、`hash_version`。
- 完整 Key 只在创建成功响应中返回一次。
- 不在日志、审计 metadata、错误响应、前端状态管理中保存完整 Key。
- Key 列表、日志和后台只展示 `key_prefix`。

### hash 策略

- MVP 可采用服务端 pepper + per-key salt + 安全 hash/KDF。
- pepper 不进入数据库，存放在 Gateway 或主站服务端密钥配置中。
- 支持 `hash_version`，便于后续轮换 hash 算法。
- Gateway 验证时对传入 Key 计算 hash 后查表。

### 撤销机制

- 用户可撤销本人 Key。
- 管理员可撤销任意 Key。
- 撤销写入 `revoked_at`、`revoked_reason`、`status=revoked`。
- Gateway 必须在每次请求校验撤销状态，或使用极短缓存 TTL。
- 撤销不可恢复，只能新建 Key。

### 泄露处理

1. 用户在 `/user/api/logs` 按 Key 前缀排查异常。
2. 用户撤销可疑 Key。
3. Gateway 立即拒绝旧 Key。
4. 用户创建新 Key 并更新工具配置。
5. 管理员可冻结用户、调整限流、关闭模型或进行余额纠错。
6. 所有风控动作写入审计日志。

## 3. 上游密钥安全

- 上游模型供应商密钥只存在 Gateway 服务端。
- 密钥不得进入浏览器、主站公开配置、用户控制台、公开文档或 usage log。
- `api_provider_accounts.secret_ref` 只保存密钥引用，不保存明文。
- 错误日志必须脱敏，不记录上游请求头。

环境变量命名建议只定义名称，不写真实值：

| 名称 | 用途 |
| --- | --- |
| `ENHE_API_GATEWAY_BASE_URL` | Gateway 对外基础 URL |
| `ENHE_API_KEY_PEPPER` | API Key hash pepper |
| `ENHE_GATEWAY_REDIS_URL` | Gateway Redis 连接 |
| `ENHE_PROVIDER_OPENAI_API_KEY` | OpenAI-compatible 上游密钥 |
| `ENHE_PROVIDER_OPENAI_BASE_URL` | OpenAI-compatible 上游地址 |
| `ENHE_PROVIDER_ANTHROPIC_API_KEY` | Anthropic-compatible 上游密钥 |
| `ENHE_PROVIDER_ANTHROPIC_BASE_URL` | Anthropic-compatible 上游地址 |
| `ENHE_GATEWAY_ADMIN_SHARED_SECRET` | 主站与 Gateway 内部管理 hook 的服务间鉴权 |

轮换策略：

- Provider key 需要支持无停机轮换。
- `api_provider_accounts` 可记录 `secret_ref` 版本。
- Gateway 加载密钥时使用短 TTL 或部署刷新。
- 轮换时先添加新密钥，再切换 route，最后禁用旧密钥。

## 4. 用户权限模型

| 场景 | 鉴权方式 | 权限边界 |
| --- | --- | --- |
| 主站用户控制台 | Web Session + CSRF | 用户只能访问本人 API 数据 |
| Gateway 运行时 | ENHE API Key | Key 绑定 user_id 和 developer_profile_id |
| 管理后台 | Admin Web Session + CSRF | 管理员可操作 API 用户、钱包、模型、日志 |
| 服务间 hook | 内部 shared secret 或 mTLS 预留 | 仅允许受信服务刷新模型缓存、发起内部状态同步 |

用户数据隔离要求：

- 所有 `/user/api/*` 查询必须带当前 `user_id` 条件。
- `api_usage_logs`、`api_credit_transactions`、`api_keys` 不允许通过前端传入 user_id 决定访问范围。
- 管理后台读取跨用户数据必须经过 admin gate。
- Gateway 从 Key 反查 user_id，不信任请求体中的用户字段。

## 5. 请求日志隐私

MVP 默认策略：

- 不保存请求正文。
- 不保存响应正文。
- 保存元数据：request id、用户、Key 前缀、模型、token、状态、费用、延迟、错误码、IP hash、User Agent hash。
- 错误信息限制长度，并脱敏上游返回内容。

Phase 2 如需保存请求内容：

- 必须提供用户显式开关。
- 必须更新隐私政策。
- 必须定义保留周期、查看权限、删除流程。
- 管理员查看内容需写审计日志。

## 6. 风控模型

基础控制：

- 新用户默认低额度、低并发、低速率。
- API Key、user_id、IP hash、model、path 多维限流。
- 单请求最大 token 和最大预估成本限制。
- 5 小时消费窗口和 7 天消费窗口。
- 异常消耗触发告警或自动降级。
- 管理员可冻结用户、撤销 Key、关闭模型。

风险信号：

- 短时间大量失败请求。
- 新账号快速消耗赠送额度。
- 多账号共享 IP hash 或 User Agent hash。
- 推荐关系中多个被邀请人无真实调用但试图领奖。
- 单 Key 调用模型或地域分布异常。

## 7. 支付安全

- ZPAY 回调必须验签。
- 回调中的商户号、订单号、金额、状态必须校验。
- 支付回调只写支付状态和 API 发放任务，不直接无幂等加余额。
- 额度发放必须使用 `api_payments.idempotency_key` 和 `api_credit_transactions.idempotency_key`。
- 重复回调返回已处理状态，不重复发放。
- 手动补单必须写 admin audit、原因、前后余额和关联 payment/order。

## 8. 必须修复项

| 风险 | 必须修复标准 |
| --- | --- |
| 明文 API Key | 数据库、日志、页面、后台均不得保存或展示完整 Key，创建响应除外 |
| 上游 Key 泄露 | 上游密钥仅服务端可用，错误日志脱敏 |
| 用户可读他人日志 | 控制台所有查询强制当前 user_id |
| 管理后台无权限控制 | `/admin/api/*` 必须 admin gate + CSRF |
| 余额可扣为负数 | 钱包扣费使用事务和锁，不允许负余额 |
| 支付回调可重复加钱 | 支付和额度发放全链路幂等 |
| 无 API 限流 | Gateway 上线前必须有 Redis 限流和 DB 兜底策略 |
| 无法冻结异常用户 | 管理员冻结状态必须被 Gateway 读取并生效 |

## 9. 阶段 3 安全验收

- API Key 生成、hash、撤销有测试。
- 控制台跨用户访问有测试。
- Gateway 余额不足不调用上游有测试。
- 支付回调重复执行不重复发放有测试。
- 文档和日志做 secret-pattern 扫描。
- 管理员关键动作写审计日志。

