import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const pageSource = readFileSync(
  resolve(process.cwd(), "src/app/online-tools/seo-geo-audit/page-shell.tsx"),
  "utf8",
);
const toolSource = readFileSync(
  resolve(process.cwd(), "src/components/seo-audit/seo-audit-tool.tsx"),
  "utf8",
);
const zhRouteSource = readFileSync(
  resolve(
    process.cwd(),
    "src/app/(zh-public)/online-tools/seo-geo-audit/page.tsx",
  ),
  "utf8",
);
const enRouteSource = readFileSync(
  resolve(process.cwd(), "src/app/en/online-tools/seo-geo-audit/page.tsx"),
  "utf8",
);

describe("SEO audit product page source contract", () => {
  it("renders a bilingual actual tool first with the required trust facts", () => {
    for (const expected of [
      "独立站 SEO/GEO 智能巡检",
      "Independent-site SEO/GEO Audit",
      "免费巡检 10 页",
      "Audit 10 pages free",
      "示例报告",
      "Sample report",
      "ENHE AI",
    ]) {
      expect(`${pageSource}\n${toolSource}`).toContain(expected);
    }
    expect(pageSource).toContain("buildPageMetadata");
    expect(pageSource).toContain('/online-tools/seo-geo-audit');
  });

  it("stores only run recovery data and never embeds a full paid report", () => {
    expect(toolSource).toContain("localStorage.setItem");
    expect(toolSource).toContain("runId");
    expect(toolSource).toContain("token");
    expect(toolSource).toContain("/report");
    expect(toolSource).not.toContain("reportJsonKey");
    expect(toolSource).not.toContain("reportMarkdownKey");
    expect(toolSource).not.toContain("pageLimit" + '" value=');
    expect(toolSource).not.toContain("amount" + '" value=');
  });

  it("keeps authoritative conversion events on successful server paths", () => {
    for (const eventName of [
      "seo_audit_submitted",
      "seo_audit_checkout_started",
      "seo_audit_report_downloaded",
      "seo_audit_recheck_started",
    ]) {
      expect(toolSource).not.toContain(`data-analytics-event="${eventName}"`);
    }
    expect(toolSource).toContain('eventName: "seo_audit_summary_viewed"');
    expect(toolSource).toContain('eventName: "seo_audit_paywall_viewed"');
    expect(toolSource).toContain('eventName: "seo_audit_prompt_copied"');
    expect(toolSource).toContain("navigator.clipboard.writeText(prompt)");
  });

  it("mounts the bounded poller and stops it when the tool unmounts", () => {
    expect(toolSource).toContain("createSeoAuditRunPoller({");
    expect(toolSource).toContain("onTemporarilyUnavailable()");
    expect(toolSource).toContain("onAccessError(kind)");
    expect(toolSource).toContain("onCancelPollingPaused()");
    expect(toolSource).toContain("void poller.start()");
    expect(toolSource).toContain("poller.stop()");
    expect(toolSource).toContain("pollerRef.current?.retry()");
  });

  it("ships real Chinese and English product routes", () => {
    for (const source of [zhRouteSource, enRouteSource]) {
      expect(source).toContain("SeoAuditProductPageShell");
      expect(source).toContain("generateSeoAuditProductMetadata");
      expect(source).toContain("PublicSiteChrome");
    }
    expect(zhRouteSource).toContain('locale="zh"');
    expect(enRouteSource).toContain('locale="en"');
  });
});
