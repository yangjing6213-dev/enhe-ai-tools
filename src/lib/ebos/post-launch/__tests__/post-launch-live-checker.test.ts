import { describe, expect, test } from "vitest";
import {
  checkPostLaunchRoute,
  runPostLaunchLiveCheck
} from "../post-launch-live-checker";
import type { EbosPostLaunchFetch } from "../post-launch-types";

function completeHtml() {
  return [
    "<!doctype html><html><head>",
    "<title>AI Prompt Kit Validation</title>",
    "<meta name=\"description\" content=\"Validate AI Prompt Kit with ENHE.\">",
    "</head><body><main>",
    "<h1>AI Prompt Kit</h1>",
    "<a href=\"mailto:hello@example.com\">Contact us</a>",
    "<section><h2>FAQ</h2><p>Common questions.</p></section>",
    "<section><h2>Compliance</h2><p>Disclaimer: validate outputs.</p></section>",
    "</main>",
    "x".repeat(600),
    "</body></html>"
  ].join("");
}

function fetcher(status: number, html = completeHtml()): EbosPostLaunchFetch {
  return async (url) => ({
    ok: status >= 200 && status < 300,
    status,
    url,
    text: async () => html
  });
}

describe("post-launch live checker", () => {
  test("HTTP 200 with complete content can transition to verified", async () => {
    const report = await runPostLaunchLiveCheck({
      targetDate: "2026-07-03",
      siteUrl: "https://www.enhe-tech.com.cn",
      currentDeploymentStatus: "deployed_pending_verification",
      fetcher: fetcher(200)
    });

    expect(report.overallStatus).toBe("passed");
    expect(report.canTransitionToVerified).toBe(true);
    expect(report.routeResults).toHaveLength(2);
  });

  test("404 fails the route and blocks verification", async () => {
    const result = await checkPostLaunchRoute(
      "https://www.enhe-tech.com.cn/validation/ai-prompt-kit",
      "/validation/ai-prompt-kit",
      fetcher(404)
    );

    expect(result.ok).toBe(false);
    expect(result.blockers.join("\n")).toContain("HTTP status 404");
  });

  test("500 fails the report", async () => {
    const report = await runPostLaunchLiveCheck({
      targetDate: "2026-07-03",
      siteUrl: "https://www.enhe-tech.com.cn",
      currentDeploymentStatus: "deployed_pending_verification",
      fetcher: fetcher(500)
    });

    expect(report.overallStatus).toBe("failed");
    expect(report.canTransitionToVerified).toBe(false);
  });

  test("network failure is recorded as blocker instead of crashing", async () => {
    const report = await runPostLaunchLiveCheck({
      targetDate: "2026-07-03",
      siteUrl: "https://www.enhe-tech.com.cn",
      currentDeploymentStatus: "deployed_pending_verification",
      fetcher: async () => {
        throw new Error("network down");
      }
    });

    expect(report.overallStatus).toBe("failed");
    expect(report.blockers.join("\n")).toContain("network down");
  });
});
