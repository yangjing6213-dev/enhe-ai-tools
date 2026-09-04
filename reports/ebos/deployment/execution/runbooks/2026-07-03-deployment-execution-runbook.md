# ENHE Production Deployment Execution Runbook

## 1. 部署目标
- Deploy the validation pages only after explicit user approval, then verify public routes before any external channel data intake.

## 2. 用户确认句
- 用户必须回复：确认部署验证页

## 3. Codex 可先执行的本地命令
- local | approval=false | npm run lint | Prepared command; execute only in the appropriate local/server context.
- local | approval=false | npm run typecheck | Prepared command; execute only in the appropriate local/server context.
- local | approval=false | npm run build | Prepared command; execute only in the appropriate local/server context.
- local | approval=false | npx tsx scripts/check-ebos-validation-launch-readiness.ts --date 2026-07-03 | Prepared command; execute only in the appropriate local/server context.
- local | approval=false | npx tsx scripts/generate-ebos-validation-launch-execution.ts --date 2026-07-03 | Prepared command; execute only in the appropriate local/server context.
- local | approval=false | git status | Prepared command; execute only in the appropriate local/server context.
- local | approval=false | git diff --stat | Prepared command; execute only in the appropriate local/server context.
- local | approval=false | git add <reviewed files> && git commit -m "ebos: add production deployment preflight" | Prepared command; execute only in the appropriate local/server context.

## 4. 用户确认后才能执行的服务器命令
- server | approval=true | Manual confirmation required: Server project path must be confirmed before SSH or deployment commands are run. | Server project path must be confirmed before SSH or deployment commands are run.
- docker | approval=true | docker compose -f deploy/enhe-ai-tools/docker-compose.yml up -d --build | Prepared command; execute only in the appropriate local/server context.
- docker | approval=true | docker compose -f deploy/enhe-ai-tools/docker-compose.yml ps | Prepared command; execute only in the appropriate local/server context.
- nginx | approval=true | nginx -t && nginx -s reload | Nginx reload is listed as an approval-required production operation. Do not run before explicit user confirmation.

## 5. Docker / Nginx 注意事项
- Docker and Nginx commands are production operations and must not run before approval.
- Confirm server project path and compose file before executing any Docker command.
- Run Nginx config test before reload if Nginx reload is needed.

## 6. 部署后 Smoke Test
- npx tsx scripts/check-ebos-validation-post-launch.ts --date 2026-07-03 --site-url https://www.enhe-tech.com.cn

## 7. Smoke Test 失败时如何回滚
- Create a reviewed revert commit for validation route files if the route breaks production.
- Revert tracking event whitelist changes only if they break build or analytics runtime.
- Redeploy the previous known-good build from the server deployment system.

## 8. Smoke Test 通过后如何更新状态
- Update deployment execution status to verified only after the post-launch check passes.
- Record deployedAt, deployedCommit, and verification command output summary without secrets.
- Regenerate EBOS weekly and monthly reports after verification.

## 9. 真实外部渠道数据回填
- Start real external channel publishing only after deployment status is verified.
- Fill validation external intake with observed metrics only; keep unknown metrics as 0.
- Regenerate validation result, decision, weekly, and monthly reports after intake.

## 10. 安全边界
- 不打印 secret。
- 不自动 SSH。
- 不伪造 deployed 状态。
- Do not SSH or deploy until the user explicitly confirms production deployment.
- No destructive git reset, broad checkout, broad Docker cleanup, or report deletion is included.
- Rollback requires explicit user confirmation before touching production.
- approvalStatus is awaiting_user_approval; this report is not approval and is not deployment.
- This runbook does not deploy production and does not imply approval.
