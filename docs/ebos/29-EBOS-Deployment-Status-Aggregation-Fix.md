# EBOS Deployment Status Aggregation Fix

## 问题原因

Step 12.6 已把 deployment execution status 从 `awaiting_approval` 更新为 `approved_not_executed`，但 Weekly/Monthly 报告聚合仍先读取 production deployment approval gate。旧 approval gate 的 `approvalStatus=awaiting_user_approval` 因此覆盖了新的 execution status，导致报告继续显示“等待用户确认部署验证页”。

## Approval Gate 与 Execution Status 的区别

- Approval gate 记录部署前审批门禁：是否需要用户确认、哪些命令需要批准、风险确认和回滚摘要。
- Execution status 记录审批后的执行状态：用户是否已批准、是否已执行命令、是否运行 post-launch check、是否已经验证。

Approval gate 是前置安全门；execution status 是审批后的事实状态。

## 为什么 Execution Status 应优先

一旦存在 execution status，它代表审批门之后的最新执行事实。Weekly/Monthly 的下一步计划应基于 execution status，而不是旧 approval gate 的原始等待状态。

状态优先级为：

1. `verified`
2. `deployed_pending_verification`
3. `executing`
4. `approved_not_executed`
5. `awaiting_approval`
6. `not_started`

## approved_not_executed 的正确含义

`approved_not_executed` 表示：

- 已批准部署验证页。
- 尚未执行真实部署。
- 不得声称已经 deployed。
- 下一步是执行部署 runbook 中的部署命令，并在部署后运行 post-launch check。

## Weekly/Monthly 如何引用

Weekly top action 使用：

- `Execute approved validation deployment`

Monthly OKR / Codex task 使用：

- `Execute approved deployment and run post-launch verification`

Evidence JSON 必须保留 execution status 字段：

- `deploymentStatus`
- `approvedByUser`
- `approvedAt`

## 为什么不能声称 deployed

`approved_not_executed` 只证明用户审批已记录，不证明任何 server、Docker、Nginx 或 verification 命令已经执行。只有状态进入 `deployed_pending_verification` 后，才表示部署命令已记录但仍需验证；只有 `verified` 才表示 post-launch check 已通过。

## 下一步如何进入真实部署

下一步需要用户明确授权真实生产部署后，按 deployment execution runbook 执行受控命令，并把每条命令写回 execution status。部署后必须运行 post-launch check；通过后才能把 status 更新为 `verified`，再开始真实外部渠道数据回填。
