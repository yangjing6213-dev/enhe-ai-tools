import { describe, expect, test } from "vitest";
import { renderProductionDeploymentPreflightMarkdown } from "../deployment-preflight-markdown";
import type { EbosProductionDeploymentPreflightReport } from "../deployment-types";

function report(): EbosProductionDeploymentPreflightReport {
  return {
    reportType: "production_deployment_preflight",
    targetDate: "2026-07-03",
    generatedAt: "2026-07-04T00:00:00.000Z",
    siteUrl: "https://www.enhe-tech.com.cn",
    validationRoutes: ["/validation/ai-prompt-kit", "/en/validation/ai-prompt-kit"],
    configSummary: {
      packageManagerDetected: "npm",
      scriptsDetected: { lint: true, typecheck: true, build: true, start: true, test: true, "prisma:generate": true },
      nextConfigDetected: true,
      dockerfileDetected: true,
      dockerComposeDetected: true,
      nginxConfigDetected: false,
      deployDocsDetected: true,
      standaloneOutputDetected: true,
      warnings: []
    },
    buildChecks: [],
    routeChecks: [],
    environmentChecks: [],
    dockerChecks: [],
    nginxChecks: [],
    deploymentPlan: { localCommands: [], serverCommands: [], dockerCommands: [], verificationCommands: [], notes: [], warnings: [] },
    rollbackPlan: { rollbackStrategy: "Scoped rollback", filesToRevert: [], commands: [], dataSafetyNotes: [], warnings: [] },
    postDeploySmokeTests: [],
    readinessScore: 90,
    readinessStatus: "ready_to_deploy",
    blockers: [],
    warnings: ["Do not print secret values."],
    nextActions: []
  };
}

describe("deployment preflight markdown", () => {
  test("renders 11 required headings", () => {
    const markdown = renderProductionDeploymentPreflightMarkdown(report());

    for (const heading of [
      "# ENHE Production Deployment Preflight Report",
      "## 1. 部署前结论",
      "## 2. 本次要上线的内容",
      "## 3. 构建与质量检查",
      "## 4. 路由检查",
      "## 5. 环境变量键名检查",
      "## 6. Docker / Nginx / 部署配置检查",
      "## 7. 部署命令计划",
      "## 8. 上线后 Smoke Test",
      "## 9. 回滚方案",
      "## 10. 风险与阻塞项",
      "## 11. 下一步操作"
    ]) {
      expect(markdown).toContain(heading);
    }
  });

  test("does not claim deployment or print secrets", () => {
    const markdown = renderProductionDeploymentPreflightMarkdown(report());

    expect(markdown).toContain("不声称已部署");
    expect(markdown).not.toContain("production deployed successfully");
    expect(markdown).not.toContain("super-secret-value");
  });
});
