import type {
  EbosDeploymentOperatorChecklistItem,
  EbosDeploymentOperatorChecklistReport,
  EbosDeploymentOperatorPhase,
  EbosDeploymentOperatorRiskLevel
} from "../deployment-operator";
import type { EbosDeploymentStatus } from "../deployment-execution";
import type {
  EbosServerDeploymentCommandEnvironment,
  EbosServerDeploymentCommandGroup,
  EbosServerDeploymentCommandPack,
  EbosServerDeploymentExecutionOrderStep
} from "./deployment-server-intake-types";

const commandPhaseOrder: Array<{
  phase: EbosDeploymentOperatorPhase;
  environment: EbosServerDeploymentCommandEnvironment;
  groupId: string;
  title: string;
  orderStep: EbosServerDeploymentExecutionOrderStep;
}> = [
  {
    phase: "server_deploy",
    environment: "server",
    groupId: "server",
    title: "Server 命令",
    orderStep: "server_deploy"
  },
  {
    phase: "docker_restart",
    environment: "docker",
    groupId: "docker",
    title: "Docker 命令",
    orderStep: "docker_commands"
  },
  {
    phase: "nginx_reload",
    environment: "nginx",
    groupId: "nginx",
    title: "Nginx 命令",
    orderStep: "nginx_commands"
  }
];

export function groupManualRequiredCommands(
  operatorChecklist: EbosDeploymentOperatorChecklistReport
): EbosServerDeploymentCommandGroup[] {
  return commandPhaseOrder.flatMap((definition) => {
    const items = operatorChecklist.operatorChecklist.filter((item) => (
      item.phase === definition.phase && item.status === "manual_required"
    ));
    if (items.length === 0) return [];

    return [buildCommandGroup(definition, items)];
  });
}

export function buildExecutionOrder(
  commandGroups: EbosServerDeploymentCommandGroup[]
): EbosServerDeploymentExecutionOrderStep[] {
  const environments = new Set(commandGroups.map((group) => group.environment));
  const order = commandPhaseOrder
    .filter((definition) => environments.has(definition.environment))
    .map((definition) => definition.orderStep);

  return [...order, "status_recording"];
}

export function buildServerDeploymentCommandPack(options: {
  targetDate: string | Date;
  currentDeploymentStatus: EbosDeploymentStatus;
  operatorChecklist: EbosDeploymentOperatorChecklistReport;
  resultInputTemplatePath: string;
  generatedAt?: string;
}): EbosServerDeploymentCommandPack {
  const targetDate = toDateKey(options.targetDate);
  const commandGroups = groupManualRequiredCommands(options.operatorChecklist);
  const manualRequiredCommands = commandGroups.flatMap((group) => group.commands);

  return {
    packType: "server_deployment_command_pack",
    targetDate,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    currentDeploymentStatus: options.currentDeploymentStatus,
    manualRequiredCommands,
    commandGroups,
    executionOrder: buildExecutionOrder(commandGroups),
    resultInputTemplatePath: options.resultInputTemplatePath,
    safetyWarnings: [
      "Codex 本阶段不 SSH、不运行 server/docker/nginx 命令。",
      "执行结果必须来自真实服务器，不能用计划或本地构建结果代替。",
      "不要打印、复制或提交 secret、token、password、.env 内容。",
      "不要运行 Prisma migration、database reset 或破坏性清理命令。"
    ],
    rollbackNotes: buildRollbackNotes(options.operatorChecklist),
    nextCommands: [
      `npx tsx scripts/check-ebos-server-deployment-result-input.ts --date ${targetDate}`,
      `npx tsx scripts/record-ebos-server-deployment-result.ts --date ${targetDate} --input ${options.resultInputTemplatePath}`
    ]
  };
}

function buildCommandGroup(
  definition: (typeof commandPhaseOrder)[number],
  items: EbosDeploymentOperatorChecklistItem[]
): EbosServerDeploymentCommandGroup {
  return {
    groupId: definition.groupId,
    title: definition.title,
    environment: definition.environment,
    commands: items.map(commandFromItem),
    expectedOutcome: expectedOutcomeFor(definition.environment),
    failureHandling: failureHandlingFor(definition.environment),
    evidenceToCollect: evidenceToCollectFor(definition.environment),
    rollbackNote: rollbackNoteFor(items),
    riskLevel: highestRiskLevel(items.map((item) => item.riskLevel)),
    approvalRequired: items.some((item) => item.approvalRequired)
  };
}

function commandFromItem(item: EbosDeploymentOperatorChecklistItem) {
  const command = item.command?.trim();
  if (!command) return `manual_required: ${item.title}`;
  if (hasSecretRisk(command)) return "[redacted secret-risk command; manual_required]";
  return command;
}

function expectedOutcomeFor(environment: EbosServerDeploymentCommandEnvironment) {
  if (environment === "server") {
    return "服务器项目路径和执行上下文已被真实操作者确认，后续命令只在正确服务器环境执行。";
  }
  if (environment === "docker") {
    return "生产 Docker compose stack 完成构建/刷新，并能看到目标容器状态。";
  }
  return "Nginx 配置测试通过后完成 reload；如果配置测试失败，不执行 reload。";
}

function failureHandlingFor(environment: EbosServerDeploymentCommandEnvironment) {
  if (environment === "server") {
    return "如果服务器路径或权限不明确，立即停止，不要猜测路径，并在 failures 中记录原因。";
  }
  if (environment === "docker") {
    return "如果 build、up 或 ps 失败，停止后续 Nginx 步骤，收集非 secret 错误摘要并准备 scoped rollback。";
  }
  return "如果 nginx -t 失败，不要 reload；如果 reload 失败，记录错误摘要并准备 scoped rollback。";
}

function evidenceToCollectFor(environment: EbosServerDeploymentCommandEnvironment) {
  if (environment === "server") {
    return [
      "服务器项目路径确认摘要，不包含主机 secret。",
      "执行账号/目录上下文的非 secret 描述。"
    ];
  }
  if (environment === "docker") {
    return [
      "docker compose up/build 的成功或失败摘要。",
      "docker compose ps 的目标服务状态摘要。"
    ];
  }
  return [
    "nginx -t 的通过或失败摘要。",
    "nginx reload 是否执行的确认摘要。"
  ];
}

function rollbackNoteFor(items: EbosDeploymentOperatorChecklistItem[]) {
  const notes = unique(items.map((item) => item.rollbackNote).filter(isString));
  return notes.length > 0
    ? notes.join(" ")
    : "失败时只执行已审查的 scoped rollback，不 reset 数据库，不删除 EBOS reports。";
}

function buildRollbackNotes(operatorChecklist: EbosDeploymentOperatorChecklistReport) {
  const notes = unique(operatorChecklist.operatorChecklist
    .filter((item) => item.phase === "rollback" || item.rollbackNote)
    .map((item) => item.rollbackNote ?? item.command)
    .filter(isString));

  return notes.length > 0
    ? notes
    : ["只执行 scoped rollback；不要 reset 数据库，不要删除 reports/ebos 审计材料。"];
}

function highestRiskLevel(levels: EbosDeploymentOperatorRiskLevel[]): EbosDeploymentOperatorRiskLevel {
  if (levels.includes("high")) return "high";
  if (levels.includes("medium")) return "medium";
  return "low";
}

function hasSecretRisk(command: string) {
  return /(\.env|secret|password|token|api[_-]?key|printenv|^env$)/i.test(command);
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function toDateKey(value: string | Date) {
  if (typeof value === "string") return value.slice(0, 10);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}
