# Workflow covers and bilingual presentation

Scope: automatic repository cover discovery with a project-specific generated fallback, Chinese/English catalog and detail copy, removal of the workflow cover caption, repair of the existing three published entries, and deployment. Preserve collection quotas, deduplication, licensing/security gates, and the latest production UI.

1. Implement and test collector presentation, intake persistence using existing localized blocks, and locale-correct UI. No database migration or new paid service.
2. Validate targeted behaviors, full release checks, independent review, and prepare exact release plus backed-up updates for the existing three entries.
3. Deploy through the existing backup/health workflow, switch the local collector to the tested checkout, and verify published covers and both languages in the browser.

Base: production 850f063832fb98d6a93e058f9c33485b6e36975e; existing legacy state fix preserved as 722d0ba4. Isolated worktree; unrelated worktrees untouched.

Status: implementation complete; final build, browser checks, content backfill and deployment pending. The user added five factual detail sections (overview, use cases, purpose/problems, usage and installation); both languages now require them and render semantic headings. Long-horizon-development skill was not present in either current or migrated skill catalogs; this single record tracks the multi-stage release. Superpowers testing/verification and Ponytail minimal-change guidance apply.

Verification so far: full suite 3354 passed / 110 database-dependent tests skipped; follow-up targeted suite 40 passed; full lint, audit (0 vulnerabilities), initial full build, fresh/upgrade migration drills and release shell checks passed. Independent review found untrusted generated URLs and percentage image dimensions; both were fixed with regression tests. Real data also exposed large README metadata without embedded text and truncated installation chapters; fixed-commit bounded raw reads and larger source excerpts cover these cases. Final build/E2E evidence and deployed status are recorded in the external task receipt, keeping this release reproducible.
