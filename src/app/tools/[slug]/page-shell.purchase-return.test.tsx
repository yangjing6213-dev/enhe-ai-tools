import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  findTool: vi.fn(),
  findPurchase: vi.fn(),
  createOrder: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/db", () => ({
  prisma: {
    tool: { findUnique: mocks.findTool, findMany: vi.fn(async () => []) },
    toolPurchase: { findUnique: mocks.findPurchase },
  },
}));
vi.mock("@/lib/public-content", () => ({
  resolvePublicToolSlug: vi.fn(async () => ({ id: "tool-1", canonicalSlug: "purchase-fixture" })),
}));
vi.mock("@/app/actions", () => ({
  createCommentAction: vi.fn(),
  deletePublicCommentAction: vi.fn(),
  createSoftwareDownloadOrderAction: mocks.createOrder,
}));
vi.mock("next/navigation", () => ({
  notFound: () => { throw new Error("NEXT_NOT_FOUND"); },
  permanentRedirect: (href: string) => { throw new Error(`NEXT_REDIRECT:${href}`); },
  useRouter: () => ({ prefetch: vi.fn() }),
}));

import { ToolDetailPageShell } from "./page-shell";

function toolFixture(type: "software" | "online" | "skill_learning" | "ai_skill") {
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
    expect(html).toContain(locale === "en" ? "Sign in to purchase" : "登录后购买");
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
});
