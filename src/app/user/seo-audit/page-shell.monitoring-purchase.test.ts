import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "src/app/user/seo-audit/page-shell.tsx"),
  "utf8",
);

describe("SEO audit monitoring purchase workspace contract", () => {
  it("offers server-priced monitoring only for owned report and subscription sources", () => {
    expect(source).toContain("purchaseSeoAuditMonitoringAction");
    expect(source).toContain("resolveSeoAuditMonitoringOffer");
    expect(source).toContain("getOrCreateCsrfToken");
    expect(source).toContain('status: "completed"');
    expect(source).toContain('name="sourceType"');
    expect(source).toContain('name="sourceId"');
    expect(source).toContain('name="csrfToken"');
    expect(source).toContain("monitoringOffer.price");
    expect(source).not.toContain('name="amount"');
    expect(source).not.toContain('name="targetOrigin"');
  });

  it("states manual renewal and records a real monitoring workspace view", () => {
    expect(source).toContain("手动续费");
    expect(source).toContain("不会自动扣款");
    expect(source).toContain("Manual renewal");
    expect(source).toContain("No automatic charge");
    expect(source).toContain('eventName: "seo_audit_monitoring_viewed"');
  });
});
