# EBOS v1 PRD

## Summary

EBOS v1 will generate an internal operating report for ENHE AI every week and a strategic review every month. It will start as a read-first business intelligence and planning layer over the current Next.js/Prisma app, then gradually add admin UI, report history, external integrations, and agent-assisted recommendations.

## Product Principle

EBOS should not produce generic AI advice. Every conclusion must be tied to one of:

- observed internal data,
- explicit external signal input,
- known site strategy,
- or a clearly marked assumption.

## v1 Users

- Business operator: reads the weekly report and decides priorities.
- Engineering operator: implements the plan, validates site health, and maintains data pipelines.
- Content/SEO operator: publishes or updates pages based on prioritized opportunities.

## Core Use Cases

1. Weekly Business Health Check
   - Show traffic, revenue, order, payment, refund, product, content, SEO, and GEO changes.
   - Flag anomalies, stalled funnels, and operational risks.

2. SEO/GEO Review
   - Summarize on-site SEO landing behavior.
   - Summarize GEO query visibility and recommendation status.
   - Identify pages or topics that need content updates, FAQ/schema improvements, internal links, or external signal support.

3. Product Performance Review
   - Rank tools/services by views, downloads, usage, purchases, conversion, and revenue.
   - Surface products with high attention but low conversion.
   - Surface products with missing media, weak copy, no FAQ, or stale launch assets.

4. Content Performance Review
   - Rank AI news and trend pages by visibility and engagement.
   - Identify articles that should connect to products, tutorials, services, or trend briefings.
   - Recommend topic clusters for next week.

5. Revenue and Funnel Review
   - Summarize paid revenue, activated orders, payment review backlog, refund rate, and conversion funnel.
   - Explain whether revenue movement is caused by traffic, conversion, product mix, or operational backlog.

6. Market Opportunity Scan
   - Use AI trend briefings and manually supplied market signals first.
   - Later connect external APIs or web research pipelines.
   - Convert signals into site-specific actions: article, landing page, product card, tutorial, service copy, or GEO answer block.

7. Next-Week Plan
   - Generate 3 to 7 prioritized actions.
   - Each action must include objective, target surface, expected impact, required files/modules, verification check, and risk.

8. Monthly Strategic Review
   - Compare weekly reports.
   - Identify compounding wins, repeated misses, and strategy shifts.
   - Recommend next month's product/content/SEO/GEO focus.

## v1 Scope

### Must Have

- Read-only aggregation from current Prisma models.
- A typed report structure for weekly and monthly EBOS reports.
- A report-generation script or server action that can run locally.
- Markdown or HTML report output for review.
- Deterministic scoring rules for health, risk, priority, and confidence.
- Documentation for every data source and assumption.

### Should Have

- Admin page under `/admin/ebos` after the data contract is stable.
- Report history stored in the database.
- Links from report findings to relevant admin pages.
- Export to markdown/HTML.
- Basic tests for calculations, scoring, date windows, and empty-data handling.

### Later

- Google Search Console ingestion.
- Bing Webmaster Tools ingestion.
- PageSpeed/Lighthouse ingestion.
- Scheduled weekly generation.
- Email or notification delivery.
- Competitive market-signal research agent.
- Automated follow-up task generation.

## Proposed EBOS Report Sections

1. Executive summary.
2. Business health score.
3. Traffic and funnel.
4. Revenue and payment operations.
5. Product performance.
6. AI news and content performance.
7. SEO/GEO visibility.
8. Market opportunities.
9. Risks and anomalies.
10. Next-week operating plan.
11. Open assumptions and missing data.

## Candidate Data Model

Do not implement this in Step 0. Review before migration.

- `EbosReportRun`
  - id, reportType, periodStart, periodEnd, status, generatedAt, generatedBy, summary, healthScore, confidence, metadata.
- `EbosReportSection`
  - id, runId, sectionKey, title, summary, findingsJson, score, sortOrder.
- `EbosRecommendation`
  - id, runId, priority, type, title, rationale, targetPath, targetAdminPath, expectedImpact, effort, confidence, status.
- `EbosDataSnapshot`
  - id, runId, sourceKey, windowStart, windowEnd, payload, warnings.

## Acceptance Criteria

- A weekly report can be generated from local data without changing existing site behavior.
- Empty or missing data produces explicit warnings, not fabricated conclusions.
- Each recommendation links to a target page, admin page, script, or content surface.
- All scoring rules are covered by unit tests.
- Report output can be reviewed without running the dev server.
- Admin UI is not added until the report data contract is stable.

## Out of Scope For v1

- Automatic publishing of content or product changes.
- Automatic payment, refund, or user-account actions.
- Production cron installation.
- Unreviewed database migrations.
- Replacing existing SEO/GEO pages.

