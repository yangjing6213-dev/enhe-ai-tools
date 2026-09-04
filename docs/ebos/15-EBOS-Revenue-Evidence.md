# EBOS Revenue Evidence

## 1. Purpose

Revenue Evidence is the EBOS read-only contract for orders, payment state, refunds, product attribution, and first-revenue validation. It produces both a human-readable markdown report and a `revenue_evidence` JSON envelope that weekly reports, monthly reviews, and future UI surfaces can consume.

## 2. Why Revenue Evidence Closes The Growth Loop

SEO, GEO, product, and website health evidence describe whether ENHE can be discovered, understood, and used. Revenue Evidence answers whether that attention has produced real paid validation. EBOS must not treat traffic, page readiness, or downloads as revenue. A revenue conclusion needs order and payment evidence, or it must stay marked as a gap.

## 3. Relationship With Product Evidence

Product Evidence measures conversion readiness for product pages and product records. Revenue Evidence uses that readiness to choose 1-2 products for first-revenue validation when paid orders are absent. When paid orders exist, Revenue Evidence attributes them back to products where possible and turns the monthly plan toward scaling validated products.

## 4. Order, Payment, Refund, And Net Revenue Rules

The v1 auditor reads existing Prisma models only. It treats `paid`, `activated`, and `refunded` orders as paid-order evidence, uses order amount as gross paid revenue, subtracts non-rejected refund amounts for net revenue, and computes average order value from paid orders. The current schema has no explicit currency field, so v1 infers `CNY` and emits a warning.

## 5. Product Revenue Attribution

Attribution uses the most specific available product key from an order: product id, tool id, product slug, or product name. If no key can be matched to a product record, the amount stays in unattributed revenue and EBOS emits a warning instead of guessing.

## 6. First-Revenue Validation

`firstRevenueAchieved` is true only when there is at least one paid order and net revenue is greater than zero. If net revenue is zero, EBOS must state that real revenue validation is not complete and generate an action item to choose 1-2 high-readiness products for the first validation run.

## 7. Action Item Generation

Revenue action items come from observed gaps:

- No net revenue: choose 1-2 high-readiness products for first validation.
- Price exists but delivery is incomplete: complete download or delivery handling.
- Orders exist but cannot be attributed: add or verify order-to-product attribution fields.
- Product readiness is high but paid orders are absent: validate the revenue path for that product.

## 8. How To Run

Generate Revenue Evidence:

```bash
npx tsx scripts/generate-ebos-revenue-evidence.ts
```

Optional arguments:

```bash
npx tsx scripts/generate-ebos-revenue-evidence.ts --date 2026-07-03 --site-url https://www.enhe-tech.com.cn
```

Outputs:

- `reports/ebos/revenue/YYYY-MM-DD-revenue-evidence.md`
- `reports/ebos/evidence/revenue_evidence/YYYY-MM-DD-revenue_evidence.json`

## 9. How To Reindex The Catalog

After generating evidence, refresh the EBOS evidence catalog:

```bash
npx tsx scripts/index-ebos-evidence.ts
```

Weekly and monthly generators can then consume the latest `revenue_evidence` entry from `reports/ebos/evidence/catalog/latest-evidence-catalog.json`.

## 10. Future Manual And Marketplace Revenue Sources

Whop, Taobao, Xianyu, and manual revenue inputs should be added as explicit evidence sources, not blended silently into database revenue. Each source needs source name, period, amount, currency, confidence, and reconciliation notes before it can influence EBOS revenue scoring.

## 11. Future GA4/GSC Conversion Attribution

GA4 and GSC can later add channel and query attribution, but they should not create revenue on their own. Their role is to connect paid validation back to landing pages, search queries, content, and conversion events after order/payment evidence exists.
