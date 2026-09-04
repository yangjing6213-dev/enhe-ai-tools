# EBOS Server Deployment Command Pack

## 1. 为什么需要 Server Deployment Command Pack

Step 14 已把 EBOS deployment status 推进到 `executing`，并完成本地 lint、typecheck、build。服务器、Docker、Nginx 命令仍是 `manual_required`，所以需要一个可复制的命令包，把执行顺序、结果填写方式、失败处理和回滚边界集中到一个地方。

## 2. Codex 能做什么

Codex 可以读取 operator checklist 和 execution status，生成 command pack、Markdown 指南和 `server-deployment-result.json` 模板。Codex 本阶段不 SSH，不运行 server/docker/nginx 命令，不声称生产已完成。

## 3. 用户或服务器操作者必须做什么

服务器操作者必须在真实服务器环境确认项目路径，按 command pack 顺序执行 server、Docker、Nginx 步骤，并收集不含 secret 的输出摘要。执行结果必须来自真实服务器，不能用本地 build 或计划文档代替。

## 4. 如何执行命令

先打开：

```bash
reports/ebos/deployment/execution/server-intake/2026-07-03-server-deployment-command-pack.md
```

按文档顺序执行 Server、Docker、Nginx 命令。遇到任何失败都停止后续步骤，把失败摘要写入 result input 的 `failures`。

## 5. 如何填写 server-deployment-result.json

模板路径：

```bash
reports/ebos/deployment/execution/command-results/2026-07-03-server-deployment-result.json
```

默认所有 completed 字段都是 `false`，`deployedAt` 是 `null`，`evidence` 是空数组。只有真实执行完成后，才把对应字段改为 `true`，并填写真实 `deployedAt`、`commandSummaries`、`evidence` 和 `notes`。

## 6. 进入 deployed_pending_verification 的条件

必须同时满足：

- `serverCommandsCompleted=true`
- `dockerCommandsCompleted=true`
- `nginxCommandsCompleted=true`
- `deployedAt` 已填写
- `failures` 为空

`evidence` 为空只产生 warning，但建议填写非 secret 输出摘要。

## 7. 为什么不能伪造服务器结果

EBOS 的部署状态是审计材料。把计划命令、示例输出或本地构建结果当成服务器执行结果，会导致 `deployed_pending_verification` 和后续 post-launch check 的依据失真。

## 8. 下一步如何运行 record script

先校验输入：

```bash
npx tsx scripts/check-ebos-server-deployment-result-input.ts --date 2026-07-03
```

确认可转换后再记录结果：

```bash
npx tsx scripts/record-ebos-server-deployment-result.ts --date 2026-07-03 --input reports/ebos/deployment/execution/command-results/2026-07-03-server-deployment-result.json
```

如果校验不能转换，status 保持 `executing`。
