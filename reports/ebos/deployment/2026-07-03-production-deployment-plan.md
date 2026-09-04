# ENHE Production Deployment Plan

- targetDate: 2026-07-03
- siteUrl: https://www.enhe-tech.com.cn
- preflightStatus: ready_to_deploy

## Local Commands
- ready | Run lint locally | npm run lint
- ready | Run typecheck locally | npm run typecheck
- ready | Run production build locally | npm run build
- ready | Regenerate validation launch readiness | npx tsx scripts/check-ebos-validation-launch-readiness.ts --date 2026-07-03
- ready | Regenerate validation launch execution | npx tsx scripts/generate-ebos-validation-launch-execution.ts --date 2026-07-03
- ready | Review git status manually | git status
- ready | Review diff stat manually | git diff --stat
- ready | Create a scoped commit only after review | git add <reviewed files> && git commit -m "ebos: add production deployment preflight"

## Server Commands
- manual_required | Manual confirmation required | Server project path must be confirmed before SSH or deployment commands are run.

## Docker Commands
- ready | Build and start production compose stack on server | docker compose -f deploy/enhe-ai-tools/docker-compose.yml up -d --build
- ready | Verify production containers on server | docker compose -f deploy/enhe-ai-tools/docker-compose.yml ps

## Verification Commands
- ready | Run public post-launch validation routes check | npx tsx scripts/check-ebos-validation-post-launch.ts --date 2026-07-03 --site-url https://www.enhe-tech.com.cn

## Rollback Steps
- Scoped rollback: revert only validation launch surface changes or redeploy the previous reviewed build. Do not reset the whole worktree.
- Create a reviewed revert commit for validation route files if the route breaks production.
- Revert tracking event whitelist changes only if they break build or analytics runtime.
- Redeploy the previous known-good build from the server deployment system.
- Keep reports/ebos deployment, validation, weekly, and monthly artifacts for 2026-07-03.
- Do not delete reports/ebos during rollback; reports are audit evidence.
- Do not run database reset or destructive Prisma commands for validation-page rollback.

## User Confirmations
- Confirm production deployment is approved before any SSH or server command.
- Confirm server project path and deployment method.
- Confirm post-deploy smoke checks can run against the public site.
- Confirm no secret values should be printed in reports or terminal output.

## Warnings
- Do not SSH or deploy until the user explicitly confirms production deployment.
- No destructive git reset, broad checkout, broad Docker cleanup, or report deletion is included.
- Rollback requires explicit user confirmation before touching production.
