# EBOS Product Evidence

## 1. Purpose

Product Evidence checks whether ENHE product pages and database product records are ready to convert traffic into orders, downloads, and revenue evidence. It focuses on page-level offer clarity, CTA quality, purchase path, FAQ coverage, media assets, delivery copy, support copy, and read-only product database completeness.

## 2. Why Product Evidence Comes Before UI Dashboard

EBOS needs stable evidence before it needs an admin dashboard. A dashboard without reliable product evidence would only display assumptions. Product Evidence creates a repeatable JSON contract and markdown report that later UI, weekly reports, monthly reviews, and Codex tasks can consume.

## 3. Relationship With SEO/GEO Evidence

SEO Evidence checks whether product pages can be discovered and indexed. GEO Evidence checks whether product pages are answerable and citable by AI systems. Product Evidence checks whether those same pages can turn attention into purchase or download intent. Together they connect discovery, answerability, and conversion readiness.

## 4. Product Page Scoring Rules

Each audited page receives a 0-100 score from these signals:

- Clear hero or title: 10
- Product summary: 10
- Feature list: 10
- Use cases: 8
- Target audience: 8
- Pricing or purchase information: 12
- Primary CTA: 12
- Buy, download, or delivery path: 10
- FAQ section: 10
- Media, video, or image: 10
- Support, refund, compliance, or trust signal: 10

The raw score is clamped to 100.

## 5. Database Completeness Checks

The database auditor performs read-only Prisma queries against existing `Tool` fields and relations. It summarizes total, published, and draft products, plus coverage for price configuration, download configuration, FAQ, cover media, tags, SEO fields, and GEO-friendly fields. Missing selected fields produce warnings instead of crashes.

## 6. Action Item Generation

Action items are generated when audited products miss summaries, FAQ sections, primary CTA, media, delivery information, support copy, price configuration, download configuration, or revenue validation. Each action item includes owner, priority, related section, and status so weekly and monthly planning can promote it.

## 7. How To Run

Run the Product Evidence generator:

```bash
npx tsx scripts/generate-ebos-product-evidence.ts
```

Optional arguments:

```bash
npx tsx scripts/generate-ebos-product-evidence.ts --date 2026-07-03 --site-url https://www.enhe-tech.com.cn
```

Then refresh the evidence catalog:

```bash
npx tsx scripts/index-ebos-evidence.ts
```

## 8. Revenue Evidence Follow-Up

Product Evidence intentionally does not fabricate revenue conclusions. It records the gap when revenue evidence is absent. The next EBOS stage should add `revenue_evidence` so product page readiness can be connected to orders, paid status, refunds, and revenue sources.

## 9. Product Optimization Planning

Use Product Evidence to choose 1-2 high-intent products for revenue validation before broad optimization. Prioritize pages with traffic potential, missing CTA or delivery copy, and incomplete database purchase configuration. The next weekly and monthly reports can convert Product Evidence action items into Codex execution tasks.
