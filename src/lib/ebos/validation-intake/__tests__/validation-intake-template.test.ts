import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test } from "vitest";
import {
  buildExternalIntakeTemplate,
  createEditableExternalIntakeInput,
  renderExternalIntakeTemplateMarkdown,
  writeExternalIntakeTemplateFiles
} from "../validation-intake-template";
import type { EbosValidationCaptureReport } from "../../validation-capture";
import type { EbosValidationInputFile } from "../../validation";

const captureReport: EbosValidationCaptureReport = {
  reportType: "validation_capture_report",
  targetDate: "2026-07-03",
  generatedAt: "2026-07-04T00:00:00.000Z",
  periodStart: "2026-06-29",
  periodEnd: "2026-07-05",
  inputPath: "reports/ebos/validation/inputs/2026-07-03-validation-input.json",
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
    ordersAvailable: true,
    totalOrders: 0,
    paidOrders: 0,
    revenue: 0,
    refundedAmount: 0,
    refundCount: 0,
    ordersByProductOrSlug: {},
    warnings: []
  },
  autofillSummary: {
    candidateChanges: 0,
    applicableChanges: 0,
    skippedChanges: 0,
    appliedChanges: 0
  },
  manualDataSlots: [
    {
      planId: "plan-1",
      field: "listingViews",
      label: "External views",
      description: "Real external listing views.",
      sourceHint: "Marketplace dashboard",
      example: 0,
      requiredForDecision: false
    },
    {
      planId: "plan-1",
      field: "messages",
      label: "Messages",
      description: "Real buyer messages.",
      sourceHint: "External inbox",
      example: 0,
      requiredForDecision: true
    }
  ],
  appliedChanges: [],
  skippedChanges: [],
  warnings: []
};

const validationInput: EbosValidationInputFile = {
  trackerPath: "reports/ebos/validation/templates/2026-07-03-validation-tracker.json",
  targetDate: "2026-07-03",
  results: [
    {
      planId: "plan-1",
      status: "running",
      notes: "Validate prompt kit on external channels."
    }
  ]
};

describe("external intake template", () => {
  test("builds a template from capture manual slots and validation input notes", () => {
    const template = buildExternalIntakeTemplate({
      targetDate: "2026-07-03",
      generatedAt: "2026-07-04T00:00:00.000Z",
      captureReport,
      validationInput,
      sourceCaptureReportPath: "capture.json",
      sourceValidationInputPath: "validation-input.json"
    });

    expect(template.templateType).toBe("external_channel_intake_template");
    expect(template.channels).toEqual(["xianyu", "taobao", "whop", "xiaohongshu", "wechat", "manual_outreach"]);
    expect(template.planFields).toContainEqual(expect.objectContaining({
      planId: "plan-1",
      notes: "Validate prompt kit on external channels.",
      manualFields: expect.arrayContaining(["listingViews", "messages"])
    }));
    expect(template.instructions.join(" ")).toContain("Only fill real observed data");
  });

  test("creates editable input with zero defaults instead of fabricated data", () => {
    const template = buildExternalIntakeTemplate({
      targetDate: "2026-07-03",
      generatedAt: "2026-07-04T00:00:00.000Z",
      captureReport,
      validationInput
    });
    const input = createEditableExternalIntakeInput(template);

    expect(input.inputType).toBe("external_channel_intake_input");
    expect(input.planResults).toHaveLength(6);
    expect(input.planResults[0]).toEqual(expect.objectContaining({
      targetPlanId: "plan-1",
      views: 0,
      clicks: 0,
      messages: 0,
      paidOrders: 0,
      revenue: 0,
      userFeedback: []
    }));
  });

  test("renders markdown guide and CSV-like table", () => {
    const template = buildExternalIntakeTemplate({
      targetDate: "2026-07-03",
      generatedAt: "2026-07-04T00:00:00.000Z",
      captureReport,
      validationInput
    });
    const markdown = renderExternalIntakeTemplateMarkdown(template);

    expect(markdown).toContain("# EBOS External Channel Intake");
    expect(markdown).toContain("Only fill real observed data");
    expect(markdown).toContain("| channel | targetPlanId |");
    expect(markdown).toContain("plan-1");
  });

  test("does not overwrite an existing editable input unless forced", async () => {
    const root = await mkdtemp(join(tmpdir(), "ebos-intake-template-"));
    const template = buildExternalIntakeTemplate({
      targetDate: "2026-07-03",
      generatedAt: "2026-07-04T00:00:00.000Z",
      captureReport,
      validationInput
    });
    const first = await writeExternalIntakeTemplateFiles({ template, outputRoot: root });
    await writeFile(first.inputPath, '{"sentinel":true}\n', "utf8");

    const second = await writeExternalIntakeTemplateFiles({ template, outputRoot: root });

    expect(await readFile(second.inputPath, "utf8")).toBe('{"sentinel":true}\n');
    expect(second.skipped).toContain(first.inputPath);
  });
});
