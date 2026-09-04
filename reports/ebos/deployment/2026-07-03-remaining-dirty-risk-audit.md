# EBOS Remaining Dirty Risk Audit

- reportType: remaining_dirty_risk_audit
- targetDate: 2026-07-03
- generatedAt: 2026-07-07T17:57:31.1433785+08:00
- mainProjectPath: C:\Users\HU\Documents\New project 2
- totalRemainingDirty: 180
- modifiedCount: 79
- deletedCount: 1
- untrackedCount: 100
- stagedCount: 0
- expandedUntrackedFileCount: 369

This audit is based on the dirty state before the Step 21.11 report files were written. It did not stage, commit, push, delete, revert, deploy, or run migration.

## Category Summary

| Category | Count | Risk | Can Commit Together | Separate Audit | User Confirmation |
| --- | ---: | --- | --- | --- | --- |
| A. package dependency changes | 2 | high | no | yes | yes |
| B. Prisma/schema/migration changes | 5 | high | no | yes | yes |
| C. admin UI / admin route changes | 4 | high | no | yes | yes |
| D. API route changes | 3 | high | no | yes | yes |
| E. core business logic changes | 43 | high | no | yes | yes |
| F. EBOS report residue | 4 | low | yes | no | no |
| G. generated/cache/build files | 25 | low | no | no | yes |
| H. unknown/unclassified files | 94 | medium | no | yes | yes |

## Risk Summary

- highRiskFiles count: 57
- mediumRiskFiles count: 94
- lowRiskFiles count: 29
- separateAuditRequiredFiles count: 151
- excludedFromAutoCommitFiles count: 176

## A. package dependency changes

- fileCount: 2
- riskLevel: high
- canCommitTogether: no
- requiresSeparateAudit: yes
- requiresUserConfirmation: yes
- recommendedAction: Run a dedicated dependency audit, inspect package.json and package-lock.json together, then commit only after dependency intent is confirmed.

Representative files:
- package-lock.json
- package.json
## B. Prisma/schema/migration changes

- fileCount: 5
- riskLevel: high
- canCommitTogether: no
- requiresSeparateAudit: yes
- requiresUserConfirmation: yes
- recommendedAction: Run a dedicated Prisma audit. Do not auto-commit and do not run migration until schema intent, migration files, backup evidence, and explicit approval are present.

Representative files:
- prisma/seed.ts
- prisma/migrations/20260624013000_add_tool_video_fields/
- prisma/migrations/20260624141000_add_baidu_push_queue/
- prisma/migrations/20260630120000_add_ai_trend_briefing_video_fields/
- prisma/seed-lumios.ts
## C. admin UI / admin route changes

- fileCount: 4
- riskLevel: high
- canCommitTogether: no
- requiresSeparateAudit: yes
- requiresUserConfirmation: yes
- recommendedAction: Review authorization, admin behavior, and UI scope in a separate admin batch.

Representative files:
- src/app/admin/actions.ts
- src/app/admin/license-generator/license-generator-panel.tsx
- src/app/admin/tool-admin-list.tsx
- src/app/admin/tool-media-upload-guard.tsx
## D. API route changes

- fileCount: 3
- riskLevel: high
- canCommitTogether: no
- requiresSeparateAudit: yes
- requiresUserConfirmation: yes
- recommendedAction: Review API behavior, auth, request validation, and compatibility in a separate API batch.

Representative files:
- src/app/api/uploads/[fileName]/route.ts
- src/app/api/revalidate/
- src/app/api/uploads/[...fileName]/
## E. core business logic changes

- fileCount: 43
- riskLevel: high
- canCommitTogether: no
- requiresSeparateAudit: yes
- requiresUserConfirmation: yes
- recommendedAction: Separate src/lib non-EBOS changes by domain such as SEO, analytics, storage, media, license generation, settings, and localization before any commit.

Representative files:
- src/lib/admin-i18n.ts
- src/lib/ai-geo-foundations-source.test.ts
- src/lib/ai-trends-source.test.ts
- src/lib/ai-trends.test.ts
- src/lib/ai-trends.ts
- src/lib/analytics.test.ts
- src/lib/analytics.ts
- src/lib/baidu-push-source.test.ts
- src/lib/baidu-push.test.ts
- src/lib/baidu-push.ts
- src/lib/dictionaries.ts
- src/lib/i18n.test.ts
## F. EBOS report residue

- fileCount: 4
- riskLevel: low
- canCommitTogether: yes
- requiresSeparateAudit: no
- requiresUserConfirmation: no
- recommendedAction: Can be committed later as a dedicated report-only batch after confirming paths stay under reports/ebos/** and contain no secrets.

Representative files:
- reports/ebos/evidence/monthly_review/2026-07-monthly_review.json
- reports/ebos/monthly/2026-07-monthly-review.md
- reports/ebos/deployment/2026-07-03-ebos-safe-batch-commit.json
- reports/ebos/deployment/2026-07-03-ebos-safe-batch-commit.md
## G. generated/cache/build files

- fileCount: 25
- riskLevel: low
- canCommitTogether: no
- requiresSeparateAudit: no
- requiresUserConfirmation: yes
- recommendedAction: Exclude from commit. Clean only with explicit user confirmation because this step must not delete files.

Representative files:
- .superpowers/
- logs/
- tmp-ebos-optimized-redeploy-test/
- tmp-enhe-deploy-0e20975.bundle
- tmp-enhe-deploy-0f769b2.bundle
- tmp-enhe-deploy-4ab8777.bundle
- tmp-enhe-deploy-4da3069.bundle
- tmp-enhe-deploy-4f5d7a3.bundle
- tmp-enhe-deploy-5436561.bundle
- tmp-enhe-deploy-56e7f48.bundle
- tmp-enhe-deploy-5c62a82.bundle
- tmp-enhe-deploy-5fbd00e.bundle
## H. unknown/unclassified files

- fileCount: 94
- riskLevel: medium
- canCommitTogether: no
- requiresSeparateAudit: yes
- requiresUserConfirmation: yes
- recommendedAction: Triage by source and intent before staging. Do not mix with package, Prisma, admin, API, or EBOS report commits.

Representative files:
- .env.example
- deploy/enhe-ai-tools/.env.example
- deploy/enhe-ai-tools/scripts/enhe-install-cron.sh
- middleware.ts
- next.config.ts
- public/llms.txt
- public/okf/ai-news/index.md
- public/okf/index.md
- public/okf/skill-learning/index.md
- public/pricing.md
- scripts/publish-ai-trend-briefing-html.test.ts
- scripts/publish-ai-trend-briefing-html.ts

## Warnings

- Short status has 100 untracked entries, while git ls-files --others expands those directories to 369 untracked files.
- The worktree still contains package, Prisma, admin, API, core src/lib, generated/cache, and unknown file groups.
- This audit intentionally did not stage, commit, push, delete, revert, deploy, or run migration.

## Blockers

- Remaining dirty files are too broad to commit together safely.
- Unknown/unclassified files require owner and intent triage before staging.
- Prisma and package changes require separate approval before any commit.
