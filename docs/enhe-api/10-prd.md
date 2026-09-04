# ENHE API Gateway MVP PRD

Date: 2026-07-05

Status: Phase 1 planning draft

## 1. 产品背景

ENHE AI 当前已经具备账号、登录、用户中心、订单/支付、管理员后台、审计日志和法律条款基础。阶段 0 审计结论认为，ENHE API Gateway 应作为现有 ENHE AI 网站中的开发者产品模块，而不是独立成一个与现有用户体系割裂的新站点。

阶段 0 关键依据：

- 账号与会话可复用：`src/lib/auth.ts`、`src/app/(auth)/*`、`prisma/schema.prisma`。
- 用户中心可扩展：`src/app/user/layout.tsx`、`src/app/user/page-shell.tsx`。
- 管理后台与审计可复用：`src/app/admin/layout.tsx`、`src/lib/admin-audit.ts`、`src/app/admin/actions.ts`。
- 订单/支付可复用但需新增 API 额度账本：`src/lib/zpay-orders.ts`、`src/app/api/zpay/notify/route.ts`、`prisma/schema.prisma`。
- 法律页面可扩展：`src/lib/legal.ts`、`src/app/legal/[slug]/page-shell.tsx`。
- 运行时 `/v1/*` 不适合长期放在现有 Next.js 网站进程中，应由独立 Gateway 服务承载：`docs/enhe-api/02-architecture-options.md`。

本 PRD 只定义产品范围、页面信息架构和验收标准，不创建数据库表，不修改业务代码，不复制任何第三方品牌、UI、文案或代码。

## 2. 产品目标

ENHE API Gateway 的 MVP 目标是让中文 AI 开发者、AI 编程工具用户和 AI 内容创作者能够在 ENHE 账号体系内完成 API 服务开通、API Key 创建、额度购买、工具配置、首次调用、日志排查和余额管理。

核心目标：

- 用户登录后 5 分钟内能完成 API Key 创建并发起首次有效请求。
- 支持 OpenAI-compatible 与 Anthropic-compatible 两类主流工具接入方式。
- 每一次可计费请求都有可追溯的请求日志和扣费流水。
- 用户可自主撤销泄露密钥并查看异常消耗。
- 管理员可冻结用户、调整余额、关闭模型、审计关键操作。
- API Gateway 使用 ENHE 自有品牌、独立 UI、独立文案、独立代码实现。

## 3. 目标用户

| 用户 | 场景 | 主要需求 |
| --- | --- | --- |
| AI 编程工具用户 | 使用 Codex、Claude Code、Cursor、Cline 等工具 | 快速获取 Base URL、API Key、模型名和配置文档 |
| 中文开发者 | 在自己的应用或脚本中调用模型 API | 统一接口、稳定鉴权、可查看日志、可控成本 |
| AI 内容创作者 | 用 API 批量生成、整理或分析内容 | 余额清晰、日志可查、失败原因明确 |
| ENHE 老用户 | 已有 ENHE 账号和购买记录 | 在现有用户中心里开通 API 服务，不重复注册 |
| 管理员/运营 | 处理用户、余额、模型、风控、支付争议 | 后台可审计、可冻结、可调整、可排查 |

## 4. 核心价值主张

- 一个 ENHE 账号管理网站服务与开发者 API 服务。
- 一个 ENHE API Key 接入多类 AI 工具和模型接口。
- 控制台清楚展示余额、消耗、日志、账单和配置文档。
- 额度扣费透明，可追溯到请求、模型、状态、时间和扣费流水。
- 面向中文用户提供清晰的配置步骤、错误处理和风控说明。
- 运行时 Gateway 独立部署，减少模型流式请求对主站的影响。

## 5. 产品边界

ENHE 网站负责产品体验和商业闭环：

- `/ai-api`、`/ai-api/pricing`、`/ai-api/docs`。
- `/user/api/*` 用户 API 控制台。
- `/admin/api/*` 管理后台。
- 登录、注册、用户中心、支付入口、订单、法律条款、文档中心。

独立 Gateway 服务负责运行时能力：

- `GET /v1/models`。
- `POST /v1/chat/completions`。
- `POST /v1/messages`。
- API Key 鉴权、限流、模型路由、流式响应、用量日志、额度扣费。

不属于 MVP 的事项：

- 完整企业团队空间。
- SDK 生态。
- Playground。
- 模型排行榜。
- 复杂智能路由和多供应商自动调度。
- 高级推荐返佣系统。

## 6. MVP 功能清单

### 公开产品与文档

- ENHE API 公开介绍页。
- 公开套餐页。
- 公开 API 文档中心。
- Codex 配置文档。
- Claude Code 配置文档。
- 余额不足、API Key 泄露、限流、模型关闭等常见错误说明。

### 用户控制台

- `/user/api` 控制台首页。
- 开发者资料初始化。
- API Key 创建、列表、撤销、显示前缀、复制创建时明文。
- 余额、用量、扣费流水。
- 请求日志筛选与详情。
- 套餐与账单页。
- 推荐奖励基础版。
- 用户专属配置文档页。

### Gateway 运行时

- OpenAI-compatible `GET /v1/models`。
- OpenAI-compatible `POST /v1/chat/completions`。
- Anthropic-compatible `POST /v1/messages`。
- `stream=false` 和 `stream=true` 基础支持。
- 基础模型路由。
- API Key 鉴权。
- 基础限流。
- 余额不足拦截。
- 用量日志和扣费流水写入。

### 管理后台

- API 用户列表与冻结。
- API Key 查询与撤销。
- 请求日志查询。
- 用户钱包与余额调整。
- 模型关闭。
- API 订单/套餐查看。
- 推荐关系查看。
- 管理员审计日志。

## 7. 非目标功能清单

MVP 不做：

- 复杂模型自动调度。
- 多供应商智能路由。
- 高级缓存计费。
- 企业团队空间。
- 自研 SDK。
- Playground。
- 模型排行榜。
- 自动发票。
- 完整服务状态页。
- 高级推荐返佣系统。

这些能力可以在第二阶段或企业化阶段评估。

## 8. 商业模式

MVP 采用预付额度加套餐包模式：

- 新用户可获得小额试用额度，必须有反滥用限制。
- 用户可购买套餐或额度包。
- 额度消耗按模型、输入 token、输出 token、供应商成本和 ENHE 计费规则计算。
- 推荐奖励在好友完成验证并产生首次有效 API 调用后发放。
- 管理员可手动开通套餐或复用现有支付系统完成购买闭环。

现有订单/支付系统可作为购买入口，但 API 消耗必须进入独立钱包和不可变扣费流水，不能只依赖现有订单状态。

## 9. 套餐与额度原则

- 用户看到的是 ENHE API 余额，不直接暴露上游供应商密钥或成本结构。
- 额度来源至少区分：赠送额度、充值额度、套餐额度、推荐额度、管理员调整。
- 每一笔增加或扣减都必须进入流水。
- 扣费流水必须能关联请求日志。
- 余额不足时 Gateway 返回明确的 `402` 错误，并给出控制台充值入口。
- 赠送额度和推荐额度可以设置有效期、模型范围或每日上限。
- 金额、额度、token 计数需使用 Decimal 兼容设计，避免浮点误差。

## 10. 风控原则

- API Key 只显示一次明文，数据库只存 hash 和前缀。
- 泄露密钥可立即撤销，撤销后 Gateway 必须拒绝。
- 新用户默认低额度、低并发、低速率。
- 风险用户可冻结 API 能力，但不影响必要的账号登录和账单查看。
- 管理员调整余额必须填写原因并写入审计日志。
- 请求内容默认不保存正文，只保存必要元数据；如未来保存 prompt/completion，必须另行制定隐私开关、保留周期和删除策略。
- 上游供应商密钥只存在服务端环境变量或密钥管理系统，不进入前端、文档、日志或用户可见响应。

## 11. 与现有 ENHE 网站的融合方式

融合方式采用现有网站承载产品壳和业务闭环：

- 公共页面进入现有导航和 SEO 系统，复用 `src/components/site-header.tsx`、`src/components/site-footer.tsx`、`src/components/public-site-chrome.tsx` 的站点能力，但页面视觉和文案要为 ENHE API 独立设计。
- 登录注册复用现有认证能力，依据 `src/lib/auth.ts`。
- 用户控制台放入 `/user/api/*` 子树，避免继续加重当前 `/user` 单页复杂度。
- 管理后台放入 `/admin/api/*` 子树，复用 `requireAdmin` 和 `AdminAuditLog`。
- 购买入口可复用现有订单/支付能力，但必须新增 API 额度账本。
- 法律条款通过现有法律页面体系扩展 API 服务条款、隐私和退款规则。

## 12. 与独立 Gateway 服务的边界

独立 Gateway 服务不负责用户营销页、登录页、支付页和后台 UI。它只负责高频运行时请求。

Gateway 服务必须具备：

- API Key 鉴权。
- 开发者状态校验。
- 限流。
- 模型路由。
- 上游请求代理。
- OpenAI-compatible 和 Anthropic-compatible 响应适配。
- 流式响应。
- 用量日志。
- 扣费。
- 余额不足拦截。

Gateway 与现有网站共享数据库契约或服务接口，但运行时部署、日志、限流和上游凭据管理应与主站隔离。

## 13. 成功指标

### 用户指标

- 新用户从 `/ai-api` 到首次成功 API 调用的中位时间小于 5 分钟。
- 创建 API Key 后 24 小时内产生首次有效请求的用户占比达到 MVP 内部目标。
- 余额不足后完成充值或购买的转化率可追踪。
- API Key 泄露场景下用户能在 2 分钟内完成撤销和重建。

### 技术指标

- Gateway `/v1/models`、`/v1/chat/completions`、`/v1/messages` 均有合约测试。
- `stream=false` 和 `stream=true` 均能记录日志和扣费结果。
- 并发请求不能造成负余额。
- 余额不足请求不调用上游供应商。
- 关键管理员操作 100% 写入审计日志。

### 商业指标

- 用户可购买套餐或由管理员手动开通套餐。
- 每笔消耗都能关联到用户、密钥、模型、请求日志和扣费流水。
- 推荐奖励只在好友验证和首次有效调用后发放。

