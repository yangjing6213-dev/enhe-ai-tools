# ENHE API Gateway Rate Limit Design

Date: 2026-07-05

Status: Phase 2 rate limit draft

## 1. 设计目标

限流系统用于保护 ENHE 主站、Gateway、数据库、Redis、上游 provider 和用户钱包，避免滥用、刷注册、刷推荐奖励和突发成本。

MVP 采用 Redis 优先、数据库兜底：

- Redis 处理热路径短窗口和消费窗口。
- PostgreSQL `api_rate_limit_policies` 保存策略。
- PostgreSQL `api_rate_limit_windows` 作为 Redis 不可用时的降级记录或异步对账数据。

## 2. 限流维度

| 维度 | 示例 key | 目的 |
| --- | --- | --- |
| IP | `ip:<client_ip_hash>` | 防匿名刷请求和撞 Key |
| user_id | `user:<user_id>` | 控制单用户总流量和总成本 |
| api_key_id | `key:<api_key_id>` | 控制泄露 Key 或单项目异常 |
| model | `model:<public_model_name>` | 避免高成本模型被突发打满 |
| path | `path:/v1/chat/completions` | 分接口限流 |
| 新用户 | `new_user:<user_id>` | 降低新账号赠送额度滥用 |
| 套餐等级 | `plan:<plan_code>` | 区分免费、基础、付费用户能力 |

每次请求需要同时检查多个维度；任一维度超限即拒绝。

## 3. MVP 窗口

| 窗口 | 用途 | 建议存储 |
| --- | --- | --- |
| 每分钟请求数 | 防突发打爆 Gateway 或 provider | Redis |
| 每小时请求数 | 防持续脚本滥用 | Redis |
| 5 小时消费窗口 | 防短时间成本暴涨 | Redis + usage log 汇总 |
| 7 天消费窗口 | 防低频长期薅赠送额度 | Redis/DB 汇总 |
| 单请求最大 token | 防单请求极高成本 | Gateway 内存策略 + model route |
| 单请求最大成本 | 防单请求耗尽余额 | Gateway 预估 |

策略示例只应在后台配置中保存，不写入硬编码业务逻辑。

## 4. Redis key 建议

```text
rl:req:min:<scope_type>:<scope_id>:<yyyyMMddHHmm>
rl:req:hour:<scope_type>:<scope_id>:<yyyyMMddHH>
rl:spend:5h:<scope_type>:<scope_id>
rl:spend:7d:<scope_type>:<scope_id>
```

要求：

- 使用 TTL 自动过期。
- 使用原子 increment。
- 消费窗口使用 Decimal 字符串或整数最小单位，避免浮点误差。
- Redis key 不包含完整 API Key、真实 IP 或敏感文本，只使用 hash 或内部 ID。

## 5. 429 响应格式

```json
{
  "error": {
    "code": "rate_limit_exceeded",
    "message": "Rate limit exceeded.",
    "request_id": "<request_id>",
    "limit": {
      "scope": "api_key",
      "window": "per_minute",
      "retry_after_seconds": 30
    },
    "docs_url": "https://www.enhe-tech.com.cn/ai-api/docs"
  }
}
```

响应头建议：

- `Retry-After`
- `X-Request-Id`
- `X-RateLimit-Scope`，可选，避免泄露内部策略细节

## 6. 用户控制台展示

`/user/api/usage` 和 `/user/api` 可展示：

- 当前套餐等级。
- 每分钟/每小时请求额度摘要。
- 近 5 小时消费。
- 近 7 天消费。
- 单请求最大 token。
- 单请求最大成本。
- 最近一次限流原因。

不要展示完整 Redis key 或可被绕过的内部阈值细节。对普通用户展示“当前套餐限制”和“升级/充值入口”。

## 7. 管理员调整策略

`/admin/api` 后台需要支持：

- 按套餐配置限流策略。
- 按用户覆盖策略。
- 按模型设置全局最大并发或最大请求数。
- 冻结用户或 Key。
- 临时降低新用户限额。
- 查看命中限流的日志和统计。

所有策略变更写入审计日志。

## 8. Redis 不可用时的降级策略

MVP 推荐保守降级：

| 情况 | 策略 |
| --- | --- |
| Redis 短暂不可用 | 使用本进程极小内存限流 + 数据库兜底，降低默认限额 |
| Redis 长时间不可用 | 对新用户和免费额度用户拒绝高成本模型；付费用户低速放行 |
| Redis 写失败但 DB 可用 | 写 `api_rate_limit_windows` 兜底，但限制并发避免 DB 写爆 |
| Redis 和 DB 均不可用 | Gateway 返回 `500 internal_error` 或进入只读健康失败状态 |

不得在限流系统不可用时完全放开请求。

## 9. 防刷注册和推荐奖励滥用

建议策略：

- 新注册账号赠送额度低限额。
- 新用户 7 天窗口更严格。
- 推荐奖励只在好友验证和首次有效 API 调用后发放。
- 同 IP hash、User Agent hash、设备指纹预留信号过多时进入待审。
- 对未付费账号设置更低的高成本模型调用上限。
- 同一邀请人短时间大量邀请成功但无真实消耗时冻结奖励。

## 10. 阶段 3 验收

- 限流命中返回 `429 rate_limit_exceeded`。
- 余额不足返回 `402 insufficient_credit`，不混淆为限流。
- Redis 不可用有降级策略。
- 用户控制台能解释限流状态。
- 管理员策略变更有审计。

