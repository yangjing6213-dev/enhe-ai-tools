import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ findTool: vi.fn() }));

vi.mock("@/lib/auth", () => ({ getCurrentUser: vi.fn(async () => null) }));
vi.mock("@/lib/db", () => ({
  prisma: {
    tool: { findUnique: mocks.findTool, findMany: vi.fn(async () => []) },
    aiWorkflowReview: { aggregate: vi.fn(async () => ({ _count: { id: 0 }, _avg: { rating: null } })) },
  },
}));
vi.mock("@/lib/public-content", () => ({
  resolvePublicToolSlug: vi.fn(async () => ({ id: "workflow-1", canonicalSlug: "ai-workflow-123-design" })),
}));
vi.mock("@/app/actions", () => ({
  createCommentAction: vi.fn(), deletePublicCommentAction: vi.fn(), createSoftwareDownloadOrderAction: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  notFound: () => { throw new Error("NEXT_NOT_FOUND"); },
  permanentRedirect: (href: string) => { throw new Error(`NEXT_REDIRECT:${href}`); },
  useRouter: () => ({ prefetch: vi.fn() }),
}));
vi.mock("@/app/ai-workflows/workflow-interactions", () => ({
  AiWorkflowFavoriteButton: () => null, AiWorkflowInstallPanel: () => null, AiWorkflowReviewForm: () => null,
}));

import { AiWorkflowContent } from "@/app/ai-workflows/workflow-content";
import { ToolDetailPageShell, generateToolDetailPageMetadata } from "./page-shell";

function fixture(type: "software" | "ai_workflow" = "ai_workflow") {
  return {
    id: "workflow-1", slug: "ai-workflow-123-design", name: "设计助手", englishName: "Design Assistant", type, status: "published",
    shortDescription: "[[zh]]根据文字创建设计稿。[[/zh]]\n[[en]]Create design drafts.[[/en]]",
    content: "[[zh]]生成可编辑的网页设计。[[/zh]]\n[[en]]Generate editable web designs.[[/en]]",
    systemRequirement: "[[zh]]参阅原仓库运行要求。[[/zh]]\n[[en]]See upstream setup requirements.[[/en]]",
    isDownloadPaid: false, downloadPrice: 0, downloadCount: 0, usageCount: 0, downloadFile: null, coverImage: null,
    category: null, priceSpecs: [], tagLinks: [], tutorials: [], faqs: [], changelogs: [], comments: [], screenshots: [], supportedAgents: [], aiWorkflowReviews: [],
    _count: { aiWorkflowFavorites: 0 },
    aiWorkflowCandidate: type === "ai_workflow" ? {
      status: "published", fileId: null, projectType: "workflow", topic: { name: "工作效率", englishName: "Productivity" },
      repositoryUrl: "https://github.com/example/design", repositoryOwner: "example", repositoryName: "design", licenseSpdx: "MIT",
      verifiedEnvironments: [], githubStars: 100, failureReason: "PACKAGE_LANGUAGE_UNSUPPORTED", starsUpdatedAt: null,
    } : null,
  };
}

function elements(node: React.ReactNode): React.ReactElement<Record<string, unknown>>[] {
  return React.Children.toArray(node).flatMap((child) => {
    if (!React.isValidElement<Record<string, unknown>>(child)) return [];
    return [child, ...elements(child.props.children as React.ReactNode)];
  });
}

describe("workflow detail localized publication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("React", React);
    vi.stubEnv("DATABASE_URL", "postgresql://fixture.invalid/test");
    mocks.findTool.mockResolvedValue(fixture());
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  it.each(["zh", "en"] as const)("keeps the exact %s text in the hero, body, requirements and metadata", async (locale) => {
    const page = await ToolDetailPageShell({ slug: "ai-workflow-123-design", forceLocale: locale, expectedType: "ai_workflow" });
    const all = elements(page);
    const sourceArchiveButton = all.find((element) => element.props.href === "/api/ai-workflows/ai-workflow-123-design/source-archive");
    expect(sourceArchiveButton?.props.children).toBe(locale === "en" ? "Download GitHub source ZIP" : "下载 GitHub 源码 ZIP");
    const purchase = all.find((element) => element.props.id === "tool-purchase");
    const actions = elements(purchase?.props.children as React.ReactNode);
    const repositoryAction = actions.find((element) => element.props.href === "https://github.com/example/design");
    expect(repositoryAction).toBeDefined();
    const sourceActionIndex = actions.findIndex((element) => element.props.href === sourceArchiveButton?.props.href);
    expect(sourceActionIndex).toBe(actions.indexOf(repositoryAction!) + 1);
    expect(actions[sourceActionIndex].type).toBe(repositoryAction!.type);
    const facts = all.find((element) => String(element.props.className ?? "").includes("tool-detail-facts-grid"));
    expect(elements(facts?.props.children as React.ReactNode).some((element) => element.props.href === sourceArchiveButton?.props.href)).toBe(false);
    const hero = all.find((element) => element.type === "section");
    const html = renderToStaticMarkup(hero);
    expect(html).toContain(locale === "en" ? "Create design drafts." : "根据文字创建设计稿。");
    expect(html).toContain(locale === "en" ? "See upstream setup requirements." : "参阅原仓库运行要求。");
    expect(html).not.toContain(locale === "en" ? "根据文字创建设计稿。" : "Create design drafts.");
    expect(html).not.toContain("[[");
    const body = all.filter((element) => element.type === AiWorkflowContent).map((element) => element.props.content);
    expect(body).toContain(locale === "en" ? "Generate editable web designs." : "生成可编辑的网页设计。");
    const sourceSection = renderToStaticMarkup(all.find((element) => element.props.id === "workflow-source"));
    expect(sourceSection).toContain(locale === "en" ? "Workflow" : "工作流");
    expect(sourceSection).not.toContain(">workflow<");
    const metadata = await generateToolDetailPageMetadata(locale, "ai-workflow-123-design", "/ai-workflows");
    expect(metadata.description).toContain(locale === "en" ? "Create design drafts." : "根据文字创建设计稿。");
    expect(JSON.stringify(metadata)).not.toContain("[[");
  });

  it("removes the workflow cover label and supplies a generated cover", async () => {
    const page = await ToolDetailPageShell({ slug: "ai-workflow-123-design", forceLocale: "zh", expectedType: "ai_workflow" });
    const hero = elements(page).find((element) => element.type === "section");
    const html = renderToStaticMarkup(hero);
    expect(html).not.toContain("ENHE 工具封面");
    expect(html).toContain('src="/api/ai-workflows/covers/ai-workflow-123-design"');
  });

  it("preserves the cover label on other product types", async () => {
    mocks.findTool.mockResolvedValue(fixture("software"));
    const page = await ToolDetailPageShell({ slug: "ai-workflow-123-design", forceLocale: "zh", expectedType: "software" });
    const hero = elements(page).find((element) => element.type === "section");
    expect(renderToStaticMarkup(hero)).toContain("ENHE 工具封面");
  });

  it("renders all four reviewed English FAQs in the existing product FAQ card", async () => {
    const questions = [
      "What can I do with the web library?",
      "Do I need to sign in to use the web library?",
      "How many prompts are included?",
      "Does the free web library include the desktop download?",
    ];
    mocks.findTool.mockResolvedValue({
      ...fixture("software"),
      faqs: questions.map((question, index) => ({
        id: `faq-${index + 1}`,
        question: `[[zh]][[/zh]][[en]]${question}[[/en]]`,
        answer: `[[zh]][[/zh]][[en]]This reviewed English answer contains enough words for the product FAQ display.[[/en]]`,
      })),
    });

    const page = await ToolDetailPageShell({ slug: "ai-workflow-123-design", forceLocale: "en", expectedType: "software" });
    const faqSection = elements(page).find((element) => element.props.id === "tool-faq");
    const html = renderToStaticMarkup(faqSection);

    for (const question of questions) expect(html).toContain(question);
    expect((html.match(/<details\b/g) ?? []).length).toBe(4);
    expect(faqSection?.props.className).toBe("tool-detail-faq-card glass scroll-mt-24 rounded-2xl p-7");
  });
});
