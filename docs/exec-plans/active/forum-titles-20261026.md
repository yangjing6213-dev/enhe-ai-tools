# Forum title correction — 2026-10-26

User authorized title optimization, push and deployment. UI and unrelated worktrees are excluded.

## Baseline

- Production and GitHub release branch were verified at `e0df13c6ad5d9e242eaec3191c154ce5d3c6edec`.
- This candidate is based on that exact tree, including the latest workflow retries, account recovery and homepage refinements.
- Root cause: the daily publisher wrapped every article headline in the same sentence and ranked 30-day cumulative views before freshness.

## Implementation and verification

1. Keep the reviewed article's content-specific headline without any generic wrapper or truncation of important qualifiers. Prefer eligible articles from the last seven days, then fall back to 30 days; views indicate on-site interest only. Exclude previously used articles and matching recent forum titles. Query dated and undated articles separately so null dates cannot hide fresh material.
2. Rewrite the ten explicitly audited, approved legacy topic titles individually against their existing content. Back up exact prior values, require matching prior title/content/status and automation audit, record each title update. Preserve body, URL, author, comments and reactions. Operational manifest and evidence are outside the repository under `D:/ENHE-Audits/2026-10-26/forum-titles`.
3. Run targeted tests, full tests, type/lint/build, dependency audit, existing release gates and browser smoke checks. Verify remote and production base again before publishing an exact commit and checking live pages.

## Deliberate limits

- No runtime model integration is configured on production; the automatic path uses already reviewed editorial titles, not freshly invented model output. It adds no model bill or network dependency.
- No claim of whole-web trending data or guaranteed viral performance.
- No UI, scheduling frequency, permissions, database schema or unrelated product changes.

## Evidence

- Before implementation, the new regression checks failed (9 failures), reproducing fixed wrapping, truncation and missing source-selection behavior.
- Targeted title/scheduling/API tests: 15 passed after implementation.
- Final release results are recorded with the deployment evidence outside the repository.
