import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import type { EbosValidationInputFile } from "../validation";
import { buildValidationAutofillChanges, createManualDataSlots } from "./validation-autofill-mapper";
import type {
  EbosValidationAnalyticsSummary,
  EbosValidationCaptureReport,
  EbosValidationCaptureSummaryReference,
  EbosValidationOrderSummary
} from "./validation-capture-types";

export function buildValidationCaptureReport(options: {
  targetDate: string;
  generatedAt?: string | Date;
  periodStart: string;
  periodEnd: string;
  inputPath: string;
  backupPath?: string;
  input: EbosValidationInputFile;
  analyticsSummary: EbosValidationAnalyticsSummary;
  orderSummary: EbosValidationOrderSummary;
}): EbosValidationCaptureReport {
  const manualDataSlots = createManualDataSlots(options.input);
  const changes = buildValidationAutofillChanges({
    capture: {
      reportType: "validation_capture_report",
      targetDate: options.targetDate,
      generatedAt: toIso(options.generatedAt ?? new Date()),
      periodStart: options.periodStart,
      periodEnd: options.periodEnd,
      inputPath: options.inputPath,
      ...(options.backupPath ? { backupPath: options.backupPath } : {}),
      analyticsSummary: options.analyticsSummary,
      orderSummary: options.orderSummary,
      autofillSummary: { candidateChanges: 0, applicableChanges: 0, skippedChanges: 0, appliedChanges: 0 },
      manualDataSlots,
      appliedChanges: [],
      skippedChanges: [],
      warnings: []
    },
    input: options.input
  });
  const appliedChanges = changes.filter((change) => change.applied);
  const skippedChanges = changes.filter((change) => !change.applied);
  const warnings = [
    ...options.analyticsSummary.warnings,
    ...options.orderSummary.warnings
  ];

  return {
    reportType: "validation_capture_report",
    targetDate: options.targetDate,
    generatedAt: toIso(options.generatedAt ?? new Date()),
    periodStart: options.periodStart,
    periodEnd: options.periodEnd,
    inputPath: options.inputPath,
    ...(options.backupPath ? { backupPath: options.backupPath } : {}),
    analyticsSummary: options.analyticsSummary,
    orderSummary: options.orderSummary,
    autofillSummary: {
      candidateChanges: changes.length,
      applicableChanges: appliedChanges.length,
      skippedChanges: skippedChanges.length,
      appliedChanges: 0
    },
    manualDataSlots,
    appliedChanges,
    skippedChanges,
    warnings
  };
}

export function renderValidationCaptureReportMarkdown(report: EbosValidationCaptureReport) {
  return [
    "# ENHE Validation Capture Report",
    "",
    `目标日期：${report.targetDate}`,
    `生成时间：${report.generatedAt}`,
    `输入文件：${report.inputPath}`,
    report.backupPath ? `备份文件：${report.backupPath}` : "",
    "",
    "## 1. 自动采集总览",
    `本报告只汇总站内真实数据库可读取的数据；不会伪造外部渠道数据。Analytics available=${report.analyticsSummary.analyticsAvailable}，orders available=${report.orderSummary.ordersAvailable}。`,
    `可自动回填候选：${report.autofillSummary.candidateChanges}；可应用：${report.autofillSummary.applicableChanges}；跳过：${report.autofillSummary.skippedChanges}。`,
    "",
    "## 2. Analytics 事件摘要",
    `来自真实数据库的 Analytics 事件数：${report.analyticsSummary.eventsDetected}`,
    `CTA 点击事件数：${report.analyticsSummary.ctaClicksDetected}`,
    `Page view 事件数：${report.analyticsSummary.pageViewsDetected}`,
    listObject(report.analyticsSummary.eventsByName),
    "",
    "## 3. 订单与收入摘要",
    `来自真实数据库的订单数：${report.orderSummary.totalOrders}`,
    `Paid orders：${report.orderSummary.paidOrders}`,
    `Revenue：${report.orderSummary.revenue}`,
    `Refund count：${report.orderSummary.refundCount}`,
    `Refunded amount：${report.orderSummary.refundedAmount}`,
    "",
    "## 4. 可自动回填字段",
    list(report.appliedChanges.map((change) => `${change.planId}.${change.field}: ${String(change.oldValue)} -> ${String(change.newValue)} (${change.source}, ${change.confidence})`)),
    "",
    "## 5. 已跳过字段",
    list(report.skippedChanges.map((change) => `${change.planId}.${change.field}: ${change.reason}`)),
    "",
    "## 6. 需要人工补充的数据",
    "以下仍需人工补充，来源必须是真实外部平台或用户反馈，不能由 Codex 代填。",
    list(report.manualDataSlots.map((slot) => `${slot.planId}.${slot.field}: ${slot.description}`)),
    "",
    "## 7. 数据质量提醒",
    list(report.warnings.map((warning) => `[${warning.severity}] ${warning.message}`)),
    "",
    "## 8. 下一步操作",
    list([
      "先运行 autofill dry-run 检查将写入的字段。",
      "确认没有覆盖人工填写数据后，再使用 --apply 写回 validation-input。",
      "写回后运行 check-ebos-validation-input 和 generate-ebos-validation-report。",
      "外部渠道数据仍需人工从真实平台补充。"
    ])
  ].filter((line) => line !== "").join("\n");
}

export async function readValidationCaptureReportForDate(options: {
  targetDate: string | Date;
  reportsRoot?: string;
  fs?: {
    readFile(filePath: string, encoding?: "utf8"): Promise<string>;
    readdir?(directory: string): Promise<string[]>;
  };
}): Promise<{ filePath: string; report: EbosValidationCaptureReport } | null> {
  const fs = options.fs ?? { readFile: async (filePath: string) => readFile(filePath, "utf8"), readdir };
  const targetDate = toDateKey(options.targetDate);
  const directory = join(options.reportsRoot ?? "reports/ebos", "validation", "capture").replace(/\\/g, "/");
  const exactPath = `${directory}/${targetDate}-validation-capture-report.json`;
  const exact = await readCaptureReportFile(exactPath, fs);
  if (exact) return { filePath: exactPath, report: exact };
  if (!fs.readdir) return null;

  try {
    const fileName = (await fs.readdir(directory))
      .filter((name) => name.endsWith("-validation-capture-report.json"))
      .sort()
      .at(-1);
    if (!fileName) return null;
    const filePath = `${directory}/${fileName}`;
    const report = await readCaptureReportFile(filePath, fs);
    return report ? { filePath, report } : null;
  } catch {
    return null;
  }
}

export function summarizeCaptureForValidationReport(report: EbosValidationCaptureReport): EbosValidationCaptureSummaryReference {
  return {
    analyticsAvailable: report.analyticsSummary.analyticsAvailable,
    eventsDetected: report.analyticsSummary.eventsDetected,
    ctaClicksDetected: report.analyticsSummary.ctaClicksDetected,
    ordersAvailable: report.orderSummary.ordersAvailable,
    paidOrders: report.orderSummary.paidOrders,
    revenue: report.orderSummary.revenue,
    refundCount: report.orderSummary.refundCount,
    manualSlotsCount: report.manualDataSlots.length,
    warnings: report.warnings.map((warning) => warning.message)
  };
}

async function readCaptureReportFile(
  filePath: string,
  fs: { readFile(filePath: string, encoding?: "utf8"): Promise<string> }
) {
  try {
    const report = JSON.parse(await fs.readFile(filePath, "utf8")) as EbosValidationCaptureReport;
    return report.reportType === "validation_capture_report" ? report : null;
  } catch {
    return null;
  }
}

function list(items: string[]) {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : "- none";
}

function listObject(values: Record<string, number>) {
  const entries = Object.entries(values);
  return entries.length ? entries.map(([key, value]) => `- ${key}: ${value}`).join("\n") : "- none";
}

function toIso(value: string | Date) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toDateKey(value: string | Date) {
  if (typeof value === "string") return value.slice(0, 10);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

