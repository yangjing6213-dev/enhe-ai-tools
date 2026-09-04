import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import {
  readOptimizedValidationPageRedeployStatusForDate,
  runOptimizedPageRedeployCheck
} from "../optimized-page-redeploy-checker";
import type { EbosPostLaunchFetch } from "../post-launch-types";

function optimizedHtml(route: string) {
  if (route.includes("/en/")) {
    return [
      "Free sample prompts",
      "100+ prompt templates",
      "Pricing validation",
      "No income guarantee",
      "Human review required",
      "Templates are productivity aids"
    ].join("\n");
  }

  return [
    "先免费领取 5 个高频 Prompt 模板",
    "100+ Prompt 模板",
    "入门模板包",
    "19 元",
    "完整模板包",
    "49 元",
    "商业场景包",
    "99 元",
    "适合谁 / 不适合谁",
    "不保证收益",
    "不承诺平台流量",
    "订单"
  ].join("\n");
}

function fetcher(htmlForRoute: (url: string) => string): EbosPostLaunchFetch {
  return async (url) => ({
    ok: true,
    status: 200,
    url,
    text: async () => htmlForRoute(url)
  });
}

describe("optimized page redeploy checker", () => {
  test("passes when both public routes include Step 20S optimized copy", async () => {
    const report = await runOptimizedPageRedeployCheck({
      targetDate: "2026-07-03",
      siteUrl: "https://www.enhe-tech.com.cn",
      fetcher: fetcher(optimizedHtml)
    });

    expect(report.overallStatus).toBe("passed");
    expect(report.blockers).toHaveLength(0);
    expect(report.routeResults).toHaveLength(2);
  });

  test("fails when the production HTML is healthy but missing optimized copy", async () => {
    const report = await runOptimizedPageRedeployCheck({
      targetDate: "2026-07-03",
      siteUrl: "https://www.enhe-tech.com.cn",
      fetcher: fetcher(() => "ENHE AI Prompt Kit old page")
    });

    expect(report.overallStatus).toBe("failed");
    expect(report.blockers.join("\n")).toContain("missing optimized copy signal");
  });

  test("reads redeploy status summary from generated report", async () => {
    const reportsRoot = join(process.cwd(), "tmp-ebos-optimized-redeploy-test");
    const postLaunchDir = join(reportsRoot, "deployment", "post-launch");
    await mkdir(postLaunchDir, { recursive: true });
    await writeFile(join(postLaunchDir, "2026-07-03-optimized-page-redeploy-check.json"), "{}\n", "utf8");
    await writeFile(join(postLaunchDir, "2026-07-03-optimized-validation-page-redeploy.json"), JSON.stringify({
      reportType: "optimized_validation_page_redeploy",
      targetDate: "2026-07-03",
      generatedAt: "2026-07-06T00:00:00.000Z",
      gitCommitHash: "abc123",
      gitPushResult: "success",
      serverPath: "/opt/enhe-ai-tools",
      gitPullResult: "success",
      dockerBuildResult: "success",
      dockerUpResult: "success",
      nginxReloadResult: "success",
      checkedRoutes: ["/validation/ai-prompt-kit", "/en/validation/ai-prompt-kit"],
      optimizedContentCheckStatus: "passed",
      deploymentStatus: "verified",
      postLaunchCheckStatus: "passed",
      externalPublishingStatus: "waiting_real_data",
      hasRealSignals: false,
      canBackfill: false,
      warnings: [],
      nextActions: []
    }, null, 2), "utf8");

    const status = await readOptimizedValidationPageRedeployStatusForDate({
      targetDate: "2026-07-03",
      reportsRoot
    });

    expect(status.status).toBe("generated");
    expect(status.redeployed).toBe(true);
    expect(status.gitCommitHash).toBe("abc123");
  });
});
