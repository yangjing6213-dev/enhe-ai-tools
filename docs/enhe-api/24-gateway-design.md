# ENHE API Gateway Service Design

Date: 2026-07-05

Status: Phase 2 gateway draft

## 1. 推荐技术栈

| 层 | 推荐 | 说明 |
| --- | --- | --- |
| Runtime | Node.js | 与现有 TypeScript/Next.js 技术栈接近，降低维护成本 |
| Web framework | Fastify 或 Hono | Fastify 生态成熟；Hono 简洁轻量，适合边缘/标准 Web API 风格 |
| Language | TypeScript | 与主站保持类型一致 |
| Database client | Prisma 或轻量 PostgreSQL client | MVP 可复用 Prisma 类型；高热路径可评估轻量 client |
| Cache/limit | Redis | 限流、消费窗口、短期幂等 |
| Logging | pino | 结构化日志，适合高吞吐服务 |
| Tracing | OpenTelemetry Phase 2 | MVP 可先保留 request_id，Phase 2 接入链路追踪 |

## 2. 不放进 Next.js 主站进程的原因

- 流式响应会长期占用连接和运行时资源。
- 高并发 API 请求与公开页、后台、支付页面共享进程会扩大故障影响。
- API 限流需要 Redis 和热路径优化，不适合混在页面业务里。
- 上游重试、超时、断流处理与主站页面请求生命周期不同。
- Gateway 成本风险高，需要独立监控、限流和熔断。
- 运维边界应独立，Gateway 可单独扩容、回滚、关闭。
- 上游 provider 密钥和代理逻辑应与主站前端构建隔离。

## 3. Gateway 模块

| 模块 | 职责 |
| --- | --- |
| `auth` | 解析 API Key，hash 校验，读取 Key/user/developer 状态 |
| `rateLimit` | Redis 限流、消费窗口、降级策略 |
| `credit` | 余额预检查、单请求最大成本判断 |
| `modelRouter` | 公开模型名到上游 provider/model 的映射 |
| `upstreamClient` | 上游请求构造、认证头、超时、错误归一化 |
| `streamProxy` | SSE/流式响应转发、断连处理、token 统计 |
| `usageLogger` | 写入 `api_usage_logs` |
| `billing` | 写入扣费流水、更新钱包、幂等结算 |
| `errorMapper` | 将内部和上游错误映射到 ENHE 错误码 |
| `adminHooks` | 接收主站内部刷新模型路由、清缓存等 hook，MVP 可选 |

## 4. OpenAI-compatible 请求流程

1. 接收 `/v1/models` 或 `/v1/chat/completions`。
2. 创建 `request_id`。
3. 执行 API Key 鉴权和用户状态校验。
4. 执行限流。
5. 对 chat 请求解析 `model`、`stream`、`max_tokens`。
6. 查询模型路由和模型状态。
7. 执行余额预检查和单请求最大成本检查。
8. 将请求转换为上游 OpenAI-compatible 格式。
9. 调用上游 provider。
10. 返回 JSON 或 SSE。
11. 写 usage log。
12. 按 token 和价格写扣费流水。

## 5. Anthropic-compatible 请求流程

1. 接收 `/v1/messages`。
2. 创建 `request_id`。
3. 执行 API Key 鉴权、开发者状态、限流。
4. 解析 `model`、`messages`、`max_tokens`、`stream`。
5. 查询模型路由，确认该路由支持 Anthropic-compatible 适配。
6. 余额预检查。
7. 构造上游 Anthropic-compatible 请求或做格式适配。
8. 返回 Anthropic-compatible JSON 或事件流。
9. 写 usage log 和扣费流水。

## 6. `stream=true` 处理策略

- Gateway 尽快返回响应头，但必须先完成鉴权、限流、余额预检查和模型路由。
- 流式期间持续转发上游 chunks。
- 需要统计可确认 token；若上游只在结束时返回 usage，则在结束事件中结算。
- 客户端中途断开时：
  - 记录 `error_code=client_disconnected` 或类似内部状态。
  - 若可确认 token，则按可确认 token 结算。
  - 若无法确认 token，则 usage log 标记 `billing_status=review`。
- 流式错误不得输出上游密钥、内部栈或原始敏感错误。

## 7. `stream=false` 处理策略

- Gateway 等待上游完整响应。
- 成功时读取 usage/token 字段，计算成本和 ENHE 收费。
- 写 usage log 后写扣费流水。
- 若上游无 usage 字段，MVP 应使用可信 tokenizer 或标记待审计；不能随意估算并直接扣费。

## 8. 上游错误处理

| 上游情况 | Gateway 响应 | 计费策略 |
| --- | --- | --- |
| 上游 401/403 | `502 upstream_error` | 不向用户暴露 provider 凭据细节；通常不扣费 |
| 上游 429 | `502 upstream_error` 或 Phase 2 fallback | 无 token 不扣费 |
| 上游 5xx/timeout | `502 upstream_error` | 无 token 不扣费；可确认 token 进入审计 |
| 模型不存在 | `404 model_not_found` 或 `423 model_disabled` | 不扣费 |
| Gateway 余额不足 | `402 insufficient_credit` | 不调用上游，不扣费 |
| Gateway 限流 | `429 rate_limit_exceeded` | 不调用上游，不扣费 |

## 9. 日志和扣费顺序

推荐顺序：

1. 请求开始时记录内存态 request context。
2. 鉴权/限流/余额预检查失败时写失败 usage log，不扣费。
3. 上游请求成功或产生可确认 token 后，先写 usage log。
4. 在同一结算流程中锁定钱包，写 `api_credit_transactions`。
5. 更新 usage log `billing_status=billed`。
6. 任一步失败时保留 request id，进入对账或待审计状态。

## 10. `request_id` 和幂等策略

- Gateway 每个请求生成 `request_id`，也可接受客户端 `X-Request-Id` 但必须校验长度和字符。
- 扣费幂等 key 建议为 `billing:<request_id>:<api_key_id>`。
- 支付发放幂等 key 建议为 `payment_credit:<provider_trade_no>` 或内部支付 ID。
- 发生重试时，不得重复写 `api_charge`。
- `api_gateway_idempotency_keys` 记录 started/succeeded/failed 状态。

## 11. 健康检查接口

| 接口 | 权限 | 内容 |
| --- | --- | --- |
| `GET /healthz` | 公开或内网 | 进程存活 |
| `GET /readyz` | 内网 | PostgreSQL、Redis、模型路由缓存是否可用 |
| `GET /internal/status` | 内网/管理员 | provider 状态、错误率、缓存版本，MVP 可延后 |

健康检查不得输出密钥、连接串或 provider 原始凭据。

## 12. 部署建议

- Gateway 作为独立 container/process 部署。
- 域名使用 `api.enhe-tech.com.cn`。
- 主站继续使用 `www.enhe-tech.com.cn`。
- Gateway 只暴露 `/v1/*` 和健康检查必要端点。
- Redis 与 PostgreSQL 放在私网。
- 上游 provider key 通过服务端环境变量或密钥管理注入。
- Gateway 日志输出到独立日志流，便于按 request id 排查。
- MVP 至少配置请求超时、body 大小限制、并发限制和关闭模型开关。

