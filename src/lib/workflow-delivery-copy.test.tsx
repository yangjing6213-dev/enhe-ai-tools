import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { buildLocalizedToolFaqItems, buildLocalizedToolSummary, buildLocalizedToolTutorialItems } from "@/lib/tool-localization";
import { ToolCard } from "@/components/tool-card";

Object.assign(globalThis, { React });

vi.mock("@/components/prefetch-link", () => ({
  PrefetchLink: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

const workflow = {
  slug: "workflow-source",
  name: "工作流示例",
  englishName: "Workflow example",
  shortDescription: "A workflow project with setup instructions in the upstream repository.",
  type: "ai_workflow" as const,
};

describe("workflow delivery copy", () => {
  it.each(["zh", "en"] as const)("describes repository access without inventing ENHE downloads (%s)", (locale) => {
    const faqs = buildLocalizedToolFaqItems([], { ...workflow, workflowDeliveryMode: "repository_link" }, locale);
    const copy = faqs.map(({ question, answer }) => `${question} ${answer}`).join(" ");
    expect(faqs).toHaveLength(3);
    expect(copy).toContain("GitHub");
    expect(copy).not.toMatch(/账号服务|课程|购买软件|after purchase|payment review|account service|course/i);
    expect(buildLocalizedToolTutorialItems([], workflow, locale)).toEqual([]);
  });

  it.each(["zh", "en"] as const)("distinguishes free and paid ENHE packages (%s)", (locale) => {
    const free = buildLocalizedToolFaqItems([], { ...workflow, workflowDeliveryMode: "package", isDownloadPaid: false }, locale);
    const paid = buildLocalizedToolFaqItems([], { ...workflow, workflowDeliveryMode: "package", isDownloadPaid: true, workflowPackagePrice: 20 }, locale);
    expect(free[0].answer).toMatch(locale === "zh" ? /免费.*受保护.*下载/ : /free.*protected.*download/i);
    expect(paid[0].answer).toMatch(locale === "zh" ? /支付成功.*解锁/ : /successful payment.*unlocks/i);
    expect(free[0].answer).not.toMatch(/支付成功|after payment/i);
  });

  it("keeps authored workflow FAQs without padding unrelated questions", () => {
    const authored = [{ id: "authored", question: "What does this project require?", answer: "Read the upstream setup notes for the current runtime requirements." }];
    expect(buildLocalizedToolFaqItems(authored, workflow, "en")).toEqual(authored);
  });

  it.each(["zh", "en"] as const)("renders repository recommendations without course or download promises (%s)", (locale) => {
    const html = renderToStaticMarkup(<ToolCard locale={locale} tool={{ ...workflow, isVipRequired: false, downloadCount: 0, usageCount: 0, downloadFileId: null, aiWorkflowCandidate: { status: "published", fileId: null } }} />);
    expect(html).toContain(locale === "zh" ? "仅 GitHub 原仓库" : "GitHub repository only");
    expect(html).not.toMatch(/账号服务|课程内容|免费下载|免费体验|Account service|Course content|Get free|Free trial/i);
  });

  it("does not promise an ENHE package when recommendation delivery data is missing", () => {
    const html = renderToStaticMarkup(<ToolCard locale="en" tool={{ ...workflow, isVipRequired: false, downloadCount: 0, usageCount: 0 }} />);
    expect(html).toContain("Check delivery details");
    expect(html).not.toContain("Get free");
    expect(html).not.toContain("Course content");
    const fallbackSummary = buildLocalizedToolSummary({ ...workflow, shortDescription: "仅中文简介" }, "en");
    expect(fallbackSummary).toContain("AI workflow entry");
    expect(fallbackSummary).not.toContain("AI software app");
  });

  it.each([
    { status: "pending_pricing", fileId: "file-1", toolFileId: "file-1" },
    { status: "published", fileId: "file-1", toolFileId: "file-other" },
  ])("does not offer a package before matching published delivery is available ($status)", ({ status, fileId, toolFileId }) => {
    const html = renderToStaticMarkup(<ToolCard locale="en" tool={{ ...workflow, isVipRequired: false, isDownloadPaid: true, downloadPrice: 20, downloadCount: 0, usageCount: 0, downloadFileId: toolFileId, aiWorkflowCandidate: { status, fileId } }} />);
    expect(html).toContain("GitHub repository only");
    expect(html).not.toMatch(/¥20|Get free|Paid download/);
  });

  it.each([false, true])("shows package delivery and the actual price state (paid=%s)", (isPaid) => {
    const html = renderToStaticMarkup(<ToolCard locale="en" tool={{ ...workflow, isVipRequired: false, isDownloadPaid: isPaid, downloadPrice: isPaid ? 20 : 0, downloadCount: 0, usageCount: 0, downloadFileId: "file-1", aiWorkflowCandidate: { status: "published", fileId: "file-1" } }} />);
    expect(html).toContain("Download/setup notes");
    expect(html).toContain(isPaid ? "¥20.00" : "Free package");
    expect(html).not.toContain("Course content");
  });

  it.each([
    { label: "missing", price: undefined },
    { label: "zero", price: 0 },
    { label: "invalid", price: Number.NaN },
    { label: "infinite", price: Number.POSITIVE_INFINITY },
  ])("does not turn a paid flag into free access when price is $label", ({ price }) => {
    for (const locale of ["zh", "en"] as const) {
      const faqs = buildLocalizedToolFaqItems([], { ...workflow, workflowDeliveryMode: "package", isDownloadPaid: true, workflowPackagePrice: price }, locale);
      const html = renderToStaticMarkup(<ToolCard locale={locale} tool={{ ...workflow, isVipRequired: false, isDownloadPaid: true, downloadPrice: price, downloadCount: 0, usageCount: 0, downloadFileId: "file-1", aiWorkflowCandidate: { status: "published", fileId: "file-1" } }} />);
      expect(faqs[0].answer).toContain(locale === "zh" ? "查看价格" : "Check the price");
      expect(faqs[0].answer).not.toMatch(/免费|解锁|free|unlocks/i);
      expect(html).toContain(locale === "zh" ? "查看价格与获取方式" : "Check price and access");
      expect(html).not.toMatch(/免费|\bFree\b|Get free/);
    }
  });

  it.each(["zh", "en"] as const)("keeps unspecified package pricing neutral (%s)", (locale) => {
    const faqs = buildLocalizedToolFaqItems([], { ...workflow, workflowDeliveryMode: "package" }, locale);
    const html = renderToStaticMarkup(<ToolCard locale={locale} tool={{ ...workflow, isVipRequired: false, downloadCount: 0, usageCount: 0, downloadFileId: "file-1", aiWorkflowCandidate: { status: "published", fileId: "file-1" } }} />);
    expect(faqs[0].answer).not.toMatch(/免费|解锁|free|unlocks/i);
    expect(html).toContain(locale === "zh" ? "查看价格与获取方式" : "Check price and access");
    expect(html).not.toMatch(/免费|\bFree\b|Get free/);
  });
});
