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
- Verified: complete release browser suite 386 passed/175 conditional skips; release dependency audit and disposable migration/operational drills passed. Image delivery regression assertions updated to inspect optimized endpoint plus real media identity, retaining duplicate-request and image visibility checks.
- Complete: code pushed and production deployed at `1c5014c5aad2538fc4d2bebcfe5843169795a3a1`; the initial remote GitHub TLS interruption was resolved by retrying only the failed fetch/deploy step for the exact validated commit. Production health checks passed; no pending migrations.
- Verified live at 2026-10-15 19:51 Asia/Shanghai: Chinese/English footer centers at 0px offset; product navigation scrolls away with white text; guest purchase return path correct; homepage image 200 WebP 9848 bytes; localized forum metadata and duplicate post noindex correct. Sitemap 200 valid XML, 926 -> 929 URLs, zero duplicates/lost originals; public image robots exception and private disallows correct.
- Evidence: ignored `output/mobile-seo-audit/release.log`, `deploy-retry.log`, `release-verification.json`, `live-seo-verification.json`, footer screenshots. The final documentation-only commit records these results; runtime code remains the verified release above. No production content/account/order mutation performed by the audit.

## Known limits
- Public HTTP/browser checks do not prove Google indexing, real-user Core Web Vitals or a change in conversion rate; Search Console/analytics evidence must be distinguished from local measurements.
