# ENHE Production Deployment Approval Gate

## 1. 当前部署状态
- approvalStatus: awaiting_user_approval
- deploymentStatus: awaiting_approval
- siteUrl: https://www.enhe-tech.com.cn
- 当前状态不是 deployed。ready_to_deploy 只代表预检通过，不代表线上已发布。

## 2. 本次上线范围
- Validation page deployment for /validation/ai-prompt-kit and /en/validation/ai-prompt-kit
- EBOS deployment reports, scripts, approval gate, runbook, and status evidence
- No Prisma migration and no /admin/ebos UI are included in this approval gate

## 3. 用户确认门
- Before any production deployment command, the user must reply exactly: 确认部署验证页
- The user must confirm server path, deployment method, and rollback readiness.
- The user must confirm post-launch smoke tests can run against the public site.

## 4. 需要确认的命令
- server | approval=true | Manual confirmation required: Server project path must be confirmed before SSH or deployment commands are run. | Server project path must be confirmed before SSH or deployment commands are run.
- docker | approval=true | docker compose -f deploy/enhe-ai-tools/docker-compose.yml up -d --build | Prepared command; execute only in the appropriate local/server context.
- docker | approval=true | docker compose -f deploy/enhe-ai-tools/docker-compose.yml ps | Prepared command; execute only in the appropriate local/server context.
- nginx | approval=true | nginx -t && nginx -s reload | Nginx reload is approval-required and must be run only in the confirmed server context.

## 5. Codex 可执行动作
- Run local read-only checks.
- Run local lint, typecheck, test, and build commands.
- Generate EBOS local reports, approval files, runbooks, and status templates.
- Read non-sensitive config key names and public report artifacts.

## 6. 用户必须确认的动作
- 回复：确认部署验证页
- 确认服务器路径、部署方式和回滚方案。
- 确认 Docker/Nginx/server 命令可以在生产环境执行。

## 7. 执行记录模板
- approvedByUser: false
- deploymentStatus: not_started
- postLaunchCheckStatus: not_run

## 8. 上线后验证
- verification | approval=false | npx tsx scripts/check-ebos-validation-post-launch.ts --date 2026-07-03 --site-url https://www.enhe-tech.com.cn | Prepared command; execute only in the appropriate local/server context.

## 9. 回滚方案
- Scoped rollback: revert only validation launch surface changes or redeploy the previous reviewed build. Do not reset the whole worktree.
- Create a reviewed revert commit for validation route files if the route breaks production.
- Revert tracking event whitelist changes only if they break build or analytics runtime.
- Redeploy the previous known-good build from the server deployment system.

## 10. 安全边界
- Do not print secret values or production environment variable values.
- Do not run destructive database commands.
- Do not run prisma migrate deploy; this step has no migration and migration deployment is forbidden.
- Do not run SSH, Docker, Nginx, or server commands before explicit user approval.
- Do not claim deployed until the post-launch check passes.

## 11. 下一步操作
- 等待用户明确回复确认部署验证页。
- 确认前只允许继续做本地检查、报告生成和状态模板维护。
- 确认后仍必须记录执行状态并运行 post-launch check。
