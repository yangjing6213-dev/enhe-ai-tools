# EBOS Data Source Setup

## 1. EBOS 数据源总览

Step 3/3.5 只检测 EBOS 数据源配置就绪度和只读站点可访问性，不调用 Google、Cloudflare、Whop 或其他外部数据 API。检测结果只能说明 `configured`、`missing_config`、`available` 等状态，不能代表外部数据已经成功拉取。

## 2. 数据源用途

- `internal_database`: 读取现有 Prisma 数据，用于产品、订单、收入、内容、GEO、站内 analytics 和用户基础指标。
- `google_search_console`: 后续用于 SEO query、page、click、impression、CTR、average position。
- `google_analytics`: 后续用于流量来源、会话、页面访问、转化事件。
- `bing_webmaster`: 后续用于 Bing 索引、搜索表现和提交状态。
- `cloudflare`: 后续用于边缘流量、缓存、访问错误和安全事件。
- `whop`: 后续用于 Whop 收入和订阅数据。
- `market_research`: 后续用于 RSS、Reddit、GitHub Trending 等市场机会信号。
- `ai_search_probe`: 后续用于 AI 搜索/GEO 品牌提及、域名引用和竞品出现率。
- `manual_input`: 人工补充收入、渠道、重点事项和下周方向，始终视为 `configured`。

## 3. 环境变量名称

| 数据源 | 必需环境变量 |
| --- | --- |
| Internal Database | `DATABASE_URL` |
| Google Search Console | `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, `GOOGLE_SEARCH_CONSOLE_SITE_URL` |
| Google Analytics | `GA_PROPERTY_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` |
| Bing Webmaster | `BING_WEBMASTER_API_KEY`, `BING_SITE_URL` |
| Cloudflare | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ZONE_ID` |
| Whop | `WHOP_API_KEY`, `WHOP_COMPANY_ID` |
| Market Research | `EBOS_MARKET_RSS_SOURCES`, `EBOS_REDDIT_SOURCES`, `EBOS_GITHUB_TRENDING_ENABLED` |
| AI Search Probe | `EBOS_AI_SEARCH_PROBE_ENABLED`, `EBOS_AI_SEARCH_PROVIDERS` |
| Manual Input | 无必需环境变量 |

## 4. configured / available 判断

- `configured`: 必需环境变量存在，但当前阶段不调用外部 API 验证真实可用性。
- `missing_config`: 至少一个必需环境变量缺失。
- `available`: 当前阶段仅 `internal_database` 可在后续通过实际 Prisma 只读查询升级为 available；外部 API 不在 Step 3/3.5 调用。
- `not_configured`: 数据源明确不计划接入时可使用。
- `unavailable`: 已配置但运行时读取失败时使用。
- `unknown`: 无法判断配置或状态时使用。

## 5. Step 3.5 Evidence 与 Smoke Checks

Weekly Report 会从本地 `reports/ebos/health/` 和 `reports/ebos/data-sources/` 读取最新 JSON evidence。读取失败或文件不存在时，周报继续生成，并记录 warning。

Website Health Snapshot 会增加只读 smoke checks：

- `sitemap`: HEAD/GET `sitemap.xml`。
- `robots`: HEAD/GET `robots.txt`。
- `homepage`: HEAD/GET 站点首页。
- `key_product_pages`: 优先读取最多 5 个已发布产品 slug 生成 `/software/{slug}`，失败时退回 `/software`、`/ai-trends`、`/ai-news`、`/account-services`、`/skill-learning`。

Smoke checks 只做只读请求，不修改任何数据。2xx/3xx 视为 passed，4xx/5xx、超时、网络错误视为 failed；缺少 URL 时视为 skipped。

默认站点 URL 读取顺序：

1. `NEXT_PUBLIC_SITE_URL`
2. `EBOS_SITE_URL`
3. `https://www.enhe-tech.com.cn`，并在结果中标记为 default source

## 6. 当前阶段不接外部 API

本阶段不会请求 Google Search Console、Google Analytics、Bing Webmaster、Cloudflare、Whop、Reddit、GitHub 或 AI 搜索供应商。所有 readiness 检查都只基于环境变量是否存在，输出报告不得包含任何 secret value。

## 7. Step 5 真实 API 接入方向

- 为每个外部数据源创建独立 read-only adapter。
- 每个 adapter 记录 credential requirement、rate limit、retry、timeout、error mapping。
- 外部 API 结果进入 EBOS snapshot 时必须保留 source、checkedAt、confidence。
- API 接入前先写 mock/fake adapter 测试，再接真实客户端。

## 8. 安全规则

- 不提交 `.env`。
- 不打印 secret value。
- 不在日志、JSON 报告、Markdown 报告中暴露密钥内容。
- 只允许输出环境变量名称和 configured/missing 状态。
- 生产 API token、service account private key、Webhook secret 不得进入 Git。
