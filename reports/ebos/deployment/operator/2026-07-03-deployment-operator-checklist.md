# ENHE Production Deployment Operator Checklist

## 1. 当前部署状态
- currentDeploymentStatus: approved_not_executed
- approvedByUser: true
- 这表示已批准进入部署准备，但不表示生产已经完成部署。

## 2. 本次部署范围
- Validation page deployment for /validation/ai-prompt-kit and /en/validation/ai-prompt-kit

## 3. 命令安全审计
- commandsAudited: 31
- safeToProceed: true
- dangerousCommandsDetected: 0
- migrationCommandsDetected: 0
- secretExposureRisks: 0
- manualRequiredCommands: 7

## 4. 本地预检查步骤
- ready | codex_local | Run lint locally
  - riskLevel: low
  - approvalRequired: false
  - command: npm run lint
  - evidence: Local precheck command; safe for Codex to run locally.
- ready | codex_local | Run typecheck locally
  - riskLevel: low
  - approvalRequired: false
  - command: npm run typecheck
  - evidence: Local precheck command; safe for Codex to run locally.
- ready | codex_local | Run production build locally
  - riskLevel: low
  - approvalRequired: false
  - command: npm run build
  - evidence: Local precheck command; safe for Codex to run locally.
- ready | codex_local | Check deployment execution status
  - riskLevel: low
  - approvalRequired: false
  - command: npx tsx scripts/check-ebos-deployment-execution-status.ts --date 2026-07-03
  - evidence: Local precheck command; safe for Codex to run locally.

## 5. 服务器部署步骤
- manual_required | user_server | Manual confirmation required
  - riskLevel: high
  - approvalRequired: true
  - command: Server project path must be confirmed before SSH or deployment commands are run.
  - evidence: Must be executed by the user in the server context or after explicit executable environment confirmation.
- manual_required | user_server | server command
  - riskLevel: high
  - approvalRequired: true
  - command: Manual confirmation required: Server project path must be confirmed before SSH or deployment commands are run.
  - evidence: Must be executed by the user in the server context or after explicit executable environment confirmation.

## 6. Docker / Nginx 步骤
- manual_required | user_server | Build and start production compose stack on server
  - riskLevel: high
  - approvalRequired: true
  - command: docker compose -f deploy/enhe-ai-tools/docker-compose.yml up -d --build
  - evidence: Must be executed by the user in the server context or after explicit executable environment confirmation.
- manual_required | user_server | Verify production containers on server
  - riskLevel: high
  - approvalRequired: true
  - command: docker compose -f deploy/enhe-ai-tools/docker-compose.yml ps
  - evidence: Must be executed by the user in the server context or after explicit executable environment confirmation.
- manual_required | user_server | docker command
  - riskLevel: high
  - approvalRequired: true
  - command: docker compose -f deploy/enhe-ai-tools/docker-compose.yml up -d --build
  - evidence: Must be executed by the user in the server context or after explicit executable environment confirmation.
- manual_required | user_server | docker command
  - riskLevel: high
  - approvalRequired: true
  - command: docker compose -f deploy/enhe-ai-tools/docker-compose.yml ps
  - evidence: Must be executed by the user in the server context or after explicit executable environment confirmation.
- manual_required | user_server | nginx command
  - riskLevel: high
  - approvalRequired: true
  - command: nginx -t && nginx -s reload
  - evidence: Must be executed by the user in the server context or after explicit executable environment confirmation.

## 7. 上线后验证步骤
- ready | codex_local | Run post-launch validation check after user confirms deployment
  - riskLevel: low
  - approvalRequired: false
  - command: npx tsx scripts/check-ebos-validation-post-launch.ts --date 2026-07-03 --site-url https://www.enhe-tech.com.cn
  - evidence: Run only after server deployment commands are confirmed complete.

## 8. 状态更新规则
- approved_not_executed 只能表示已批准但尚未执行真实部署。
- 本地预检查完成后仍为 approved_not_executed 或 executing，不得写 deployed_pending_verification。
- 服务器部署命令完成且用户确认后，才允许写 deployed_pending_verification。
- 不能跳过 post-launch check 直接写 verified。
- post-launch check 通过后才允许写 verified。

## 9. 回滚步骤
- pending | manual_required | Rollback Steps 1
  - riskLevel: high
  - approvalRequired: true
  - command: Scoped rollback: revert only validation launch surface changes or redeploy the previous reviewed build. Do not reset the whole worktree.
  - evidence: Rollback step from deployment plan; execute only if needed and confirmed.
- pending | manual_required | Rollback Steps 2
  - riskLevel: high
  - approvalRequired: true
  - command: Create a reviewed revert commit for validation route files if the route breaks production.
  - evidence: Rollback step from deployment plan; execute only if needed and confirmed.
- pending | manual_required | Rollback Steps 3
  - riskLevel: high
  - approvalRequired: true
  - command: Revert tracking event whitelist changes only if they break build or analytics runtime.
  - evidence: Rollback step from deployment plan; execute only if needed and confirmed.
- pending | manual_required | Rollback Steps 4
  - riskLevel: high
  - approvalRequired: true
  - command: Redeploy the previous known-good build from the server deployment system.
  - evidence: Rollback step from deployment plan; execute only if needed and confirmed.
- pending | manual_required | Rollback Steps 5
  - riskLevel: high
  - approvalRequired: true
  - command: Keep reports/ebos deployment, validation, weekly, and monthly artifacts for 2026-07-03.
  - evidence: Rollback step from deployment plan; execute only if needed and confirmed.
- pending | manual_required | Rollback Steps 6
  - riskLevel: high
  - approvalRequired: true
  - command: Do not delete reports/ebos during rollback; reports are audit evidence.
  - evidence: Rollback step from deployment plan; execute only if needed and confirmed.
- pending | manual_required | Rollback Steps 7
  - riskLevel: high
  - approvalRequired: true
  - command: Do not run database reset or destructive Prisma commands for validation-page rollback.
  - evidence: Rollback step from deployment plan; execute only if needed and confirmed.

## 10. 禁止事项
- 不要 SSH，除非用户明确提供可执行环境并再次确认。
- 不要运行 Docker/Nginx/server 命令。
- 不要打印 secret 或 .env 内容。
- 不要运行 Prisma migration/reset/deploy。
- 不要在 post-launch check 通过前写 verified。
- 不要声称生产已经完成。

## 11. 下一步确认
- Ask the user whether to enter real production deployment execution.
- Keep server/Docker/Nginx commands manual until explicit executable environment is confirmed.

## Blockers
- none

## Warnings
- Must be executed by the user in the server context or after explicit executable environment confirmation.
- This checklist does not execute deployment commands.
- Server, Docker, and Nginx commands remain manual_required.
