import type { EbosRollbackPlan } from "./deployment-types";

export function buildDeploymentRollbackPlan(options: {
  targetDate: string | Date;
}): EbosRollbackPlan {
  const targetDate = toDateKey(options.targetDate);

  return {
    rollbackStrategy: "Scoped rollback: revert only validation launch surface changes or redeploy the previous reviewed build. Do not reset the whole worktree.",
    filesToRevert: [
      "src/app/(zh-public)/validation/ai-prompt-kit/page.tsx",
      "src/app/en/validation/ai-prompt-kit/page.tsx",
      "src/components/validation-ai-prompt-kit-page.tsx",
      "src/lib/analytics.ts"
    ],
    commands: [
      "Create a reviewed revert commit for validation route files if the route breaks production.",
      "Revert tracking event whitelist changes only if they break build or analytics runtime.",
      "Redeploy the previous known-good build from the server deployment system."
    ],
    dataSafetyNotes: [
      `Keep reports/ebos deployment, validation, weekly, and monthly artifacts for ${targetDate}.`,
      "Do not delete reports/ebos during rollback; reports are audit evidence.",
      "Do not run database reset or destructive Prisma commands for validation-page rollback."
    ],
    warnings: [
      "No destructive git reset, broad checkout, broad Docker cleanup, or report deletion is included.",
      "Rollback requires explicit user confirmation before touching production."
    ]
  };
}

function toDateKey(value: string | Date) {
  if (typeof value === "string") return value.slice(0, 10);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}
