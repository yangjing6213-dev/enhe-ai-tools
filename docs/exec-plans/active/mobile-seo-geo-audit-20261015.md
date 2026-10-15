# Mobile fixes and SEO/GEO audit — 2026-10-15

## Contract
- Fix mobile footer logo/social alignment and the product section navigation covering content while scrolling; preserve desktop behavior.
- Audit public crawl/indexing signals, AI-readable content, accessibility, loading and conversion paths with recorded evidence. Implement bounded, verified improvements only.
- Preserve the dirty recovery-baseline worktree. Isolated branch `codex/mobile-seo-20261015`, baseline `a540dbb197aa2594e39da0d364247bc54531ce1c` (current remote release branch).
- No production data changes, new paid services, fabricated rankings or traffic/conversion claims. No new EBOS functionality.

## Plan
1. Diagnose and reproduce the two mobile defects; inspect public SEO/GEO, performance and conversion evidence.
2. Make targeted fixes, add focused regression checks and a prioritized audit report.
3. Run relevant tests, lint, types and build; review the diff and publish through the established authorized release flow where applicable, then verify the live result.

## Evidence and status
- Verified: independent mobile implementation, read-only SEO/GEO audit and read-only conversion/performance inspection. Findings and limits: `docs/seo-geo-mobile-audit-2026-10-15.md`.
- Existing unrelated changes in the original worktree are untouched.
- Verified: mobile browser regression 4 passed/2 database-dependent skipped; unit suite 3038 passed/100 skipped with 4 workers (default-concurrency first run had one pre-existing script timeout); full lint via preserve-symlinks, typecheck, production build and independent code review.
- Verified: local production browser/HTTP, centered footer in both languages, optimized homepage image 200 WebP 9848 bytes at 390px/DPR1; forum metadata correct.
- Pending: authorized established release flow and live verification. No production mutation performed by the audit.

## Known limits
- Public HTTP/browser checks do not prove Google indexing, real-user Core Web Vitals or a change in conversion rate; Search Console/analytics evidence must be distinguished from local measurements.
