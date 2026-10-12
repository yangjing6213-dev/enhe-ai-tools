# Account likes and PeekRating

- Scope: increase the current hero top whitespace another 30%; white like pills; authenticated account likes toggle and persist; replace comment scoring and read-only stars with official PeekRating.
- Data: add an additive ToolLike relation; reuse NewsArticleLike. Preserve historical anonymous click totals. Serialize toggles per target, reject unpublished targets and unauthenticated writes, synchronize duplicate cards and locales.
- Rating: keep server-side 1–5 validation and native required form validation; clearing selects no score, never deletes a comment. Keep keyboard/touch/reduced-motion behavior and translated labels.
- Checks: focused API and PostgreSQL concurrency/persistence, rating form and account browser checks, lint/typecheck/build, migration/release checks; existing Compose deployment with rollback and live checks.
- State: local verification PASS; production deployment pending. No Google OAuth changes or credential edits.
- Evidence: focused API/source 29 passed; PostgreSQL concurrency/persistence 3 passed; 11 account/rating browser cases and 13 homepage cases passed; full unit suite 2805 passed (100 skipped); production browser profile 359 passed (157 database-gated skipped); lint, typecheck, build, fresh/upgrade migration rehearsal, dependency audit and diff checks passed.
