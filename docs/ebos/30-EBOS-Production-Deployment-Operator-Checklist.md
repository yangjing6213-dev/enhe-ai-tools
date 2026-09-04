# EBOS Production Deployment Operator Checklist

## 1. 作用

Production Deployment Operator Checklist 用于把一次真实生产部署拆成可审计、可确认、可回滚的操作清单。它只生成执行前的命令审计、人工操作边界、状态更新模板和上线后验证计划，不代表部署已经发生。

## 2. 与 approval gate 的区别

Approval gate 只回答“用户是否批准进入部署执行阶段”。Operator checklist 回答“批准后应该按什么顺序执行、哪些命令只能人工执行、执行后如何更新状态”。因此 `approved_not_executed` 仍然只是已批准但未执行。

## 3. 为什么 approved_not_executed 不是 deployed

`approved_not_executed` 表示用户确认了部署意图，但 EBOS 尚未记录任何真实 server、Docker、Nginx 命令执行结果，也没有上线后 public route 验证。只有服务器命令被用户确认完成后，状态才可以进入 `deployed_pending_verification`；只有 post-launch check 通过后才可以进入 `verified`。

## 4. 可本地执行的命令

本地命令仅限安全检查和报告生成，例如：

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npx tsx scripts/check-ebos-deployment-execution-status.ts --date 2026-07-03`
- `npx tsx scripts/check-ebos-validation-post-launch.ts --date 2026-07-03 --site-url https://www.enhe-tech.com.cn`，仅在真实部署完成后运行

## 5. 必须在服务器执行的命令

服务器部署、Docker、Nginx 命令必须由用户在服务器环境执行，或在用户明确提供可执行环境并再次授权后执行。当前阶段 Codex 只能列出这些命令并标记为 `manual_required`，不能替用户执行。

## 6. 禁止命令

以下命令在本阶段禁止执行或必须被审计为阻断项：

- `rm -rf`
- `del /s`
- `npx prisma migrate reset`
- `npx prisma migrate deploy`
- `DROP DATABASE`
- `cat .env`、`type .env`、`Get-Content .env`、`printenv`、裸 `env`
- `docker volume rm`

## 7. 如何审计命令

`scripts/audit-ebos-deployment-commands.ts` 会读取生产部署计划和 execution runbook，只解析命令文本，不执行命令。审计结果会统计：

- `commandsAudited`
- `dangerousCommandsDetected`
- `migrationCommandsDetected`
- `secretExposureRisks`
- `manualRequiredCommands`
- `safeToProceed`

当危险命令、migration 命令或 secret 暴露命令存在时，`safeToProceed=false`。

## 8. 如何更新状态

状态只能根据真实执行结果更新：

- 本地预检查完成后：保持 `approved_not_executed`，或最多进入 `executing`
- 用户确认服务器命令完成后：进入 `deployed_pending_verification`
- post-launch check 通过后：进入 `verified`
- 执行失败：进入 `failed`
- 已回滚：进入 `rolled_back`

禁止从 `approved_not_executed` 直接跳到 `verified`。

## 9. 如何进入下一步真实部署

下一步必须由用户明确确认是否进入真实生产部署执行。确认前，EBOS 只能继续生成 checklist、审计命令、运行本地质量检查和更新报告，不 SSH、不运行 Docker/Nginx/server 命令、不打印 secret。
