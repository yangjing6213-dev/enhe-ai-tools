# EBOS Roadmap

## Step 0: Project Start And Development Rules

Status: current.

Goals:

- Document project brief, PRD, roadmap, architecture, skill plan, and Codex rules.
- Understand existing routes, database, admin structure, product modules, news modules, and trend modules.
- Avoid business-code changes.
- Run existing verification commands.

Exit criteria:

- `docs/ebos/` exists with the initial document set.
- Root `AGENTS.md` exists.
- The next implementation module is clearly recommended.

## Step 1: EBOS Read-Only Data Contract

Goal:

Create typed report inputs and deterministic metric builders without adding UI or migrations.

Likely files:

- `src/lib/ebos/types.ts`
- `src/lib/ebos/date-window.ts`
- `src/lib/ebos/metrics.ts`
- `src/lib/ebos/report.ts`
- focused Vitest tests

Deliverables:

- weekly window calculation,
- data-source status model,
- section schemas,
- score/confidence conventions,
- empty-data warnings,
- unit tests.

## Step 2: Local Weekly Report Generator

Goal:

Generate a weekly EBOS markdown or HTML artifact from current database data.

Likely files:

- `scripts/generate-ebos-weekly-report.ts`
- `src/lib/ebos/adapters/*.ts`
- `output/ebos/` generated artifacts, ignored or documented as runtime output.

Deliverables:

- report CLI,
- current-week and previous-week comparison,
- links to relevant admin routes,
- warnings for missing data,
- reproducible local command.

## Step 3: EBOS Recommendation Engine

Goal:

Convert metrics into prioritized actions.

Inputs:

- analytics events,
- admin dashboard metrics,
- product usage/download/order data,
- AI news and AI trends data,
- SEO insights,
- GEO monitoring reports.

Deliverables:

- deterministic scoring,
- priority tiers,
- action templates,
- confidence labels,
- tests for scoring edge cases.

## Step 4: Admin EBOS Review Page

Goal:

Add `/admin/ebos` as a read-only review surface.

Deliverables:

- report list,
- latest weekly report,
- recommendation table,
- links to affected pages and admin modules,
- no automatic publishing actions.

Prerequisite:

- Step 1 and Step 2 report contracts are stable.

## Step 5: Report History Persistence

Goal:

Store EBOS report runs and recommendations in PostgreSQL.

Deliverables:

- reviewed Prisma migration,
- persistence tests,
- admin report history,
- monthly comparison support.

## Step 6: External Search And Market Integrations

Goal:

Ingest verified external signals.

Candidate integrations:

- Google Search Console,
- Bing Webmaster Tools,
- PageSpeed/Lighthouse,
- AI answer-engine visibility checks,
- public trend research artifacts.

Rules:

- store source, timestamp, and confidence,
- never mix unverified research with observed site metrics without labels,
- keep credentials outside the repository.

## Step 7: Monthly Strategic Review

Goal:

Create a monthly strategy artifact from weekly report history.

Deliverables:

- monthly health trend,
- repeated risk list,
- content/product bets,
- strategy changes,
- next-month execution plan.

## Risk Register

- Dirty worktree risk: avoid unrelated edits and summarize touched files.
- Data sparsity risk: early reports may contain missing-data warnings.
- Over-automation risk: EBOS should recommend first, automate later.
- External API risk: add integrations only after credentials, quotas, and failure modes are documented.
- Strategy drift risk: every recommendation needs a target page/module and verification check.

