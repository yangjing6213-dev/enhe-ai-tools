# SEO/GEO priority fixes

Scope: sitemap pagination counts from the same deduplicated listing snapshot; distinguish free public prompt web library from paid desktop download without changing price/access; replace verified dead brand GitHub identity; remove unsupported trend scores and label editorial context with explanation date (not data collection date).
Non-goals: loading efficiency/font/image/assets, old pricing links, duplicate IBM stories, AI Skill title, migrations, credentials. Preserve untracked docs/audits.
Checks: targeted sitemap regression for raw vs deduplicated count, brand identity tests, rendered trend claims, typecheck/lint/build, production metadata/content/machine-readable consistency and valid final pagination. Existing deployment and rollback procedure; no new schema.
State: implementation in progress; production paid-prompt record identified by exact id cmrm83d3b0010o901ddkfb3ku and slug ai-prompt; content-only update will be backed up and guarded against concurrent edits.

Verified: failing sitemap regression reproduced the raw-count defect; fixed regression plus 44 adjacent tests PASS (45 total). TypeScript, focused ESLint and production build PASS. Product public shortDescription/content updated with exact record and updatedAt guard; original selected fields backed up at /opt/enhe-ai-tools/backups/enhe-prompt-copy-before-20261013.json; price 1 and paid-access flag unchanged. No loading-efficiency files modified. Pending: existing production release and live verification.
