import { describe, expect, test } from "vitest";
import { renderPostLaunchLiveCheckMarkdown } from "../post-launch-markdown";
import type { EbosPostLaunchLiveCheckReport } from "../post-launch-types";

function report(): EbosPostLaunchLiveCheckReport {
  return {
    reportType: "post_launch_live_check",
    targetDate: "2026-07-03",
    generatedAt: "2026-07-05T10:00:00.000Z",
    siteUrl: "https://www.enhe-tech.com.cn",
    currentDeploymentStatus: "deployed_pending_verification",
    checkedRoutes: ["/validation/ai-prompt-kit"],
    routeResults: [{
      route: "/validation/ai-prompt-kit",
      url: "https://www.enhe-tech.com.cn/validation/ai-prompt-kit",
      httpStatus: 200,
      ok: true,
      contentChecks: [],
      metadataChecks: [],
      ctaChecks: [],
      faqChecks: [],
      complianceChecks: [],
      warnings: [],
      blockers: []
    }],
    overallStatus: "passed",
    canTransitionToVerified: true,
    statusTransition: {
      previousStatus: "deployed_pending_verification",
      nextStatus: "verified",
      updated: true,
      backupPath: "backup.json",
      reason: "passed",
      warnings: []
    },
    blockers: [],
    warnings: [],
    nextActions: ["Collect real external data."]
  };
}

describe("post-launch markdown", () => {
  test("contains the required 10 sections", () => {
    const markdown = renderPostLaunchLiveCheckMarkdown(report());

    for (const heading of [
      "## 1. 验证结论",
      "## 2. 当前部署状态",
      "## 3. 检查的线上 URL",
      "## 4. HTTP 状态检查",
      "## 5. 页面内容检查",
      "## 6. CTA / FAQ / 合规提示检查",
      "## 7. Metadata 检查",
      "## 8. 状态流转",
      "## 9. 阻塞项与警告",
      "## 10. 下一步操作"
    ]) {
      expect(markdown).toContain(heading);
    }
  });
});
