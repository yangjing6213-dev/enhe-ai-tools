R006_STATUS=OPEN
R006_PHASE1B_GATE=BLOCKED
R006_REASON=PRODUCTION_FINGERPRINT_REQUIRED

# R-006 URL, sitemap and canonical baseline

## Observation

The complete public sitemap was fetched at `2026-08-10T18:14:47.6737060Z` UTC from `https://www.enhe-tech.com.cn/sitemap.xml` with User-Agent `ENHE-Redesign-ReadOnly-Audit/1.0`.

| field | observed value |
|---|---|
| sitemap HTTP status | 200 |
| unique sitemap URLs | 528 |
| zh URL count (path prefix not `/en`) | 265 |
| en URL count (path prefix `/en`) | 263 |
| URL fetches | 528 |
| URL fetch errors | 0 |
| maximum concurrency | 1 (contract maximum is 2) |
| delay between neighboring requests | 350 ms |
| response Content-Type | application/xml |
| response Cache-Control | public, s-maxage=300, stale-while-revalidate=86400 |
| sitemap body SHA-256 | C847CB5DBBA65F05EFA26C17F8A211F59C83E9FDFA75E1B05194DB6507AECA32 |
| evidence CSV | `02-R006-PUBLIC-URL-BASELINE.csv` |

The sitemap is dynamic (`src/app/sitemap.ts` is `force-dynamic` and database-backed), so a later run may legitimately produce a different body hash. The URL list, timestamp and hash above identify this exact baseline; the CSV records each URL, HTTP outcome, redirect/canonical/robots/language fields, and parser-safe metadata probes without storing response bodies.

## Local comparison

`03-R006-LOCAL-ROUTE-INVENTORY.csv` contains 145 route, redirect, generator and configuration records derived from `src/app/**`, `next.config.ts`, `src/app/sitemap.ts`, and `src/lib/public-slugs.ts`. `04-R006-DIFF-REPORT.csv` records 494 `MATCHED` observations, 32 `CODE_PRODUCTION_DRIFT` observations, 6 `NEEDS_DECISION` observations, and 2 `LANGUAGE_PARTNER_MISSING` observations (the public HTML for `/ai-news/agentic-ai` and `/ai-news/openai-workspace-agents-chatgpt-ai` had no `hreflang_en` partner). The drift includes public production paths with no matching local page pattern (including `/about`, `/help`, `/updates`, `/ai-topics`, `/product-demos`, and `/ai-skills` families); it is evidence, not permission to alter routes in this phase. The two language-partner findings are retained as explicit unresolved reconciliation items rather than counted as matched.

The current code's actual upload route is `src/app/api/uploads/[fileName]/route.ts`; the earlier `[...fileName]` notation is not a repository path. The local inventory preserves that fact.

The `/api/uploads/:fileName` inventory row is marked `public` with a drift note because its source performs an anonymous disk-file GET; `noindex/private-intent` describes indexing intent only and is not treated as an access-control proof.

## Closure gate

R-006 cannot close until a deployment SHA or immutable image digest, migration version, and the production route/CDN configuration fingerprint are supplied and reconciled with this URL baseline. Local `HEAD` is not a production fingerprint and is not used as a substitute. Therefore `R006_STATUS=OPEN` and `R006_PHASE1B_GATE=BLOCKED` remain unchanged.
