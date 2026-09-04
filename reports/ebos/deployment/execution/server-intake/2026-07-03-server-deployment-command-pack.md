# ENHE Server Deployment Command Pack

## 1. 当前状态
- targetDate: 2026-07-03
- currentDeploymentStatus: executing
- manualRequiredCommands: 7
- 真实生产部署：no
- Codex 已运行 server/docker/nginx 命令：no
- 执行结果必须来自真实服务器，不能由 Codex 伪造。

## 2. 服务器执行顺序
- 1. server_deploy
- 2. docker_commands
- 3. nginx_commands
- 4. status_recording

## 3. Server 命令
- 风险等级：high
- 需要批准：true
- 预期结果：服务器项目路径和执行上下文已被真实操作者确认，后续命令只在正确服务器环境执行。
- 命令：
- `Server project path must be confirmed before SSH or deployment commands are run.`
- `Manual confirmation required: Server project path must be confirmed before SSH or deployment commands are run.`
- 需要收集的结果：
- 服务器项目路径确认摘要，不包含主机 secret。
- 执行账号/目录上下文的非 secret 描述。
- 失败处理：如果服务器路径或权限不明确，立即停止，不要猜测路径，并在 failures 中记录原因。
- 回滚提示：Stop and use scoped rollback if this command fails.

## 4. Docker 命令
- 风险等级：high
- 需要批准：true
- 预期结果：生产 Docker compose stack 完成构建/刷新，并能看到目标容器状态。
- 命令：
- `docker compose -f deploy/enhe-ai-tools/docker-compose.yml up -d --build`
- `docker compose -f deploy/enhe-ai-tools/docker-compose.yml ps`
- `docker compose -f deploy/enhe-ai-tools/docker-compose.yml up -d --build`
- `docker compose -f deploy/enhe-ai-tools/docker-compose.yml ps`
- 需要收集的结果：
- docker compose up/build 的成功或失败摘要。
- docker compose ps 的目标服务状态摘要。
- 失败处理：如果 build、up 或 ps 失败，停止后续 Nginx 步骤，收集非 secret 错误摘要并准备 scoped rollback。
- 回滚提示：Stop and use scoped rollback if this command fails.

## 5. Nginx 命令
- 风险等级：high
- 需要批准：true
- 预期结果：Nginx 配置测试通过后完成 reload；如果配置测试失败，不执行 reload。
- 命令：
- `nginx -t && nginx -s reload`
- 需要收集的结果：
- nginx -t 的通过或失败摘要。
- nginx reload 是否执行的确认摘要。
- 失败处理：如果 nginx -t 失败，不要 reload；如果 reload 失败，记录错误摘要并准备 scoped rollback。
- 回滚提示：Stop and use scoped rollback if this command fails.

## 6. 需要收集的执行结果
- 服务器项目路径确认摘要，不包含主机 secret。
- 执行账号/目录上下文的非 secret 描述。
- docker compose up/build 的成功或失败摘要。
- docker compose ps 的目标服务状态摘要。
- nginx -t 的通过或失败摘要。
- nginx reload 是否执行的确认摘要。

## 7. 如何填写 server-deployment-result.json
- 文件路径：reports/ebos/deployment/execution/command-results/2026-07-03-server-deployment-result.json
- 只有真实服务器执行完成后，才把对应 completed 字段改为 true。
- deployedAt 必须填写真实完成时间；不能用生成模板的时间代替。
- commandSummaries、evidence 只写非 secret 摘要。
- failures 有任何内容时，状态不能进入 deployed_pending_verification。

## 8. 失败处理
- Server 命令: 如果服务器路径或权限不明确，立即停止，不要猜测路径，并在 failures 中记录原因。
- Docker 命令: 如果 build、up 或 ps 失败，停止后续 Nginx 步骤，收集非 secret 错误摘要并准备 scoped rollback。
- Nginx 命令: 如果 nginx -t 失败，不要 reload；如果 reload 失败，记录错误摘要并准备 scoped rollback。

## 9. 回滚提示
- Stop and use scoped rollback if this command fails.
- If route checks fail, keep status pending verification and review scoped rollback.
- Do not run broad reset or destructive database commands.

## 10. 下一步命令
- npx tsx scripts/check-ebos-server-deployment-result-input.ts --date 2026-07-03
- npx tsx scripts/record-ebos-server-deployment-result.ts --date 2026-07-03 --input reports/ebos/deployment/execution/command-results/2026-07-03-server-deployment-result.json

## 安全警告
- Codex 本阶段不 SSH、不运行 server/docker/nginx 命令。
- 执行结果必须来自真实服务器，不能用计划或本地构建结果代替。
- 不要打印、复制或提交 secret、token、password、.env 内容。
- 不要运行 Prisma migration、database reset 或破坏性清理命令。
