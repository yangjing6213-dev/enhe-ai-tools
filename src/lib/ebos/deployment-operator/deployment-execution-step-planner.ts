import type { EbosDeploymentExecutionStep } from "./deployment-operator-types";

export function buildDeploymentExecutionSteps(options: {
  targetDate: string | Date;
  siteUrl: string;
  manualRequiredCommandsCount: number;
  safeToProceed: boolean;
}): EbosDeploymentExecutionStep[] {
  const targetDate = toDateKey(options.targetDate);
  const siteUrl = options.siteUrl.replace(/\/+$/, "");
  const blockedNote = options.safeToProceed
    ? "命令审计未发现危险命令、migration 命令或 secret 暴露阻断项。"
    : "生产执行前必须停止，并先修复命令审计阻断项。";

  return [
    {
      stepNumber: 1,
      title: "确认当前状态仍为 approved_not_executed",
      actor: "codex_local",
      command: `npx tsx scripts/check-ebos-deployment-execution-status.ts --date ${targetDate}`,
      expectedOutcome: "状态显示 approvedByUser=true，且未记录 server/docker/nginx 命令执行。",
      failureHandling: "停止执行，先检查 status 文件，不准备任何生产执行动作。",
      statusUpdateHint: "此检查不改变状态。",
      mustNotDo: ["不要 SSH。", "不要声称生产部署已完成。"]
    },
    {
      stepNumber: 2,
      title: "运行本地预检查",
      actor: "codex_local",
      command: "npm run lint && npm run typecheck && npm run build",
      expectedOutcome: "在任何生产执行前，本地 lint、typecheck、build 通过。",
      failureHandling: "修复本地失败项，并重新生成 operator checklist 后再继续。",
      statusUpdateHint: "本地命令完成后，状态仍保持 approved_not_executed，最多只能进入 executing。",
      mustNotDo: ["不要从 Codex 运行服务器命令。", "不要运行 Prisma migration。"]
    },
    {
      stepNumber: 3,
      title: "由用户确认服务器执行环境",
      actor: "manual_required",
      expectedOutcome: `用户确认服务器项目路径，并理解 ${options.manualRequiredCommandsCount} 条命令仍需人工或明确授权执行。`,
      failureHandling: "如果服务器路径或部署方式不清楚，停止并请求用户澄清。",
      statusUpdateHint: "真实命令执行前不改变状态。",
      mustNotDo: ["不要编造服务器路径。", "不要打印 secret。"]
    },
    {
      stepNumber: 4,
      title: "用户在服务器执行部署命令",
      actor: "user_server",
      expectedOutcome: "用户反馈具体服务器部署命令已完成，并提供不含 secret 的执行证据。",
      failureHandling: "任何命令失败时，记录 failed 状态并准备 scoped rollback。",
      statusUpdateHint: "服务器执行被用户确认后，状态可以进入 deployed_pending_verification。",
      mustNotDo: ["不要让 Codex 自动 SSH。", "不要运行破坏性清理。"]
    },
    {
      stepNumber: 5,
      title: "用户在服务器执行 Docker / Nginx 步骤",
      actor: "user_server",
      expectedOutcome: "Docker stack 已刷新；如需 Nginx reload，也由用户确认完成。",
      failureHandling: "如果 Docker 或 Nginx 失败，停止并使用 scoped rollback 说明。",
      statusUpdateHint: "公共检查通过前，保持 deployed_pending_verification。",
      mustNotDo: ["不要删除 Docker volume。", "不要运行数据库 reset 命令。"]
    },
    {
      stepNumber: 6,
      title: "部署后运行 post-launch check",
      actor: "codex_local",
      command: `npx tsx scripts/check-ebos-validation-post-launch.ts --date ${targetDate} --site-url ${siteUrl}`,
      expectedOutcome: "仅在用户确认生产命令已执行后，公共 validation routes 检查通过。",
      failureHandling: "检查失败时，保持 deployed_pending_verification 或 failed，并启动 rollback review。",
      statusUpdateHint: "只有 post-launch check 通过后才允许 verified。",
      mustNotDo: ["不要在真实部署前运行非 dry-run 的上线检查。", "不要伪造 route 结果。"]
    },
    {
      stepNumber: 7,
      title: "按真实结果更新 deployment execution status",
      actor: "codex_local",
      expectedOutcome: "状态只反映已观察到的命令执行与验证结果，且不含 secret。",
      failureHandling: "证据不完整时，不要把状态推进到 deployed_pending_verification 之后。",
      statusUpdateHint: "verified 只能在 post-launch check passed 后写入。",
      mustNotDo: ["不要跳过状态流转。", "不要提前写 verified。"]
    },
    {
      stepNumber: 8,
      title: "必要时执行 scoped rollback",
      actor: "manual_required",
      expectedOutcome: blockedNote,
      failureHandling: "只使用限定范围 rollback，并保留 EBOS reports 作为审计证据。",
      statusUpdateHint: "如果发生 rollback，状态可以进入 rolled_back。",
      mustNotDo: ["不要删除 reports/ebos。", "不要 reset 数据库。"]
    }
  ];
}

function toDateKey(value: string | Date) {
  if (typeof value === "string") return value.slice(0, 10);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}
