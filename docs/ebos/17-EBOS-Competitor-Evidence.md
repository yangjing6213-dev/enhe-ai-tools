# EBOS Competitor Evidence v1

## 1. 作用

Competitor Evidence 用于把公开竞品页面和手动竞品种子转成 EBOS 可索引证据，辅助判断 ENHE 下一步应该验证哪些产品方向、如何差异化、如何优化产品页、价格入口、SEO/GEO 页面结构和内容策略。

## 2. 与 Market Evidence 的区别

Market Evidence 关注需求信号、产品方向和机会评分。Competitor Evidence 关注观察对象的页面结构、产品表达、价格入口、内容组织和差异化空间。两者都不能直接证明销量、流量或收入。

## 3. 不伪造销量、收入、流量

v1 只读取手动种子和可选公开页面信号，不调用需要鉴权的外部 API，不推断竞品后台数据。因此报告必须明确标注：竞品销量、收入、流量未知，所有结论只能作为验证方向。

## 4. 默认竞品种子

默认种子分三类：AI 工具目录/工具站、数字产品/创作者市场、技术/开源工作流参考。它们是观察对象，不代表完整竞品名单。后续可以通过 JSON 手动输入扩展。

## 5. 页面信号提取规则

页面审计提取 title、meta description、h1、pricing、product listing、FAQ、use case、comparison、video/media、newsletter/waitlist、affiliate、CTA、SEO 信号和 GEO 信号。GEO 信号包括 summary、FAQ、how-to、source/date/author 等 answerability 元素。

## 6. Opportunity Score

priorityScore 使用 0-100 分：enheFitScore、marketAlignmentScore、productGapScore、contentGapScore、monetizationPotential 加总后扣除 difficultyScore 和 riskScore。firstRevenueAchieved=false 时，高分机会优先推荐 validate_first。

## 7. 结合其他 Evidence

builder 会尝试读取 latest evidence catalog 中的 market/product/revenue/seo/geo evidence。Market 用于对齐产品方向，Product 用于判断 ENHE 承接能力，Revenue 用于决定 build_now 或 validate_first，SEO/GEO 用于决定内容与页面结构优先级。

## 8. Action Items

actionItems 来自排名靠前的 differentiation opportunities。每条任务必须可验证，优先输出低成本验证、landing page、comparison content、waitlist、presale、产品页改进等任务。

## 9. 运行脚本

默认只使用种子与 catalog，不抓公网：

```bash
npx tsx scripts/generate-ebos-competitor-evidence.ts
```

如需读取公开竞品页面，显式启用：

```bash
npx tsx scripts/generate-ebos-competitor-evidence.ts --include-network-sources
```

Step 8.5 also supports the shorter explicit flag and conservative caps:

```bash
npx tsx scripts/generate-ebos-competitor-evidence.ts --include-network --max-competitors 5 --max-pages-per-competitor 3 --max-total-urls 20 --timeout-ms 8000
```

Public competitor URL audit is disabled by default because EBOS should not make hidden network calls during normal report generation. When enabled, it only performs low-frequency public reads and does not authenticate, solve captcha, bypass anti-bot controls, or call paid/authenticated APIs.

`competitorsAuditedCount` counts competitors with at least one successfully audited public page. `pagesAttempted`, `pagesSucceeded`, and `pagesFailed` describe the request-level result. Partial confidence means page coverage is disabled, unavailable, failed, or too thin.

Public page structure is not traffic, sales, ranking, or revenue evidence. Pricing, CTA, FAQ, product-listing, SEO, and GEO signals can guide ENHE differentiation tasks, but they must not be represented as competitor performance metrics.

每个竞品最多请求 3 个公开页面，网络失败只产生 warning，不会中断脚本。

## 10. 重新索引 Catalog

生成后运行：

```bash
npx tsx scripts/index-ebos-evidence.ts
```

索引后 latest catalog 应包含 competitor_evidence，并生成 payloadSummary：overallScore、competitorsCount、competitorsAuditedCount、opportunitiesCount、topDifferentiationOpportunities、actionItemsCount、confidence。

## 11. 后续真实监控

后续可加入人工维护的重点竞品列表、固定页面快照、价格变更记录、Product Hunt/GitHub/Hugging Face 等公开趋势源，但不得绕过登录、反爬或付费墙。

## 12. 安全规则

不读取或打印 secret value，不调用鉴权 API，不高频请求，不绕过反爬，不抓取大量页面。所有网络失败必须降级为 warning，所有结论必须标注数据限制。
