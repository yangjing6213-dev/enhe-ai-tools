import { describe, expect, test } from "vitest";
import { renderRevenueEvidenceMarkdown } from "../revenue-evidence-markdown";
import type { EbosRevenueEvidence } from "../revenue-evidence-types";

function evidence(): EbosRevenueEvidence {
  return {
    evidenceType: "revenue_evidence",
    targetDate: "2026-07-03",
    periodStart: "2026-06-29",
    periodEnd: "2026-07-05",
    generatedAt: "2026-07-03T00:00:00.000Z",
    overallScore: 35,
    confidence: "partial",
    currency: "CNY",
    revenueSummary: {
      grossRevenue: 0,
      netRevenue: 0,
      refundedAmount: 0,
      paidRevenue: 0,
      pendingRevenue: 0,
      unpaidRevenue: 0,
      averageOrderValue: 0,
      firstRevenueAchieved: false
    },
    orderSummary: {
      totalOrders: 0,
      paidOrders: 0,
      pendingOrders: 0,
      unpaidOrders: 0,
      cancelledOrders: 0,
      refundedOrders: 0,
      currentPeriodOrders: 0,
      currentPeriodPaidOrders: 0,
      conversionEvidenceAvailable: false,
      orderStatusBreakdown: {}
    },
    refundSummary: {
      totalRefunds: 0,
      currentPeriodRefunds: 0,
      refundedAmount: 0,
      refundRate: 0,
      refundRisks: []
    },
    productRevenueSummary: {
      productMetrics: [],
      unattributedRevenue: {
        ordersCount: 0,
        paidOrdersCount: 0,
        grossRevenue: 0,
        netRevenue: 0,
        refundedAmount: 0,
        averageOrderValue: 0,
        revenueReadinessScore: 0,
        findings: [],
        risks: [],
        opportunities: [],
        actionItems: []
      },
      recommendedValidationProducts: []
    },
    revenueReadinessFindings: ["尚未完成真实收入验证。"],
    attributionFindings: [],
    risks: ["尚未完成第一批真实收入验证。"],
    opportunities: ["选择 1-2 个产品做付费验证。"],
    actionItems: [],
    warnings: [],
    databaseSummary: {
      hasOrderModel: true,
      hasRefundModel: true,
      hasPaymentModel: true,
      hasProductModel: true,
      orderFieldsDetected: ["amount", "orderStatus"],
      refundFieldsDetected: ["amount", "status"],
      productFieldsDetected: ["id", "slug"],
      attributionFieldsDetected: ["toolId"],
      unsupportedFields: [],
      warnings: []
    }
  };
}

describe("revenue evidence markdown", () => {
  test("contains the required 12 Chinese report headings and no-revenue statement", () => {
    const markdown = renderRevenueEvidenceMarkdown(evidence());

    expect(markdown).toContain("# ENHE Revenue Evidence Report");
    for (const heading of [
      "## 1. 收入验证总体评分",
      "## 2. 收入摘要",
      "## 3. 订单摘要",
      "## 4. 退款摘要",
      "## 5. 产品收入归因",
      "## 6. 第一笔收入验证状态",
      "## 7. 高优先级收益验证产品",
      "## 8. 主要风险",
      "## 9. 增长机会",
      "## 10. Codex 收益验证任务",
      "## 11. 数据库字段与口径说明",
      "## 12. 数据缺口"
    ]) {
      expect(markdown).toContain(heading);
    }
    expect(markdown).toContain("尚未完成真实收入验证");
  });
});
