# ENHE API Gateway Logging And Retention Design

Date: 2026-07-05

Status: Phase 2 logging draft

## 1. 设计目标

日志系统需要同时支持：

- 用户排查请求。
- 管理员排查故障和风控。
- 钱包扣费对账。
- 法律和隐私合规。
- 后续成本、状态页和告警。

MVP 使用 PostgreSQL `api_usage_logs` 作为权威请求元数据日志。高量增长后再评估 ClickHouse 或独立日志仓库。

## 2. `usage_logs` 字段

`api_usage_logs` 必须包含：

- `request_id`
- `user_id`
- `api_key_id`
- `method`
- `path`
- `model`
- `public_model_name`
- `upstream_provider`
- `upstream_model`
- `status_code`
- `input_tokens`
- `output_tokens`
- `cache_read_tokens`
- `cache_write_tokens`
- `cost_usd`
- `charged_usd`
- `latency_ms`
- `is_stream`
- `error_code`
- `error_message`
- `client_ip_hash`
- `user_agent_hash`
- `created_at`

建议补充：

- `billing_status`
- `stream_finish_reason`
- `upstream_request_id_hash`
- `route_id`
- `wallet_transaction_id`

## 3. MVP 不保存请求正文

MVP 默认不保存：

- prompt 正文。
- messages 正文。
- completion 正文。
- tool call 参数正文。
- 用户上传文件内容。

原因：

- 降低隐私和合规风险。
- 降低日志存储成本。
- 避免管理员后台暴露敏感业务内容。
- 与阶段 1 验收标准一致。

如 Phase 2 需要保存正文，必须先完成用户显式开关、隐私政策扩展、保留周期和访问审计。

## 4. 错误日志记录

错误日志分两层：

| 层 | 内容 | 存储 |
| --- | --- | --- |
| 用户可见 usage log | `error_code`, 脱敏 `error_message`, status code, request id | `api_usage_logs` |
| 服务端结构化日志 | request id、模块、错误类型、脱敏上游摘要、耗时 | pino 日志流 |

错误日志不得记录：

- 完整 API Key。
- 上游 provider key。
- 数据库连接串。
- 请求正文。
- 上游原始敏感响应头。

## 5. 流式请求记录

流式请求需要记录：

- `is_stream=true`
- 流开始时间和结束时间可通过 `created_at` + `latency_ms` 表达。
- `stream_finish_reason`：`stop`, `length`, `client_disconnected`, `upstream_error`, `unknown`。
- 可确认 token 数。
- 是否已扣费：`billing_status`。

流式中断处理：

- 客户端断开但 token 可确认：按可确认 token 处理。
- 上游断开且 token 不可确认：进入 `review`。
- Gateway 自身错误：记录 `internal_error`，不自动扣费无法确认部分。

## 6. 用户日志查询范围

用户控制台默认：

- 默认展示最近 24 小时。
- 可筛选最近 7 天、30 天、90 天。
- 超过 90 天需要账单/支持入口，不默认开放长区间查询。

用户可筛选：

- request id。
- 时间范围。
- 模型。
- 路径。
- 状态码。
- 错误码。
- API Key 前缀。

用户不可见：

- 完整 API Key。
- 上游 provider 密钥。
- 其他用户日志。
- 内部成本明细之外的敏感路由配置。

## 7. 管理员日志查询范围

管理员可查询：

- 用户。
- API Key 前缀。
- request id。
- 模型。
- provider。
- 状态码。
- 错误码。
- 时间范围。
- 高延迟和高成本请求。

管理员长区间查询要求：

- 默认最近 24 小时。
- 超过 7 天必须提供至少一个强筛选条件。
- 超过 90 天建议走归档查询或导出任务，避免拖垮主库。

## 8. 保留周期建议

| 数据 | 建议保留 | 原因 |
| --- | --- | --- |
| 元数据日志 `api_usage_logs` | 180-365 天 | 用户排查、账单争议、成本分析 |
| 错误日志 | 90-180 天 | 故障排查和质量分析 |
| 审计日志 | 长期保留 | 管理员操作追责 |
| 支付日志 | 长期保留 | 财务、退款、争议处理 |
| Redis 限流窗口 | 分钟/小时窗口按 TTL，聚合 7-30 天 | 风控和短期分析 |

最终保留周期需与法律条款和隐私政策一致。

## 9. 脱敏策略

| 字段 | 策略 |
| --- | --- |
| API Key | 只保存 hash 和 prefix；日志只显示 prefix |
| IP | 保存 `client_ip_hash`；必要时服务端短期日志可有脱敏 IP 段 |
| User Agent | 保存 `user_agent_hash`；控制台不展示完整 UA |
| 错误信息 | 映射为 ENHE 错误码和脱敏文案 |
| 上游 request id | 可保存 hash 或短引用，不保存带敏感信息的原始头 |
| 请求/响应正文 | MVP 不保存 |

## 10. 查询性能建议

- `api_usage_logs` 按 `(user_id, created_at)` 支持用户查询。
- 按 `(api_key_id, created_at)` 支持 Key 泄露排查。
- 按 `(status_code, created_at)` 和 `error_code` 支持故障查询。
- 按 `(public_model_name, created_at)` 支持模型统计。
- request id 唯一索引用于精准排查。
- 对日志详情页使用 request id，不使用大范围模糊搜索。
- 量级增长后按月分区或同步到 ClickHouse。

## 11. Phase 2 日志仓库

引入 ClickHouse 或独立日志仓库的触发条件：

- PostgreSQL usage log 表影响主站或 Gateway 性能。
- 管理后台需要秒级聚合成本、模型失败率、用户留存。
- 日志保留超过 1 年且查询量增长。
- 状态页和告警需要实时聚合。

引入后仍需保持 PostgreSQL 账务流水为最终账本，日志仓库只做查询和分析。

