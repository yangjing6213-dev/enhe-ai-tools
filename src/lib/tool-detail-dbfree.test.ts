import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

Object.assign(globalThis, { React });

const db = vi.hoisted(() => ({
  toolFindMany: vi.fn(),
  toolFindUnique: vi.fn(),
  currentUser: vi.fn(),
  toolPurchase: vi.fn(),
  workflowPurchase: vi.fn(),
  toolCount: vi.fn(),
  creatorRatings: vi.fn(),
}));

const navigation = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  permanentRedirect: vi.fn(),
  redirect: vi.fn(),
  useRouter: vi.fn(() => ({ prefetch: vi.fn() })),
}));

vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: () => undefined })),
  headers: vi.fn(async () => new Headers()),
}));

vi.mock("next/navigation", () => navigation);
vi.mock("@/lib/auth", () => ({ getCurrentUser: db.currentUser }));

vi.mock("@/lib/db", () => ({
  prisma: {
    tool: {
      findMany: db.toolFindMany,
      findUnique: db.toolFindUnique,
      count: db.toolCount,
    },
    toolPurchase: { findUnique: db.toolPurchase },
    aiWorkflowVersionPurchase: { findFirst: db.workflowPurchase },
    comment: { aggregate: db.creatorRatings },
  },
}));

const root = join(process.cwd(), "src");

function read(relativePath: string) {
  const path = join(root, relativePath);
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

describe("public tool detail DB-free boundary", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("DATABASE_URL", undefined);
    db.toolFindMany.mockResolvedValue([]);
    db.toolFindUnique.mockResolvedValue(null);
    db.currentUser.mockResolvedValue(null);
    db.toolPurchase.mockResolvedValue(null);
    db.workflowPurchase.mockResolvedValue(null);
    db.toolCount.mockResolvedValue(2);
    db.creatorRatings.mockResolvedValue({ _avg: { rating: null }, _count: { _all: 0 } });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("short-circuits the public tool slug index without DATABASE_URL", async () => {
    const { resolvePublicToolSlug } = await import("@/lib/public-content");

    await expect(resolvePublicToolSlug("db-free-probe")).resolves.toBeNull();
    expect(db.toolFindMany).not.toHaveBeenCalled();
  });

  it("returns an unverified noindex metadata boundary without database access", async () => {
    const { generateToolDetailPageMetadata } = await import(
      "@/app/tools/[slug]/page-shell"
    );
    const metadata = await generateToolDetailPageMetadata(
      "en",
      "db-free-probe",
      "/software",
    );

    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(metadata.description).toContain("UNVERIFIED");
    expect(db.toolFindMany).not.toHaveBeenCalled();
    expect(db.toolFindUnique).not.toHaveBeenCalled();
  }, 15_000);

  it.each([
    "/software",
    "/account-services",
    "/skill-learning",
    "/ai-skills",
  ])(
    "keeps a configured missing-tool canonical under %s",
    async (routeBasePath) => {
      vi.stubEnv("DATABASE_URL", "postgresql://configured.invalid/enhe");

      const { generateToolDetailPageMetadata } = await import(
        "@/app/tools/[slug]/page-shell"
      );
      const metadata = await generateToolDetailPageMetadata(
        "en",
        "missing-tool",
        routeBasePath,
      );

      expect(String(metadata.alternates?.canonical)).toContain(
        `/en${routeBasePath}/missing-tool`,
      );
      if (routeBasePath !== "/software") {
        expect(String(metadata.alternates?.canonical)).not.toContain(
          "/en/software/missing-tool",
        );
      }
      expect(db.toolFindMany).toHaveBeenCalledOnce();
      expect(db.toolFindUnique).not.toHaveBeenCalled();
    },
  );

  it("keeps configured published software metadata indexable with a fixture row", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://configured.invalid/enhe");
    db.toolFindMany.mockResolvedValueOnce([
      {
        id: "verified-software",
        slug: "verified-software",
        name: "Verified Software",
        englishName: "Verified Software",
      },
    ]);
    db.toolFindUnique.mockResolvedValueOnce({
      slug: "verified-software",
      name: "Verified Software",
      englishName: "Verified Software",
      shortDescription:
        "A verified software catalog listing for teams managing documented workflows.",
      content:
        "Verified software helps teams organize daily workflows, review tasks, and complete repeatable operations with clear guidance and support.",
      coverImage: null,
      status: "published",
      type: "software",
    });

    const { generateToolDetailPageMetadata } = await import(
      "@/app/tools/[slug]/page-shell"
    );
    const metadata = await generateToolDetailPageMetadata(
      "en",
      "verified-software",
      "/software",
    );

    expect(metadata.title).toContain("Verified Software");
    expect(String(metadata.alternates?.canonical)).toContain(
      "/en/software/verified-software",
    );
    expect(metadata.robots).toBeUndefined();
    expect(db.toolFindMany).toHaveBeenCalledOnce();
    expect(db.toolFindUnique).toHaveBeenCalledOnce();
  });

  it("does not enter the session or tool query path for a DB-free detail route", async () => {
    const { ToolDetailPageShell } = await import(
      "@/app/tools/[slug]/page-shell"
    );

    await expect(
      ToolDetailPageShell({
        slug: "db-free-probe",
        forceLocale: "en",
        expectedType: "software",
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(db.toolFindMany).not.toHaveBeenCalled();
    expect(db.toolFindUnique).not.toHaveBeenCalled();
  });

  it("keeps the explicit guard in the shared detail shell", () => {
    const page = read("app/tools/[slug]/page-shell.tsx");

    expect(page).toContain("if (!process.env.DATABASE_URL?.trim()) notFound();");
  });

  async function renderFixtureDetail(
    type: "ai_workflow" | "software" | "ai_skill" | "online" | "skill_learning",
    locale: "zh" | "en",
    options: { paid?: boolean; purchased?: boolean; reviewed?: boolean; creator?: boolean } = {},
  ) {
    vi.stubEnv("DATABASE_URL", "postgresql://configured.invalid/enhe");
    if (options.purchased) {
      db.currentUser.mockResolvedValue({ id: "buyer", role: "user", nickname: "Buyer" });
      db.toolPurchase.mockResolvedValue({ id: "purchase" });
      db.workflowPurchase.mockResolvedValue({ id: "workflow-purchase", file: null });
    }
    const tool = {
      id: "detail-layout-fixture", slug: "detail-layout-fixture", name: "Detail layout fixture", englishName: "Detail layout fixture",
      type, status: "published", shortDescription: "A workflow fixture for checking detail page layout.",
      content: "Workflow fixture instructions and use cases.", version: "1.0", systemRequirement: "Browser",
      isDownloadPaid: Boolean(options.paid), downloadPrice: options.paid ? 5 : 0, downloadCount: 0, viewCount: 0, usageCount: 0,
      coverImage: null, creator: options.creator ? { id: "creator", nickname: "Fixture Creator", creatorBio: "Builds useful AI tools.", avatar: null } : null,
      securityReviewedAt: options.reviewed ? new Date("2026-10-26T08:00:00Z") : null,
      category: null, downloadFile: null, downloadFileId: null,
      supportedAgents: [], screenshots: [], tagLinks: [], tutorials: [], changelogs: [], comments: [],
      priceSpecs: options.paid ? [{ id: "offer", name: "Product access", price: 5, status: "active", sortOrder: 0 }] : [],
      faqs: [{ id: "fixture-faq", question: "How do I get started?", answer: "Read the workflow guide.", englishQuestion: null, englishAnswer: null }],
      aiWorkflowCandidate: type === "ai_workflow" ? {
        status: "link_only_published", repositoryUrl: "https://github.com/example/workflow", repositoryOwner: "example", repositoryName: "workflow",
        projectType: "workflow", licenseSpdx: "MIT", topic: null, fileId: null, packageVersion: null, packageSize: null,
        packageSha256: null, commitSha: "1234567890123456789012345678901234567890", githubStars: 1, starsUpdatedAt: new Date("2026-10-21T00:00:00Z"),
        verifiedEnvironments: [], failureReason: "PACKAGE_LANGUAGE_UNSUPPORTED",
      } : null,
    };
    db.toolFindMany.mockResolvedValueOnce([{ id: tool.id, slug: tool.slug, name: tool.name, englishName: tool.englishName }]);
    db.toolFindUnique.mockResolvedValueOnce(tool);
    const { ToolDetailPageShell } = await import("@/app/tools/[slug]/page-shell");
    return renderToStaticMarkup(await ToolDetailPageShell({ slug: tool.slug, forceLocale: locale, expectedType: type }));
  }

  it.each(["zh", "en"] as const)("renders simplified workflow details with FAQs last (%s)", async (locale) => {
    const html = await renderFixtureDetail("ai_workflow", locale);
    expect(html).toContain(locale === "en" ? "Get workflow" : "获取工作流");
    expect(html).toContain(locale === "en" ? "AI workflow details" : "AI 工作流详情");
    expect(html).toContain(locale === "en" ? "Workflow introduction" : "工作流介绍");
    expect(html).toContain(locale === "en"
      ? "This workflow comes from a GitHub repository. Review the delivery and verification status below before using it."
      : "工作流来源于 GitHub仓库；使用前请查看下方的获取方式和核验状态。");
    expect(html).toContain('href="https://github.com/example/workflow"');
    expect(html).not.toContain('id="workflow-reviews"');
    expect(html).not.toContain("固定来源版本");
    expect(html).not.toContain("Fixed source commit");
    expect(html).not.toContain("已审核的用户评价");
    expect(html).not.toContain("Verified user feedback");
    expect(html).not.toContain("1234567890123456789012345678901234567890");
    expect(html.indexOf('id="tool-faq"')).toBeGreaterThan(html.indexOf('id="tool-related"'));
  });

  it("keeps the software introduction and FAQ order on ordinary product details", async () => {
    const html = await renderFixtureDetail("software", "zh");
    expect(html).toContain("产品介绍");
    expect(html).not.toContain("工作流介绍");
    expect(html.indexOf('id="tool-faq"')).toBeGreaterThan(-1);
    expect(html.indexOf('id="tool-faq"')).toBeLessThan(html.indexOf('id="tool-related"'));
  });

  it.each(["software", "online", "skill_learning", "ai_skill", "ai_workflow"] as const)(
    "keeps refund rules on purchased %s details and includes the product share card",
    async (type) => {
      const html = await renderFixtureDetail(type, "zh", { paid: true, purchased: true });
      expect(html).toContain("data-refund-guarantee");
      expect(html).toContain("符合退款条件时可提交申请");
      expect(html.indexOf('aria-label="分享此产品"')).toBeGreaterThan(html.indexOf('id="tool-changelog"'));
    },
  );

  it.each(["zh", "en"] as const)("renders an AI Skill's actual review and creator (%s)", async (locale) => {
    const html = await renderFixtureDetail("ai_skill", locale, { paid: true, reviewed: true, creator: true });
    expect(html).toContain("product-safety-info-card");
    expect(html).toContain("Fixture Creator");
    expect(html).toContain("Builds useful AI tools.");
    expect(html).toContain("creator-profile-card");
  });

  it("does not invent a review, creator or refund entitlement for a free unreviewed AI Skill", async () => {
    const html = await renderFixtureDetail("ai_skill", "zh");
    expect(html).not.toContain("product-safety-info-card");
    expect(html).not.toContain("creator-profile-card");
    expect(html).not.toContain("data-refund-guarantee");
  });
});
