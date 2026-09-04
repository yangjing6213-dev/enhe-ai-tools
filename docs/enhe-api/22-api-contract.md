# ENHE API Gateway API Contract Draft

Date: 2026-07-05

Status: Phase 2 contract draft

## 1. 通用约定

本文只定义合约草案，不创建业务代码。

通用响应要求：

- Gateway 每个响应包含或返回可追踪 `request_id`。
- 主站控制台接口使用现有 Web Session 鉴权。
- Gateway 接口使用 `Authorization: Bearer <ENHE_API_KEY>`。
- 完整 API Key 只在创建接口响应中出现一次。
- 所有错误使用 ENHE 自有错误码，不透出上游密钥、内部栈或数据库细节。

Gateway 错误码：

| HTTP | code | 含义 |
| --- | --- | --- |
| 401 | `invalid_api_key` | API Key 缺失、格式错误、hash 不存在或已撤销 |
| 403 | `developer_suspended` | 用户或开发者资料被冻结 |
| 402 | `insufficient_credit` | 可用余额不足或单请求最大成本超限 |
| 429 | `rate_limit_exceeded` | 命中 IP、用户、Key、模型、路径或套餐限流 |
| 404 | `model_not_found` | 请求模型不存在 |
| 423 | `model_disabled` | 模型存在但已关闭或维护 |
| 502 | `upstream_error` | 上游 provider 错误 |
| 500 | `internal_error` | Gateway 内部错误 |

Gateway 错误体建议：

```json
{
  "error": {
    "code": "insufficient_credit",
    "message": "API credit is insufficient.",
    "request_id": "<request_id>",
    "docs_url": "https://www.enhe-tech.com.cn/ai-api/docs"
  }
}
```

## 2. Gateway MVP 接口

### `GET /v1/models`

| 项 | 合约 |
| --- | --- |
| 路径 | `/v1/models` |
| 方法 | GET |
| 调用方 | Codex、OpenAI-compatible 客户端、用户应用 |
| 鉴权方式 | `Authorization: Bearer <ENHE_API_KEY>` |
| 请求参数 | 无必填；可选 `include_disabled=false` 仅管理员内部调试预留 |
| 响应字段 | `object`, `data[]`, `data[].id`, `data[].object`, `data[].owned_by`, `data[].status` |
| 错误码 | `invalid_api_key`, `developer_suspended`, `rate_limit_exceeded`, `internal_error` |
| 权限要求 | active API Key；开发者未冻结 |
| 幂等要求 | 只读接口，自然幂等 |
| 日志要求 | 写 usage log，`path=/v1/models`，通常不扣费 |
| 安全注意事项 | 不返回上游 provider 密钥、真实成本或内部 route id |

### `POST /v1/chat/completions`

| 项 | 合约 |
| --- | --- |
| 路径 | `/v1/chat/completions` |
| 方法 | POST |
| 调用方 | Codex、OpenAI-compatible 客户端、用户应用 |
| 鉴权方式 | `Authorization: Bearer <ENHE_API_KEY>` |
| 请求参数 | `model`, `messages`, `stream`, `max_tokens`, `temperature` 等兼容字段；未知字段按兼容策略透传或忽略 |
| 响应字段 | 非流式返回 `id`, `object`, `created`, `model`, `choices`, `usage`; 流式返回 SSE chunks |
| 错误码 | Gateway 通用错误码全部适用 |
| 权限要求 | active API Key；模型 active；余额和限流通过 |
| 幂等要求 | 客户端可传 `Idempotency-Key`；Gateway 使用 `request_id` + key 防重复扣费 |
| 日志要求 | 写 usage log；成功可计费请求写扣费流水；余额不足写失败日志但不扣费 |
| 安全注意事项 | MVP 不保存 `messages` 正文；错误映射需脱敏 |

### `POST /v1/messages`

| 项 | 合约 |
| --- | --- |
| 路径 | `/v1/messages` |
| 方法 | POST |
| 调用方 | Claude Code、Anthropic-compatible 客户端、用户应用 |
| 鉴权方式 | `Authorization: Bearer <ENHE_API_KEY>` |
| 请求参数 | `model`, `messages`, `max_tokens`, `stream`, `system` 等兼容字段 |
| 响应字段 | 非流式返回 `id`, `type`, `role`, `content`, `model`, `usage`; 流式按 Anthropic-compatible event 结构返回 |
| 错误码 | Gateway 通用错误码全部适用 |
| 权限要求 | active API Key；模型 active；余额和限流通过 |
| 幂等要求 | 同 `/v1/chat/completions` |
| 日志要求 | 记录 `path=/v1/messages`，区分 stream 与非 stream |
| 安全注意事项 | 不透出上游原始敏感错误；不保存请求正文 |

## 3. 主站用户控制台接口

具体实现可使用 Next.js Server Actions 或 Route Handlers；合约名称用于阶段 3 拆任务。

### 创建 API Key

| 项 | 合约 |
| --- | --- |
| 路径 | `/user/api/keys/create` 或 Server Action `createApiKey` |
| 方法 | POST |
| 调用方 | `/user/api/keys` |
| 鉴权方式 | Web Session + CSRF |
| 请求参数 | `name`, optional `scopes` |
| 响应字段 | `id`, `key`, `key_prefix`, `created_at`；`key` 只返回一次 |
| 错误码 | `unauthorized`, `developer_not_initialized`, `key_limit_reached`, `validation_error` |
| 权限要求 | 登录用户只能为自己创建 |
| 幂等要求 | 不对重复点击返回同一明文；前端需禁用重复提交 |
| 日志要求 | 写 API admin/user action log，可记录 key prefix |
| 安全注意事项 | 不写完整 key 到日志；hash 后入库 |

### API Key 列表

| 项 | 合约 |
| --- | --- |
| 路径 | `/user/api/keys/list` 或 Server Action `listApiKeys` |
| 方法 | GET |
| 调用方 | `/user/api/keys` |
| 鉴权方式 | Web Session |
| 请求参数 | `status`, `page`, `page_size` |
| 响应字段 | `id`, `name`, `key_prefix`, `status`, `last_used_at`, `created_at`, `revoked_at` |
| 错误码 | `unauthorized` |
| 权限要求 | 只能读取本人 Key |
| 幂等要求 | 只读 |
| 日志要求 | 普通列表读取不必写审计，异常访问写安全日志 |
| 安全注意事项 | 不返回完整 key 或 key_hash |

### 撤销 API Key

| 项 | 合约 |
| --- | --- |
| 路径 | `/user/api/keys/revoke` 或 Server Action `revokeApiKey` |
| 方法 | POST |
| 调用方 | `/user/api/keys` |
| 鉴权方式 | Web Session + CSRF |
| 请求参数 | `api_key_id`, `reason` |
| 响应字段 | `id`, `status`, `revoked_at` |
| 错误码 | `unauthorized`, `not_found`, `already_revoked` |
| 权限要求 | 用户只能撤销本人 Key；管理员走后台接口 |
| 幂等要求 | 重复撤销返回当前 revoked 状态 |
| 日志要求 | 写用户安全事件或 API 审计 |
| 安全注意事项 | 撤销后 Gateway 必须拒绝 |

### 获取用量摘要

| 项 | 合约 |
| --- | --- |
| 路径 | `/user/api/usage/summary` |
| 方法 | GET |
| 调用方 | `/user/api`, `/user/api/usage` |
| 鉴权方式 | Web Session |
| 请求参数 | `range=24h|7d|30d` |
| 响应字段 | `balances`, `total_charged_usd`, `request_count`, `error_count`, `model_breakdown`, `recent_transactions` |
| 错误码 | `unauthorized`, `range_too_large` |
| 权限要求 | 本人数据 |
| 幂等要求 | 只读 |
| 日志要求 | 不写业务日志；慢查询可写应用日志 |
| 安全注意事项 | 金额用 Decimal 字符串返回 |

### 请求日志列表

| 项 | 合约 |
| --- | --- |
| 路径 | `/user/api/logs/list` |
| 方法 | GET |
| 调用方 | `/user/api/logs` |
| 鉴权方式 | Web Session |
| 请求参数 | `from`, `to`, `model`, `status_code`, `api_key_prefix`, `request_id`, `page`, `page_size` |
| 响应字段 | `items[]`, `request_id`, `path`, `model`, `status_code`, `charged_usd`, `latency_ms`, `created_at`, `error_code` |
| 错误码 | `unauthorized`, `range_too_large`, `not_found` |
| 权限要求 | 本人日志 |
| 幂等要求 | 只读 |
| 日志要求 | 查询不写 usage log |
| 安全注意事项 | 不返回 prompt/completion，不返回完整 API Key |

### 套餐账单列表

| 项 | 合约 |
| --- | --- |
| 路径 | `/user/api/billing/list` |
| 方法 | GET |
| 调用方 | `/user/api/billing` |
| 鉴权方式 | Web Session |
| 请求参数 | `status`, `page`, `page_size` |
| 响应字段 | `plans`, `payments`, `invoices`, `wallet_balances` |
| 错误码 | `unauthorized` |
| 权限要求 | 本人账单 |
| 幂等要求 | 只读 |
| 日志要求 | 不写审计 |
| 安全注意事项 | 支付详情只展示必要状态，不展示支付密钥或回调原文 |

### 推荐数据

| 项 | 合约 |
| --- | --- |
| 路径 | `/user/api/referrals/summary` |
| 方法 | GET |
| 调用方 | `/user/api/referrals` |
| 鉴权方式 | Web Session |
| 请求参数 | 无必填 |
| 响应字段 | `referral_code`, `invite_url`, `pending_count`, `rewarded_count`, `rewards`, `items[]` |
| 错误码 | `unauthorized`, `referral_disabled` |
| 权限要求 | 本人推荐数据 |
| 幂等要求 | 只读；生成推荐码需唯一约束 |
| 日志要求 | 不写业务日志 |
| 安全注意事项 | 不展示被邀请人敏感身份信息 |

### 开发者资料

| 项 | 合约 |
| --- | --- |
| 路径 | `/user/api/profile` |
| 方法 | GET/POST |
| 调用方 | `/user/api/profile`, 首次进入 `/user/api` |
| 鉴权方式 | Web Session + POST CSRF |
| 请求参数 | `display_name`, notification preferences, privacy preference |
| 响应字段 | `developer_code`, `status`, `display_name`, `created_at`, `suspended_reason` |
| 错误码 | `unauthorized`, `validation_error`, `developer_suspended` |
| 权限要求 | 本人资料 |
| 幂等要求 | 初始化接口按 `user_id` unique 幂等创建 |
| 日志要求 | 资料创建/状态变化写事件 |
| 安全注意事项 | 冻结原因对用户可见文案需避免暴露风控细节 |

## 4. 主站管理后台接口

### 管理员冻结用户

| 项 | 合约 |
| --- | --- |
| 路径 | `/admin/api/users/suspend` |
| 方法 | POST |
| 调用方 | `/admin/api/users` |
| 鉴权方式 | Admin Web Session + CSRF |
| 请求参数 | `user_id`, `reason`, `scope=api_only` |
| 响应字段 | `user_id`, `api_status`, `suspended_at` |
| 错误码 | `admin_required`, `not_found`, `validation_error` |
| 权限要求 | 管理员 |
| 幂等要求 | 重复冻结返回当前冻结状态 |
| 日志要求 | 写 `api_admin_audit_logs` |
| 安全注意事项 | 不应阻止用户查看账单和日志 |

### 管理员调整余额

| 项 | 合约 |
| --- | --- |
| 路径 | `/admin/api/wallets/adjust` |
| 方法 | POST |
| 调用方 | `/admin/api/wallets` |
| 鉴权方式 | Admin Web Session + CSRF |
| 请求参数 | `user_id`, `bucket`, `amount_usd`, `reason`, optional `external_ref` |
| 响应字段 | `transaction_id`, `wallet_balances`, `audit_id` |
| 错误码 | `admin_required`, `wallet_not_found`, `negative_balance_not_allowed`, `validation_error` |
| 权限要求 | 管理员；大额调整可预留二次确认 |
| 幂等要求 | 可使用 `Idempotency-Key` 或后台生成操作 key |
| 日志要求 | 写 credit transaction 和 admin audit |
| 安全注意事项 | 金额必须 Decimal；必须填写原因 |

### 管理员关闭模型

| 项 | 合约 |
| --- | --- |
| 路径 | `/admin/api/models/disable` |
| 方法 | POST |
| 调用方 | `/admin/api/models` |
| 鉴权方式 | Admin Web Session + CSRF |
| 请求参数 | `model_route_id`, `reason` |
| 响应字段 | `model_route_id`, `public_model_name`, `status`, `updated_at` |
| 错误码 | `admin_required`, `not_found`, `already_disabled` |
| 权限要求 | 管理员 |
| 幂等要求 | 重复关闭返回当前 disabled 状态 |
| 日志要求 | 写 admin audit；Gateway model cache 需要刷新或短 TTL |
| 安全注意事项 | 不展示上游密钥；关闭原因可内部可见 |

## 5. 合约验收要求

- Gateway 三个 MVP 接口都有合约测试。
- 控制台接口都有权限测试和跨用户隔离测试。
- 管理接口都有管理员权限、CSRF、审计测试。
- 所有可重复触发的扣费、支付发放、推荐奖励接口都有幂等设计。
- 文档示例不得包含真实密钥、Token、数据库连接串。

