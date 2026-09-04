# EBOS Deployment Guard Batch Manual Review

- reportType: deployment_guard_batch_manual_review
- targetDate: 2026-07-03
- generatedAt: 2026-07-07T17:31:01.5804680+08:00
- safetyDecision: approved_for_commit

## Reviewed Files

- deploy/enhe-ai-tools/scripts/app-entrypoint.sh
- deploy/enhe-ai-tools/docker-compose.yml
- deploy/enhe-ai-tools/README.md

## Approved Files

- deploy/enhe-ai-tools/scripts/app-entrypoint.sh
- deploy/enhe-ai-tools/docker-compose.yml
- deploy/enhe-ai-tools/README.md
- reports/ebos/deployment/2026-07-03-deployment-guard-batch-manual-review.json
- reports/ebos/deployment/2026-07-03-deployment-guard-batch-manual-review.md

## Rejected Files

- package.json: forbidden for this batch.
- package-lock.json: forbidden for this batch.
- prisma/**: database schema and migration files are out of scope.
- src/app/admin/**: admin UI changes are out of scope.
- src/app/api/**: API changes are out of scope.
- .env: secret-bearing environment files are forbidden.
- .next/**: build output is forbidden.
- node_modules/**: dependency output is forbidden.
- unknown/unclassified files: unrelated dirty files require separate review.

## Guard Decision

- guardVariable: RUN_PRISMA_MIGRATE
- defaultBehavior: skip_unless_explicit
- migrationRequiresExplicitEnable: true
- migrationExecutedThisStep: false
- secretExposureRisk: false
- databaseConfigChanged: false
- destructiveCommandDetected: false
- serverCommandsExecuted: false
- dockerCommandsExecuted: false
- nginxCommandsExecuted: false
- gitAddDotUsed: false

## Notes

- `app-entrypoint.sh` now runs `npx prisma migrate deploy` only when `RUN_PRISMA_MIGRATE=1`.
- Default startup logs that Prisma migration is skipped when the variable is not explicitly enabled.
- `docker-compose.yml` passes `RUN_PRISMA_MIGRATE` to the app service with default `0`.
- `README.md` documents that page updates, read-only report updates, and EBOS publishing package updates should not enable migration.

## Warnings

- The main worktree contains broad unrelated dirty changes that remain excluded from this batch.
- Git reports LF-to-CRLF working-copy warnings on edited deployment files; no functional line-ending policy change was made.

## Next Actions

- Stage only approved files with explicit `git add` paths.
- Run EBOS tests, lint, typecheck, and build before commit.
- After commit and push, regenerate weekly and monthly EBOS reports without enabling migration.
