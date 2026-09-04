import { describe, expect, test } from "vitest";
import { renderValidationLaunchExecutionMarkdown } from "../validation-launch-execution-markdown";
import { buildValidationLaunchExecutionReport } from "../validation-launch-execution-report";
import type { EbosValidationLaunchReadinessReport } from "../../validation-launch";

function readiness(): EbosValidationLaunchReadinessReport {
  return {
    reportType: "validation_launch_readiness",
    targetDate: "2026-07-03",
    generatedAt: "2026-07-04T00:00:00.000Z",
    validationPages: [],
    assetFiles: [],
    trackingChecks: [],
    seoGeoChecks: [],
    externalIntakeChecks: [],
    deploymentChecks: [],
    readinessScore: 98,
    readinessStatus: "ready_with_warnings",
    blockers: [],
    warnings: [],
    nextActions: []
  };
}

describe("validation launch execution markdown", () => {
  test("renders 11 required headings", async () => {
    const markdown = renderValidationLaunchExecutionMarkdown(await buildValidationLaunchExecutionReport({
      targetDate: "2026-07-03",
      readinessReport: readiness()
    }));

    for (const heading of [
      "# ENHE Validation Launch Execution Report",
      "## 1. 当前发布状态",
      "## 2. 发布前检查清单",
      "## 3. 验证页路由",
      "## 4. SEO/GEO 与 CTA Tracking",
      "## 5. 外部平台复制发布包",
      "## 6. 上线后 Smoke Test",
      "## 7. 外部数据回填流程",
      "## 8. Codex 可执行步骤",
      "## 9. 用户最少动作",
      "## 10. 回滚方案",
      "## 11. 下一步命令"
    ]) {
      expect(markdown).toContain(heading);
    }
  });

  test("states Codex and user boundaries", async () => {
    const markdown = renderValidationLaunchExecutionMarkdown(await buildValidationLaunchExecutionReport({
      targetDate: "2026-07-03",
      readinessReport: readiness()
    }));

    expect(markdown).toContain("Codex 可以执行");
    expect(markdown).toContain("用户必须确认");
    expect(markdown).toContain("不伪造数据");
  });
});
