# EBOS Production Deployment Approval Gate

## 1. Why This Gate Exists

`ready_to_deploy` only means the local preflight found no blockers. It does not mean ENHE production has been deployed.

The approval gate prevents EBOS from converting a deployment plan into a production action without explicit user confirmation.

## 2. ready_to_deploy vs deployed

- `ready_to_deploy`: preflight and deployment plan are ready for review.
- `awaiting_approval`: Codex must wait for user confirmation.
- `approved_not_executed`: approval is recorded, but production commands are not executed yet.
- `deployed_pending_verification`: deployment commands were recorded, but public smoke tests have not passed yet.
- `verified`: post-launch checks passed and status was explicitly recorded.

## 3. User Confirmation Phrase

The required phrase is:

```text
确认部署验证页
```

Without that phrase, Codex may only run local checks and generate EBOS reports.

## 4. What Codex May Do Before Approval

- Run local lint, typecheck, tests, and build.
- Generate EBOS preflight, approval gate, runbook, and status templates.
- Read non-sensitive config files and key names.
- Write local reports under `reports/ebos`.

## 5. Commands That Require Approval

Server, Docker, and Nginx commands require explicit user approval. Codex must not run SSH, `docker compose up`, container restart, Nginx reload, or production environment mutation before approval.

## 6. Execution Status

The status template lives under:

```text
reports/ebos/deployment/execution/status/YYYY-MM-DD-deployment-execution-status.json
```

The default status is `approvedByUser=false` and `deploymentStatus=awaiting_approval`.

## 7. Post-Launch Check

After a real deployment is explicitly approved and executed, run:

```text
npx tsx scripts/check-ebos-validation-post-launch.ts --date YYYY-MM-DD --site-url https://www.enhe-tech.com.cn
```

Do not mark deployment as `verified` until the post-launch check passes.

## 8. Rollback

Rollback must be scoped. Revert only the validation route surface or redeploy the previous known-good build. Do not run destructive database commands, broad git reset, or report deletion.

## 9. Safety Boundaries

- Do not print secret values.
- Do not automatically SSH.
- Do not run `prisma migrate deploy` in this step.
- Do not invent a deployed status.
- Do not claim production deployment until execution status and post-launch checks support it.
