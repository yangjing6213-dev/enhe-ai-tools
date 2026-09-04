# EBOS Market Evidence

## 1. Purpose

Market Evidence turns ENHE's market observation seeds, optional public RSS snapshots, and existing EBOS evidence into a repeatable product-opportunity contract. It helps decide what product direction to validate, what content cluster to create, and what should wait.

## 2. Why Market Evidence Comes Before Competitor Evidence

Market Evidence first clarifies user problems, product directions, and ENHE fit. Competitor Evidence can then compare specific alternatives against a clearer target. Without Market Evidence, competitor monitoring risks becoming broad collection without product decisions.

## 3. Manual Input Versus Real Market Data

The default manual input is an observation seed. It records ENHE's current watchlist, such as AI Agent, AI video, local AI, SEO/GEO automation, Prompt Kits, workflow templates, ComfyUI, MCP, and Browser Agent. It does not represent search volume, sales volume, market share, or a verified trend.

## 4. Market Signal Fields

Each signal includes source, source type, title, optional description, optional URL, tags, detected topics, detected product types, detected user problems, relevance score, freshness score, monetization score, and confidence. `rawText` is capped and should not become a long scraped article dump.

## 5. Opportunity Score Rules

`priorityScore` is calculated from:

- demandScore: 0-25
- monetizationPotential: 0-20
- enheFitScore: 0-20
- seoPotential: 0-15
- geoPotential: 0-10
- buildDifficulty: subtract 0-10
- competitionRisk: subtract 0-10

Recommended action thresholds:

- 80+: `build_now`
- 65-79: `validate_first`
- 50-64: `create_content_first`
- 35-49: `watch`
- below 35: `ignore`

If Revenue Evidence says first revenue has not been achieved, high-scoring directions are pushed toward low-cost `validate_first` work before deeper builds.

## 6. Combining Product, Revenue, SEO, And GEO Evidence

Product Evidence can boost market directions that match high-readiness products such as FaceSwap or AI Video pages. Revenue Evidence changes the recommendation from deep build to low-cost validation when `firstRevenueAchieved=false`. SEO/GEO Evidence can improve content-cluster and answerability priorities when their scores are strong.

## 7. Action Item Generation

Action items come from the top recommended directions:

- `build_now`: write product PRD and prepare listing work.
- `validate_first`: run a low-cost offer, waitlist, product-page presale, or content test.
- `create_content_first`: publish a content cluster before building.
- `watch`: keep monitoring without development work.

Each action item includes owner, priority, related section, evidence refs, status, and a verification path.

## 8. How To Run

Generate Market Evidence:

```bash
npx tsx scripts/generate-ebos-market-evidence.ts
```

Optional date:

```bash
npx tsx scripts/generate-ebos-market-evidence.ts --date 2026-07-03
```

Optional public RSS read:

```bash
npx tsx scripts/generate-ebos-market-evidence.ts --include-network-sources
```

RSS sources use `EBOS_MARKET_RSS_URLS`, with comma-separated values such as:

```text
https://example.com/rss.xml|Example RSS,https://news.example.com/feed
```

## 9. How To Reindex The Catalog

After generation, refresh the evidence catalog:

```bash
npx tsx scripts/index-ebos-evidence.ts
```

The latest `market_evidence` entry can then feed weekly and monthly planning.

## 10. Future Public Source Integrations

Future sources can include Reddit, GitHub Trending, Product Hunt, Hacker News, YouTube, and Google Trends. Each source should record source type, URL, collected time, fetch status, and confidence. Tests must mock network access and never depend on live services.

## 11. Safety Rules

Do not fabricate search volume, sales, rankings, market share, or trend strength. Do not call authenticated APIs in this step. Do not read or print secrets. Network failures must generate warnings and continue.
