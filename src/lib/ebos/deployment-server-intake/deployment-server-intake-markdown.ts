import type {
  EbosServerDeploymentCommandEnvironment,
  EbosServerDeploymentCommandGroup,
  EbosServerDeploymentCommandPack
} from "./deployment-server-intake-types";

export function renderServerDeploymentCommandPackMarkdown(pack: EbosServerDeploymentCommandPack) {
  return [
    "# ENHE Server Deployment Command Pack",
    "",
    "## 1. 当前状态",
    `- targetDate: ${pack.targetDate}`,
    `- currentDeploymentStatus: ${pack.currentDeploymentStatus}`,
    `- manualRequiredCommands: ${pack.manualRequiredCommands.length}`,
    "- 真实生产部署：no",
    "- Codex 已运行 server/docker/nginx 命令：no",
    "- 执行结果必须来自真实服务器，不能由 Codex 伪造。",
    "",
    "## 2. 服务器执行顺序",
    list(pack.executionOrder.map((step, index) => `${index + 1}. ${step}`)),
    "",
    "## 3. Server 命令",
    renderGroup(commandGroup(pack, "server")),
    "",
    "## 4. Docker 命令",
    renderGroup(commandGroup(pack, "docker")),
    "",
    "## 5. Nginx 命令",
    renderGroup(commandGroup(pack, "nginx")),
    "",
    "## 6. 需要收集的执行结果",
    list(unique(pack.commandGroups.flatMap((group) => group.evidenceToCollect))),
    "",
    "## 7. 如何填写 server-deployment-result.json",
    `- 文件路径：${pack.resultInputTemplatePath}`,
    "- 只有真实服务器执行完成后，才把对应 completed 字段改为 true。",
    "- deployedAt 必须填写真实完成时间；不能用生成模板的时间代替。",
    "- commandSummaries、evidence 只写非 secret 摘要。",
    "- failures 有任何内容时，状态不能进入 deployed_pending_verification。",
    "",
    "## 8. 失败处理",
    list(pack.commandGroups.map((group) => `${group.title}: ${group.failureHandling}`)),
    "",
    "## 9. 回滚提示",
    list(pack.rollbackNotes),
    "",
    "## 10. 下一步命令",
    list(pack.nextCommands),
    "",
    "## 安全警告",
    list(pack.safetyWarnings)
  ].join("\n");
}

function commandGroup(
  pack: EbosServerDeploymentCommandPack,
  environment: EbosServerDeploymentCommandEnvironment
) {
  return pack.commandGroups.find((group) => group.environment === environment);
}

function renderGroup(group?: EbosServerDeploymentCommandGroup) {
  if (!group) return "- 当前命令包没有该类 manual_required 命令。";
  return [
    `- 风险等级：${group.riskLevel}`,
    `- 需要批准：${group.approvalRequired}`,
    `- 预期结果：${group.expectedOutcome}`,
    "- 命令：",
    list(group.commands.map((command) => `\`${command}\``)),
    "- 需要收集的结果：",
    list(group.evidenceToCollect),
    `- 失败处理：${group.failureHandling}`,
    `- 回滚提示：${group.rollbackNote}`
  ].join("\n");
}

function list(items: string[]) {
  return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- none";
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}
