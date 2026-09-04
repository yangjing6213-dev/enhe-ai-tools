# EBOS Production Deployment Preflight

## Purpose

Production Deployment Preflight checks whether the AI Prompt Kit validation launch is ready for production deployment. It inspects local build evidence, validation routes, package scripts, Docker/Compose files, deploy docs, Next standalone output, environment key names, rollback plan, and post-deploy smoke-test plan.

It does not deploy, SSH, mutate production, read secret values, or claim that production is already deployed.

## Why Preflight Is Required

Production deployment touches server paths, Docker, Nginx, domains, certificates, databases, and environment variables. A read-only preflight lowers the chance of deploying an incomplete route, missing build, missing Docker configuration, or unsafe rollback path.

## Run Preflight

```powershell
npx tsx scripts/check-ebos-production-deployment-preflight.ts --date 2026-07-03 --site-url https://www.enhe-tech.com.cn
```

Outputs:

- `reports/ebos/deployment/2026-07-03-production-deployment-preflight.json`
- `reports/ebos/deployment/2026-07-03-production-deployment-preflight.md`

## Read readinessStatus

- `blocked`: missing build evidence or validation route. Do not deploy.
- `needs_fixes`: deployment config is incomplete. Fix config before asking for production deployment.
- `ready_to_deploy`: preflight is ready, but deployment still requires explicit user confirmation.

## Generate Deployment Plan

```powershell
npx tsx scripts/generate-ebos-production-deployment-plan.ts --date 2026-07-03 --site-url https://www.enhe-tech.com.cn
```

Outputs:

- `reports/ebos/deployment/2026-07-03-production-deployment-plan.json`
- `reports/ebos/deployment/2026-07-03-production-deployment-plan.md`

The plan separates local commands, server commands, Docker commands, verification commands, rollback steps, and user confirmations.

## Post-Deploy Smoke Test

After explicit deployment confirmation, run:

```powershell
npx tsx scripts/check-ebos-validation-post-launch.ts --date 2026-07-03 --site-url https://www.enhe-tech.com.cn
```

This checks:

- `https://www.enhe-tech.com.cn/validation/ai-prompt-kit`
- `https://www.enhe-tech.com.cn/en/validation/ai-prompt-kit`

## Rollback

Rollback should be scoped:

- Revert validation route files only if route deployment fails.
- Revert tracking event whitelist changes only if they break build or runtime analytics.
- Redeploy the previous known-good build through the existing deployment system.
- Keep `reports/ebos` artifacts for audit evidence.

## Safety Boundaries

- Do not print secret values.
- Do not read `.env` secret values.
- Do not SSH automatically.
- Do not run production deployment without explicit confirmation.
- Do not fabricate deployment status.
- Do not run destructive git or Docker cleanup commands.
