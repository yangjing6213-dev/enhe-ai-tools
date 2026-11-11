import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  findTool: vi.fn(),
  findPurchase: vi.fn(),
  findTools: vi.fn(async (_query?: unknown) => [] as Array<{ id: string; slug: string; name: string; englishName: string; type: string }>),
  countCreatorProducts: vi.fn(async () => 0),
  aggregateCreatorRating: vi.fn(async () => ({ _avg: { rating: null as number | null }, _count: { _all: 0 } })),
  createOrder: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/db", () => ({
  prisma: {
    tool: { findUnique: mocks.findTool, findMany: mocks.findTools, count: mocks.countCreatorProducts },
    toolPurchase: { findUnique: mocks.findPurchase },
    comment: { aggregate: mocks.aggregateCreatorRating },
    aiWorkflowVersionPurchase: { findFirst: vi.fn(async () => null) },
  },
}));
vi.mock("@/lib/public-content", () => ({
  resolvePublicToolSlug: vi.fn(async () => ({ id: "tool-1", canonicalSlug: "purchase-fixture" })),
}));
vi.mock("@/app/actions", () => ({
  createCommentAction: vi.fn(),
  deletePublicCommentAction: vi.fn(),
  createSoftwareDownloadOrderAction: mocks.createOrder,
  sendCreatorMessageAction: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  notFound: () => { throw new Error("NEXT_NOT_FOUND"); },
  permanentRedirect: (href: string) => { throw new Error(`NEXT_REDIRECT:${href}`); },
  useRouter: () => ({ prefetch: vi.fn() }),
}));

import { ToolDetailPageShell } from "./page-shell";

function toolFixture(type: "software" | "online" | "skill_learning" | "ai_skill" | "ai_workflow") {
  return {
    id: "tool-1",
    slug: "purchase-fixture",
    name: "Purchase Fixture",
    englishName: "Purchase Fixture",
    type,
    status: "published",
    shortDescription: "A product for testing the purchase flow.",
    content: "Review the product details before purchasing.",
    isDownloadPaid: true,
    downloadPrice: 29,
    downloadCount: 0,
    usageCount: 0,
    downloadFile: null,
    category: null,
    priceSpecs: [{ id: "offer-1", name: "Standard", price: 29, sortOrder: 0, status: "active" }],
    tagLinks: [],
    tutorials: [],
    faqs: [],
    changelogs: [],
    comments: [],
    screenshots: [],
    supportedAgents: [],
    aiWorkflowCandidate: type === "ai_workflow" ? {
      status: "published",
      fileId: null,
      repositoryUrl: "https://github.com/example/workflow",
      repositoryOwner: "example",
      repositoryName: "workflow",
      projectType: "workflow",
      topic: null,
      licenseSpdx: null,
      packageVersion: null,
      packageSize: null,
      githubStars: 0,
      starsUpdatedAt: null,
      failureReason: null,
      verifiedEnvironments: [],
    } : null,
    aiWorkflowReviews: [],
  };
}

function elements(node: React.ReactNode): React.ReactElement<Record<string, unknown>>[] {
  return React.Children.toArray(node).flatMap((child) => {
    if (!React.isValidElement<Record<string, unknown>>(child)) return [];
    return [child, ...elements(child.props.children as React.ReactNode)];
  });
}

const products = [
  { type: "software", path: "/software", panelId: "download-purchase" },
  { type: "online", path: "/account-services", panelId: "service-purchase" },
  { type: "skill_learning", path: "/skill-learning", panelId: "download-purchase" },
  { type: "ai_skill", path: "/ai-skills", panelId: "download-purchase" },
] as const;
const productTypes = ["software", "online", "skill_learning", "ai_skill", "ai_workflow"] as const;

describe.each(["zh", "en"] as const)("%s product purchase login return", (locale) => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("React", React);
    vi.stubEnv("DATABASE_URL", "postgresql://fixture.invalid/test");
    mocks.getCurrentUser.mockResolvedValue(null);
    mocks.findPurchase.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it.each(products)("returns guests to the same $type purchase panel after login", async ({ type, path, panelId }) => {
    mocks.findTool.mockResolvedValue(toolFixture(type));
    const page = await ToolDetailPageShell({ slug: "purchase-fixture", forceLocale: locale, expectedType: type });
    const panel = elements(page).find((element) => element.props.id === "tool-purchase");
    expect(panel).toBeDefined();
    const purchaseElements = elements(panel);
    const localePrefix = locale === "en" ? "/en" : "";
    const returnTo = `${localePrefix}${path}/purchase-fixture#tool-purchase`;
    const html = renderToStaticMarkup(panel);

    expect(html).toContain(`href="${localePrefix}/login?returnTo=${encodeURIComponent(returnTo)}"`);
    expect(html).toContain(locale === "en" ? "Click to purchase" : "点击购买");
    expect(html).toContain(`id="${panelId}"`);
    expect(html).toContain("¥29.00");
    expect(html).not.toContain('data-analytics-event="begin_checkout"');
    expect(purchaseElements.some((element) => element.type === "form")).toBe(false);
    expect(mocks.findPurchase).not.toHaveBeenCalled();
    expect(mocks.createOrder).not.toHaveBeenCalled();
  });

  it.each(products)("keeps the real $type purchase form for signed-in customers", async ({ type, panelId }) => {
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1", role: "user" });
    mocks.findTool.mockResolvedValue(toolFixture(type));
    const page = await ToolDetailPageShell({ slug: "purchase-fixture", forceLocale: locale, expectedType: type });
    const panel = elements(page).find((element) => element.props.id === "tool-purchase");
    const form = elements(panel).find((element) => element.type === "form");

    expect(form?.props.id).toBe(panelId);
    expect(form?.props.action).toBe(mocks.createOrder);
    expect(form?.props["data-analytics-event"]).toBe("begin_checkout");
    expect(elements(form).find((element) => element.props.name === "toolId")?.props.value).toBe("tool-1");
    expect(elements(form).find((element) => element.props.name === "priceSpecId")?.props.value).toBe("offer-1");
    expect(elements(form).find((element) => element.props.name === "paymentMethod")?.props.defaultValue).toBe("wechat");
    expect(renderToStaticMarkup(panel)).not.toContain("/login?returnTo=");
    expect(mocks.createOrder).not.toHaveBeenCalled();
  });

  it.each(productTypes)("hides the download count on %s product details", async (type) => {
    mocks.findTool.mockResolvedValue({ ...toolFixture(type), downloadCount: 703, usageCount: 37 });
    const page = await ToolDetailPageShell({ slug: "purchase-fixture", forceLocale: locale, expectedType: type });
    const html = renderToStaticMarkup(page);

    expect(html).not.toContain("703");
    expect(html).not.toMatch(/下载次数|download count/i);
  });

  it("shows creator identity and the five latest published works beside product support cards", async () => {
    const works = Array.from({ length: 5 }, (_, index) => ({
      id: `work-${index + 1}`,
      slug: `recent-work-${index + 1}`,
      name: `最新作品 ${index + 1}`,
      englishName: `Recent work ${index + 1}`,
      type: "software",
    }));
    mocks.getCurrentUser.mockResolvedValue(null);
    mocks.findTool.mockResolvedValue({
      ...toolFixture("software"),
      creator: { id: "creator-1", nickname: "作者示例", avatar: null, creatorBio: "创作者简介" },
      securityReviewedAt: new Date("2026-11-11T00:00:00.000Z"),
      supportedAgents: ["Codex", "Cursor"],
    });
    mocks.countCreatorProducts.mockResolvedValue(8);
    mocks.aggregateCreatorRating.mockResolvedValue({ _avg: { rating: 5 }, _count: { _all: 3 } });
    mocks.findTools.mockImplementation(async (query) =>
      (query as { where?: { creatorId?: string } } | undefined)?.where?.creatorId ? works : [],
    );

    const page = await ToolDetailPageShell({ slug: "purchase-fixture", forceLocale: "zh", expectedType: "software" });
    const html = renderToStaticMarkup(page);
    const agentsIndex = html.indexOf('aria-label="适用 AI 智能体"');
    const safetyIndex = html.indexOf("信任与安全");
    const refundIndex = html.indexOf("退款保障");

    expect(html).toContain('class="tool-detail-product-layout has-creator"');
    expect(agentsIndex).toBeGreaterThan(-1);
    expect(agentsIndex).toBeLessThan(safetyIndex);
    expect(safetyIndex).toBeLessThan(refundIndex);
    expect(html).toContain("作者示例");
    expect(html).toContain("共 8 个已发布作品");
    const supportLayout = elements(page).find((element) => element.props.className === "tool-detail-product-layout has-creator");
    expect(elements(supportLayout).some((element) => element.props.id === "tool-purchase")).toBe(false);
    expect(html.indexOf('class="creator-profile-card"')).toBeLessThan(html.indexOf('id="tool-purchase"'));
    for (const work of works) expect(html).toContain(work.name);
    expect(mocks.findTools).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ creatorId: "creator-1", status: "published" }),
      orderBy: { createdAt: "desc" },
      take: 5,
    }));
  });

  it("uses a consistent half-width payment selector and purchase button for paid downloads", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1", role: "user" });
    mocks.findTool.mockResolvedValue({ ...toolFixture("software"), creator: null });
    const page = await ToolDetailPageShell({ slug: "purchase-fixture", forceLocale: "zh", expectedType: "software" });
    const panel = elements(page).find((element) => element.props.id === "tool-purchase");
    const html = renderToStaticMarkup(panel);

    expect(html).toContain("点击购买");
    expect(html).toContain("选择支付方式，支付成功后系统会自动解锁该工具的下载链接内容。");
    expect(html).toContain("tool-detail-purchase-submit");
  });

  it("omits the refund card for free products while keeping creator layout", async () => {
    mocks.findTool.mockResolvedValue({
      ...toolFixture("ai_skill"),
      isDownloadPaid: false,
      downloadPrice: 0,
      priceSpecs: [],
      creator: { id: "creator-1", nickname: "作者示例", avatar: null, creatorBio: "创作者简介" },
      supportedAgents: ["Codex"],
    });

    const page = await ToolDetailPageShell({ slug: "purchase-fixture", forceLocale: "zh", expectedType: "ai_skill" });
    const html = renderToStaticMarkup(page);

    expect(html).toContain('class="tool-detail-product-layout has-creator"');
    expect(html).toContain("适用 AI 智能体");
    expect(html).not.toContain("退款保障");
  });
});
