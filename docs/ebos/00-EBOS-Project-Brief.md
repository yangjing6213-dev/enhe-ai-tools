# EBOS Project Brief

## Project Name

ENHE Business OS, abbreviated as EBOS.

## Project Goal

EBOS is the AI-driven operating system for the ENHE AI tool site. It should inspect the business every week, explain what changed, identify the highest-leverage opportunities, and turn the findings into a concrete next-week operating plan and monthly strategic review.

The system is not a replacement for the existing admin panel. It is a decision layer on top of existing product, content, SEO/GEO, traffic, revenue, and market-signal data.

## Current Repository Understanding

The current project is a production-oriented Next.js application for the ENHE AI tools website.

- Framework: Next.js App Router with TypeScript.
- UI: React, Tailwind CSS, shared public-site and admin components.
- Database: PostgreSQL through Prisma.
- Admin: `/admin` contains dashboard, SEO insights, GEO monitoring, manuals, users, orders, payments, refunds, products, AI news, tags, comments, files, audit logs, and settings.
- Public routes: Chinese routes under route groups and root paths, plus English routes under `/en`.
- Product modules: software tools, account services/online tools, skill learning, tutorials, pricing, user center, orders, payments, and downloads.
- Content modules: AI news, AI trend briefings, OKF/public markdown assets, SEO/GEO content, manuals, and design docs.
- Operations modules already present: analytics events, admin dashboard calculations, SEO insights, GEO monitoring, Baidu push queue, IndexNow/Baidu push scripts, AI news HTML import, AI trend briefing publishing, and Remotion-based AI trend video generation.

## EBOS Problem Statement

The site already has many operating surfaces, but strategic review is fragmented:

- Traffic, SEO, GEO, product, revenue, content, and market signals live in separate pages, scripts, or external tools.
- Weekly decisions depend on manual interpretation.
- There is no single weekly operating artifact that answers "what happened, why it matters, and what we do next."
- There is no durable loop for comparing planned actions against next week's results.

## EBOS v1 Outcome

EBOS v1 should create a repeatable operating loop:

1. Collect: read available internal data and configured external signal snapshots.
2. Diagnose: classify health, risks, anomalies, wins, and stalled areas.
3. Prioritize: rank opportunities by expected business impact and execution cost.
4. Plan: generate a next-week plan with owners, acceptance checks, and priority.
5. Review: preserve weekly and monthly reports for trend comparison.

## Primary Users

- Site owner/operator: needs a concise operating diagnosis and action plan.
- Developer/operator: needs exact modules, queries, and checks to implement.
- AI agent/Codex: needs safe project rules and stable artifacts to continue development.

## Operating Cadence

- Weekly report: business health, SEO/GEO, product performance, traffic, revenue, content, and opportunity plan.
- Monthly review: strategy summary, trend deltas, missed assumptions, compounding wins, and product/content bets for the next month.
- Ad hoc checks: launch readiness, SEO/GEO incidents, revenue anomalies, content decay, or product opportunity review.

## Initial Data Sources

Internal sources available now:

- `AnalyticsEvent`: page views, funnel events, source/medium metadata.
- `Tool`, `ToolCategory`, `ToolPriceSpec`, `ToolPurchase`, `DownloadLog`, `ToolUsageLog`: product catalog and usage.
- `Order`, `PaymentTransaction`, `PaymentProof`, `OrderRefundRecord`: revenue and payment operations.
- `NewsArticle`, `NewsCategory`, `NewsTag`, `NewsExternalSource`: AI news and content performance.
- `AiTrendBriefing`: market trend reports and public demand signals.
- `GeoQuery`, `GeoProvider`, `GeoVisibilityRun`, `GeoVisibilityResult`, `GeoRecommendation`: GEO visibility monitoring.
- `BaiduPushQueueItem`: search push operations.
- Existing scripts for publishing, sitemap push, SEO/GEO generation, audits, and trend briefing video generation.

External sources to integrate later:

- Google Search Console.
- Bing Webmaster Tools.
- PageSpeed Insights or Lighthouse.
- AI answer-engine visibility checks.
- Public market, competitor, and demand signals.

## Non-Goals For Step 0

- Do not build EBOS runtime business logic yet.
- Do not change existing product, payment, content, SEO, or admin behavior.
- Do not add migrations before the EBOS data model is reviewed.
- Do not connect live third-party APIs before secrets, rate limits, and storage policy are defined.

## Success Criteria For Step 0

- EBOS documentation exists under `docs/ebos/`.
- Project-level `AGENTS.md` defines development and verification rules.
- Current stack, routes, database, admin surfaces, and existing modules are understood.
- Existing lint/build/test commands are identified and run or clearly reported if unavailable.

