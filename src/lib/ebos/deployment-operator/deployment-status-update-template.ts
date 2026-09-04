import type { EbosDeploymentStatusUpdateTemplate } from "./deployment-operator-types";
import type { EbosDeploymentStatus } from "../deployment-execution";

export function buildDeploymentStatusUpdateTemplate(options: {
  targetDate: string | Date;
  currentStatus: EbosDeploymentStatus;
}): EbosDeploymentStatusUpdateTemplate {
  const targetDate = toDateKey(options.targetDate);
  return {
    targetDate,
    currentStatus: options.currentStatus,
    allowedNextStatuses: ["executing", "deployed_pending_verification", "failed", "rolled_back"],
    forbiddenStatuses: ["verified"],
    statusUpdateRules: [
      "approved_not_executed 只能表示已批准但尚未执行真实部署。",
      "本地预检查完成后仍为 approved_not_executed 或 executing，不得写 deployed_pending_verification。",
      "服务器部署命令完成且用户确认后，才允许写 deployed_pending_verification。",
      "不能跳过 post-launch check 直接写 verified。",
      "post-launch check 通过后才允许写 verified。"
    ],
    templateAfterLocalCommands: {
      targetDate,
      deploymentStatus: "approved_not_executed",
      approvedByUser: true,
      postLaunchCheckStatus: "not_run",
      localCommandsRun: [
        "npm run lint",
        "npm run typecheck",
        "npm run build",
        `npx tsx scripts/check-ebos-deployment-execution-status.ts --date ${targetDate}`
      ]
    },
    templateAfterServerCommands: {
      targetDate,
      deploymentStatus: "deployed_pending_verification",
      approvedByUser: true,
      postLaunchCheckStatus: "not_run"
    },
    templateAfterPostLaunchCheck: {
      targetDate,
      deploymentStatus: "verified",
      approvedByUser: true,
      postLaunchCheckStatus: "passed"
    },
    warnings: [
      "Do not write verified until post-launch check has passed.",
      "Do not record server/docker/nginx commands unless the user confirms they were actually executed."
    ]
  };
}

function toDateKey(value: string | Date) {
  if (typeof value === "string") return value.slice(0, 10);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}
