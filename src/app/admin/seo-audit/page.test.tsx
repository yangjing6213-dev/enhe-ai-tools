import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import AdminSeoAuditPage from "./page";
import { auditActionError, auditFailureMessage, auditValue } from "./display";

Object.assign(globalThis, { React });
vi.mock("./actions", () => ({
  retrySeoAuditRunAction: vi.fn(), cancelSeoAuditRunAction: vi.fn(), pauseSeoAuditScheduleAction: vi.fn(),
}));
vi.mock("@/lib/i18n", () => ({ getCurrentLocale: async () => "en" }));
vi.mock("@/lib/seo-audit/admin", () => ({
  getSeoAuditAdminDashboard: async () => ({
    asOf: new Date("2026-11-02T03:45:00Z"), windowDays: 30, funnel: [],
    commercial: { effectiveRevenue: 0, refundAmount: 0, refundCount: 0, refundRate: 0, renewalCount: 0, renewalRate: 0, offerMix: [] },
    operations: { queuedRuns: 0, runningRuns: 0, completedRuns: 0, failedRuns: 0, failureRate: 0, paidReportRuns: 0, paidReportDeliveryRate: 0 },
    workerHeartbeats: [], expiringSubscriptions: [],
    recentRuns: [{
      id: "run-123", kind: "scheduled", status: "completed", normalizedOrigin: "https://example.org",
      subscription: { status: "active" }, updatedAt: new Date("2026-11-02T03:45:00Z"),
    }],
  }),
}));

it("keeps the Chinese audit console and its status messages when the storefront language is English", async () => {
  const html = renderToStaticMarkup(await AdminSeoAuditPage({
    searchParams: Promise.resolve({ error: "SEO_AUDIT_RUN_REFUNDED" }),
  }));
  for (const label of ["SEO/GEO 巡检运营", "执行端心跳", "计划巡检", "已完成", "订阅生效中", "已退款", "暂无样本", "暂无任务心跳记录", "北京时间", "11:45", "example.org"]) {
    expect(html).toContain(label);
  }
  expect(html).not.toContain("SEO_AUDIT_RUN_REFUNDED");
  expect(html).not.toContain("Audit Operations");
});

it("translates internal report values but preserves unfamiliar engine evidence", () => {
  expect(auditValue("biweekly")).toBe("每两周");
  expect(auditValue("high")).toBe("高风险");
  expect(auditValue("seo_audit_monitoring")).toBe("巡检监控订阅");
  expect(auditFailureMessage("The audit worker timed out.")).toBe("执行端运行超时。");
  expect(auditFailureMessage("Engine diagnostic E115")).toBe("Engine diagnostic E115");
  expect(auditActionError("unknown-source-text")).not.toContain("unknown-source-text");
});
