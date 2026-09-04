# EBOS Production Deployment Execution

## 1. 作用

Production Deployment Execution 负责把已批准但尚未执行的部署推进到可审计的执行阶段。它只允许 Codex 执行本地安全命令，记录结果，并生成服务器命令的手工执行包。

## 2. 为什么需要第二道确认

Approval gate 表示用户同意部署意图；第二道确认用于确认“现在开始执行真实部署命令”。没有第二道确认时，状态不得从 `approved_not_executed` 进入 `executing`。

## 3. 本地命令和服务器命令的区别

本地命令包括 `npm run lint`、`npm run typecheck`、`npm run build` 和 EBOS 报告脚本。服务器、Docker、Nginx 命令必须由用户在服务器环境执行，或由用户明确提供可执行环境和授权。

## 4. 为什么 Codex 不伪造服务器结果

服务器执行结果必须来自真实执行反馈。EBOS 不把“计划中存在命令”当成“命令已执行”，也不把本地 build 通过当成线上已部署。

## 5. 如何运行 start execution

只有用户明确回复 `确认执行真实部署命令` 后，才可以运行：

```bash
npx tsx scripts/start-ebos-production-deployment-execution.ts --date 2026-07-03 --response "确认执行真实部署命令"
```

该脚本会备份 status，进入 `executing`，运行本地安全命令，并生成 live execution report。

## 6. 如何填写 server deployment result

用户在服务器完成命令后，复制并填写：

`reports/ebos/deployment/execution/command-results/2026-07-03-server-deployment-result.example.json`

只有 `serverCommandsCompleted`、`dockerCommandsCompleted`、`nginxCommandsCompleted` 全部为 `true` 时，状态才可进入 `deployed_pending_verification`。

## 7. 如何进入 post-launch check

`deployed_pending_verification` 后才运行：

```bash
npx tsx scripts/check-ebos-validation-post-launch.ts --date 2026-07-03 --site-url https://www.enhe-tech.com.cn
```

通过前不得写 `verified`。

## 8. 如何回滚

如果本地命令或服务器命令失败，只执行 scoped rollback。不要删除数据库，不要 reset Prisma，不要删除 `reports/ebos` 审计材料。

## 9. 安全边界

- 不 SSH，除非用户明确提供服务器执行环境和授权。
- 不打印 secret 或 `.env` 内容。
- 不运行 Prisma migration。
- 不运行破坏性数据库命令。
- 不伪造服务器执行结果。
- 不在 post-launch check 通过前写 `verified`。
