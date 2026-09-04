import type {
  EbosDeploymentApprovalGate,
  EbosDeploymentExecutionContract,
  EbosDeploymentExecutionRunbook
} from "./deployment-execution-types";

export function renderDeploymentApprovalGateMarkdown(
  gate: EbosDeploymentApprovalGate,
  contract: EbosDeploymentExecutionContract
) {
  return [
    "# ENHE Production Deployment Approval Gate",
    "",
    "## 1. 当前部署状态",
    list([
      `approvalStatus: ${gate.approvalStatus}`,
      `deploymentStatus: ${gate.deploymentStatus}`,
      `siteUrl: ${gate.siteUrl}`,
      "当前状态不是 deployed。ready_to_deploy 只代表预检通过，不代表线上已发布。"
    ]),
    "",
    "## 2. 本次上线范围",
    list(gate.deploymentScope),
    "",
    "## 3. 用户确认门",
    list(gate.userRequiredConfirmations),
    "",
    "## 4. 需要确认的命令",
    list(gate.commandsRequiringApproval.map(formatCommand)),
    "",
    "## 5. Codex 可执行动作",
    list(gate.codexAllowedActions),
    "",
    "## 6. 用户必须确认的动作",
    list([
      "回复：确认部署验证页",
      "确认服务器路径、部署方式和回滚方案。",
      "确认 Docker/Nginx/server 命令可以在生产环境执行。"
    ]),
    "",
    "## 7. 执行记录模板",
    list([
      `approvedByUser: ${contract.executionStatusTemplate.approvedByUser}`,
      `deploymentStatus: ${contract.executionStatusTemplate.deploymentStatus}`,
      `postLaunchCheckStatus: ${contract.executionStatusTemplate.postLaunchCheckStatus}`
    ]),
    "",
    "## 8. 上线后验证",
    list(contract.verificationCommands.map(formatCommand)),
    "",
    "## 9. 回滚方案",
    list([gate.rollbackSummary, ...contract.rollbackCommands]),
    "",
    "## 10. 安全边界",
    list(contract.safetyRules),
    "",
    "## 11. 下一步操作",
    list([
      "等待用户明确回复确认部署验证页。",
      "确认前只允许继续做本地检查、报告生成和状态模板维护。",
      "确认后仍必须记录执行状态并运行 post-launch check。"
    ])
  ].join("\n");
}

export function renderDeploymentExecutionRunbookMarkdown(runbook: EbosDeploymentExecutionRunbook) {
  return [
    "# ENHE Production Deployment Execution Runbook",
    "",
    "## 1. 部署目标",
    list([runbook.deploymentGoal]),
    "",
    "## 2. 用户确认句",
    list([`用户必须回复：${runbook.userConfirmationPhrase}`]),
    "",
    "## 3. Codex 可先执行的本地命令",
    list(runbook.codexPreApprovalCommands.map(formatCommand)),
    "",
    "## 4. 用户确认后才能执行的服务器命令",
    list(runbook.commandsAfterApproval.map(formatCommand)),
    "",
    "## 5. Docker / Nginx 注意事项",
    list(runbook.dockerNginxNotes),
    "",
    "## 6. 部署后 Smoke Test",
    list([runbook.postDeploySmokeTestCommand]),
    "",
    "## 7. Smoke Test 失败时如何回滚",
    list(runbook.smokeTestFailureRollbackSteps),
    "",
    "## 8. Smoke Test 通过后如何更新状态",
    list(runbook.smokeTestSuccessStatusUpdates),
    "",
    "## 9. 真实外部渠道数据回填",
    list(runbook.externalDataNextSteps),
    "",
    "## 10. 安全边界",
    list([
      "不打印 secret。",
      "不自动 SSH。",
      "不伪造 deployed 状态。",
      ...runbook.warnings
    ])
  ].join("\n");
}

function formatCommand(item: {
  environment: string;
  command: string;
  requiresUserApproval: boolean;
  description: string;
}) {
  return `${item.environment} | approval=${item.requiresUserApproval} | ${item.command} | ${item.description}`;
}

function list(items: string[] = []) {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : "- none";
}
