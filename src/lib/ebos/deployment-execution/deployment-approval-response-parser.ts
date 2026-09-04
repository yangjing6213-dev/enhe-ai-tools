export const DEPLOYMENT_APPROVAL_EXPECTED_PHRASE = "确认部署验证页";

export type EbosDeploymentApprovalDecision = "approved" | "rejected" | "blocked";

export type EbosDeploymentApprovalResponseAudit = {
  auditType: "deployment_approval_response_audit";
  targetDate?: string;
  generatedAt: string;
  expectedPhrase: string;
  receivedResponse: string;
  normalizedResponse: string;
  approvalDecision: EbosDeploymentApprovalDecision;
  exactMatch: boolean;
  dangerousInstructions: string[];
  warnings: string[];
  commandsExecuted: false;
  statusTransitionPreview?: {
    previousDeploymentStatus?: string;
    nextDeploymentStatus?: string;
    dryRun: boolean;
    written: boolean;
  };
};

const DANGEROUS_INSTRUCTION_PATTERNS = [
  { label: "migrate", pattern: /migrate|prisma\s+migrate|迁移数据库|顺便\s*migrate/i },
  { label: "delete_database", pattern: /删除数据库|删库|drop\s+database|database\s+reset/i },
  { label: "restart_server", pattern: /重启服务器|restart\s+server|reboot/i },
  { label: "print_env", pattern: /打印环境变量|print\s+env|show\s+env|cat\s+\.env/i },
  { label: "ssh", pattern: /\bssh\b/i },
  { label: "docker_or_nginx", pattern: /docker\s+compose|nginx\s+reload|nginx\s+-s/i }
] as const;

export function normalizeApprovalInput(input: string) {
  return input.normalize("NFKC").trim();
}

export function isExactDeploymentApproval(
  input: string,
  expectedPhrase = DEPLOYMENT_APPROVAL_EXPECTED_PHRASE
) {
  return normalizeApprovalInput(input) === expectedPhrase;
}

export function parseDeploymentApprovalResponse(
  input: string,
  expectedPhrase = DEPLOYMENT_APPROVAL_EXPECTED_PHRASE
) {
  const receivedResponse = input;
  const normalizedResponse = normalizeApprovalInput(input);
  const exactMatch = normalizedResponse === expectedPhrase;
  const dangerousInstructions = detectDangerousInstructions(normalizedResponse);
  const warnings: string[] = [];

  if (dangerousInstructions.length > 0) {
    warnings.push(`dangerous instructions detected: ${dangerousInstructions.join(", ")}`);
  }
  if (!exactMatch && dangerousInstructions.length === 0) {
    warnings.push("approval response is not an exact match; deployment approval is rejected.");
  }

  return {
    expectedPhrase,
    receivedResponse,
    normalizedResponse,
    approvalDecision: dangerousInstructions.length > 0
      ? "blocked" as const
      : exactMatch
        ? "approved" as const
        : "rejected" as const,
    exactMatch,
    dangerousInstructions,
    warnings,
    commandsExecuted: false as const
  };
}

export function buildApprovalResponseAudit(
  input: string,
  expectedPhrase = DEPLOYMENT_APPROVAL_EXPECTED_PHRASE,
  options: {
    targetDate?: string | Date;
    generatedAt?: string;
    statusTransitionPreview?: EbosDeploymentApprovalResponseAudit["statusTransitionPreview"];
  } = {}
): EbosDeploymentApprovalResponseAudit {
  return {
    auditType: "deployment_approval_response_audit",
    ...(options.targetDate ? { targetDate: toDateKey(options.targetDate) } : {}),
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    ...parseDeploymentApprovalResponse(input, expectedPhrase),
    ...(options.statusTransitionPreview ? { statusTransitionPreview: options.statusTransitionPreview } : {})
  };
}

export function renderApprovalResponseAuditMarkdown(audit: EbosDeploymentApprovalResponseAudit) {
  return [
    "# ENHE Deployment Approval Response Audit",
    "",
    "## 1. 审核结论",
    list([
      `approvalDecision: ${audit.approvalDecision}`,
      `commandsExecuted: ${audit.commandsExecuted}`,
      "本报告只解析确认句，不执行部署命令。"
    ]),
    "",
    "## 2. 预期确认句",
    list([audit.expectedPhrase]),
    "",
    "## 3. 用户输入",
    list([audit.receivedResponse || "(empty)"]),
    "",
    "## 4. 是否精确匹配",
    list([
      `exactMatch: ${audit.exactMatch}`,
      `normalizedResponse: ${audit.normalizedResponse || "(empty)"}`
    ]),
    "",
    "## 5. 是否包含危险指令",
    list(audit.dangerousInstructions.length ? audit.dangerousInstructions : ["none"]),
    "",
    "## 6. 状态流转结果",
    list([
      `dryRun: ${audit.statusTransitionPreview?.dryRun ?? true}`,
      `written: ${audit.statusTransitionPreview?.written ?? false}`,
      `previousDeploymentStatus: ${audit.statusTransitionPreview?.previousDeploymentStatus ?? "not_checked"}`,
      `nextDeploymentStatus: ${audit.statusTransitionPreview?.nextDeploymentStatus ?? "not_changed"}`
    ]),
    "",
    "## 7. 下一步操作",
    list(buildNextActions(audit))
  ].join("\n");
}

function detectDangerousInstructions(value: string) {
  return DANGEROUS_INSTRUCTION_PATTERNS
    .filter((item) => item.pattern.test(value))
    .map((item) => item.label);
}

function buildNextActions(audit: EbosDeploymentApprovalResponseAudit) {
  if (audit.approvalDecision === "blocked") {
    return ["Stop approval transition and remove dangerous instructions before retrying."];
  }
  if (audit.approvalDecision === "rejected") {
    return ["Ask for the exact confirmation phrase before any status transition."];
  }
  return ["Approval phrase is exact. Status may move to approved_not_executed only with --apply."];
}

function list(items: string[] = []) {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : "- none";
}

function toDateKey(value: string | Date) {
  if (typeof value === "string") return value.slice(0, 10);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}
