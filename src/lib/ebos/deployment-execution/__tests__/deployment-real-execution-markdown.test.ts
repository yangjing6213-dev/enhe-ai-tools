import { describe, expect, test } from "vitest";
import { renderProductionDeploymentExecutionMarkdown } from "../deployment-real-execution-markdown";
import type { EbosProductionDeploymentExecutionReport } from "../deployment-real-execution-types";

describe("deployment real execution markdown", () => {
  test("renders the 9 required sections without claiming verified deployment", () => {
    const report: EbosProductionDeploymentExecutionReport = {
      reportType: "production_deployment_execution",
      targetDate: "2026-07-03",
      generatedAt: "2026-07-05T00:00:00.000Z",
      executionStatus: {
        statusType: "production_deployment_execution_status",
        targetDate: "2026-07-03",
        updatedAt: "2026-07-05T00:00:00.000Z",
        deploymentStatus: "executing",
        approvedByUser: true,
        approvedAt: "2026-07-04T15:33:18.303Z",
        localCommandsRun: ["npm run lint"],
        serverCommandsRun: [],
        dockerCommandsRun: [],
        verificationCommandsRun: [],
        postLaunchCheckStatus: "not_run",
        notes: [],
        warnings: []
      },
      localCommandResults: [],
      serverCommandResults: [],
      dockerCommandResults: [],
      nginxCommandResults: [],
      verificationReadiness: {
        postLaunchCheckAllowed: false,
        reason: "Waiting for manual server result.",
        command: "npx tsx scripts/check-ebos-validation-post-launch.ts --date 2026-07-03 --site-url https://www.enhe-tech.com.cn"
      },
      statusTransition: {
        previousStatus: "approved_not_executed",
        nextStatus: "executing",
        updated: true,
        reason: "Started execution.",
        warnings: [],
        forbiddenStatuses: ["verified"]
      },
      blockers: [],
      warnings: [],
      nextActions: ["Wait for manual server deployment result."]
    };

    const markdown = renderProductionDeploymentExecutionMarkdown(report);

    for (const title of [
      "## 1. 当前执行状态",
      "## 2. 本地命令执行结果",
      "## 3. 服务器命令执行要求",
      "## 4. Docker / Nginx 手工执行结果",
      "## 5. 状态流转记录",
      "## 6. 阻塞项",
      "## 7. 下一步：服务器执行或上线后验证",
      "## 8. 回滚提示",
      "## 9. 安全边界"
    ]) {
      expect(markdown).toContain(title);
    }
    expect(markdown).not.toContain("deploymentStatus: verified");
  });
});
