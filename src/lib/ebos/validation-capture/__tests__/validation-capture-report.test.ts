import { describe, expect, it } from "vitest";
import { buildValidationCaptureReport, renderValidationCaptureReportMarkdown } from "../validation-capture-report";

describe("validation capture report", () => {
  it("renders the required eight markdown sections", () => {
    const report = buildValidationCaptureReport({
      targetDate: "2026-07-03",
      periodStart: "2026-06-29",
      periodEnd: "2026-07-05",
      inputPath: "reports/ebos/validation/inputs/2026-07-03-validation-input.json",
      input: {
        results: [
          { planId: "validation-direction-3-ai-prompt-kit", status: "running", ctaClicks: 0 }
        ]
      },
      analyticsSummary: {
        analyticsAvailable: true,
        eventsDetected: 1,
        pageViewsDetected: 0,
        ctaClicksDetected: 1,
        eventsByName: { validation_ai_prompt_kit_cta_click: 1 },
        eventsByPath: {},
        warnings: []
      },
      orderSummary: {
        ordersAvailable: true,
        totalOrders: 0,
        paidOrders: 0,
        revenue: 0,
        refundedAmount: 0,
        refundCount: 0,
        ordersByProductOrSlug: {},
        warnings: []
      }
    });
    const markdown = renderValidationCaptureReportMarkdown(report);

    expect(markdown).toContain("## 1. 自动采集总览");
    expect(markdown).toContain("## 2. Analytics 事件摘要");
    expect(markdown).toContain("## 3. 订单与收入摘要");
    expect(markdown).toContain("## 4. 可自动回填字段");
    expect(markdown).toContain("## 5. 已跳过字段");
    expect(markdown).toContain("## 6. 需要人工补充的数据");
    expect(markdown).toContain("## 7. 数据质量提醒");
    expect(markdown).toContain("## 8. 下一步操作");
  });

  it("separates automatic database data from manual slots", () => {
    const report = buildValidationCaptureReport({
      targetDate: "2026-07-03",
      periodStart: "2026-06-29",
      periodEnd: "2026-07-05",
      inputPath: "input.json",
      input: { results: [{ planId: "validation-direction-3-ai-prompt-kit", status: "running" }] },
      analyticsSummary: {
        analyticsAvailable: true,
        eventsDetected: 0,
        pageViewsDetected: 0,
        ctaClicksDetected: 0,
        eventsByName: {},
        eventsByPath: {},
        warnings: []
      },
      orderSummary: {
        ordersAvailable: false,
        totalOrders: 0,
        paidOrders: 0,
        revenue: 0,
        refundedAmount: 0,
        refundCount: 0,
        ordersByProductOrSlug: {},
        warnings: []
      }
    });

    expect(renderValidationCaptureReportMarkdown(report)).toContain("仍需人工补充");
    expect(renderValidationCaptureReportMarkdown(report)).toContain("真实数据库");
  });
});
