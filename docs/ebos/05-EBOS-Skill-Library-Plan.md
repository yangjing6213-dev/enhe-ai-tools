# EBOS Skill Library Plan

## Purpose

The EBOS skill library should turn recurring operating work into repeatable Codex workflows. Skills should define how to inspect data, generate reports, score opportunities, and safely execute follow-up work.

## Skill Design Rules

- Each skill should do one operating job.
- Each skill should define required inputs, output artifact, verification, and stop conditions.
- Skills should prefer existing project modules over new infrastructure.
- Skills should never hide assumptions or fabricate unavailable metrics.
- Skills should not execute production actions unless the user explicitly requests that action.

## Initial Skill Candidates

### `ebos-status`

Purpose:

- Summarize current EBOS setup, available reports, pending recommendations, and missing integrations.

Inputs:

- repository docs,
- report artifacts,
- optional database report history after persistence exists.

Output:

- concise EBOS status dashboard.

### `ebos-weekly-report`

Purpose:

- Generate the weekly business health report.

Inputs:

- date range,
- internal Prisma metrics,
- optional external signal snapshots.

Output:

- weekly report artifact and recommendation list.

### `ebos-monthly-review`

Purpose:

- Compare weekly reports and produce the monthly strategic review.

Inputs:

- weekly report history,
- completed actions,
- current strategy notes.

Output:

- monthly review and next-month strategic plan.

### `ebos-seo-geo-audit`

Purpose:

- Inspect SEO/GEO health and produce prioritized content or technical actions.

Inputs:

- SEO insights,
- GEO monitoring report,
- sitemap/indexing signals,
- public routes.

Output:

- prioritized SEO/GEO action list.

### `ebos-product-performance`

Purpose:

- Review product catalog, usage, downloads, purchases, conversion, copy, and media completeness.

Inputs:

- product records,
- orders,
- analytics,
- media fields,
- tool detail routes.

Output:

- product priority table and recommended changes.

### `ebos-content-opportunity`

Purpose:

- Turn AI news, AI trends, and search/GEO gaps into content opportunities.

Inputs:

- AI news records,
- AI trend briefings,
- SEO/GEO findings,
- internal link map.

Output:

- topic queue with target page type, intent, internal links, and verification.

### `ebos-report-qa`

Purpose:

- Review EBOS report quality before it is used for decisions.

Checks:

- no fabricated metrics,
- every claim has source label,
- every action has target surface,
- every recommendation has verification,
- missing data is explicitly named.

## Skill Artifact Structure

Recommended future folder:

```text
docs/ebos/skills/
  ebos-weekly-report.md
  ebos-monthly-review.md
  ebos-seo-geo-audit.md
  ebos-product-performance.md
  ebos-content-opportunity.md
  ebos-report-qa.md
```

If these become installed Codex skills later, migrate them into the user's skill directory with a `SKILL.md` per skill and keep this document as the product-level plan.

## First Implementation Priority

Start with `ebos-weekly-report` because it forces the core data contract and exposes which metrics are missing. Do not start with UI; UI should consume a stable report object.

## Verification Plan

- Add example input fixtures for sparse, normal, and anomalous weeks.
- Test scoring rules independently.
- Test report generation with missing optional data.
- Keep generated recommendations deterministic for the same input.

