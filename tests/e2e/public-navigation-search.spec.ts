import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const suffix = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
const password = "NavAudit123!";
const userEmail = `nav-user-${suffix}@enhe.test`;
const adminEmail = `nav-admin-${suffix}@enhe.test`;

const toolToken = `tool${suffix}`;
const draftToken = `draft${suffix}`;
const tutorialToken = `tutorial${suffix}`;
const inactiveTutorialToken = `inactive${suffix}`;
const newsToken = `news${suffix}`;
const draftNewsToken = `draftnews${suffix}`;
const trendToken = `trend${suffix}`;
const missingToken = `missing${suffix}`;

let userId = "";
let adminId = "";
let softwareCategoryId = "";
let tutorialCategoryId = "";
let publishedToolId = "";
let draftToolId = "";
let tutorialToolId = "";
let inactiveTutorialToolId = "";
let publishedNewsId = "";
let draftNewsId = "";
let trendId = "";

test.describe.configure({ mode: "serial" });

function bilingual(zh: string, en: string) {
  return `[[zh]]${zh}[[/zh]][[en]]${en}[[/en]]`;
}

test.beforeAll(async () => {
  const passwordHash = await bcrypt.hash(password, 12);
  const [user, admin, softwareCategory, tutorialCategory] = await Promise.all([
    prisma.user.create({
      data: { email: userEmail, passwordHash, nickname: "导航普通用户" },
    }),
    prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        nickname: "导航管理员",
        role: "admin",
      },
    }),
    prisma.toolCategory.create({
      data: {
        name: `审计软件分类 ${suffix}`,
        type: "software",
        status: "active",
        sortOrder: -200,
      },
    }),
    prisma.toolCategory.create({
      data: {
        name: `审计教程分类 ${suffix}`,
        type: "skill_learning",
        status: "active",
        sortOrder: -200,
      },
    }),
  ]);
  userId = user.id;
  adminId = admin.id;
  softwareCategoryId = softwareCategory.id;
  tutorialCategoryId = tutorialCategory.id;

  const [publishedTool, draftTool, tutorialTool, inactiveTutorialTool] =
    await Promise.all([
      prisma.tool.create({
        data: {
          name: `公开AI工具 ${toolToken}`,
          englishName: `Published AI Tool ${toolToken}`,
          slug: `audit-tool-${suffix}`,
          type: "software",
          categoryId: softwareCategory.id,
          shortDescription: bilingual(
            `用于验证公开工具搜索 ${toolToken}`,
            `Published AI tool ${toolToken} for testing safe public search results and locale-aware summaries.`,
          ),
          content: bilingual(
            `公开工具详情内容 ${toolToken}`,
            `This published AI tool ${toolToken} provides enough genuine English source content for indexing, search, product details, and locale verification.`,
          ),
          status: "published",
          sortOrder: -200,
        },
      }),
      prisma.tool.create({
        data: {
          name: `草稿AI工具 ${draftToken}`,
          englishName: `Draft AI Tool ${draftToken}`,
          slug: `audit-draft-tool-${suffix}`,
          type: "software",
          categoryId: softwareCategory.id,
          shortDescription: `草稿不应公开 ${draftToken}`,
          content: `草稿详情不应公开 ${draftToken}`,
          status: "draft",
          sortOrder: -199,
        },
      }),
      prisma.tool.create({
        data: {
          name: `公开AI教程 ${tutorialToken}`,
          englishName: `Published AI Tutorial ${tutorialToken}`,
          slug: `audit-tutorial-${suffix}`,
          type: "skill_learning",
          categoryId: tutorialCategory.id,
          shortDescription: bilingual(
            `用于验证教程搜索 ${tutorialToken}`,
            `Published AI tutorial ${tutorialToken} with practical steps, prerequisites, outcomes, and public learning guidance.`,
          ),
          content: bilingual(
            `教程详情与实战说明 ${tutorialToken}`,
            `This published AI tutorial ${tutorialToken} contains genuine English lesson content, practical workflow steps, expected outcomes, and common guidance.`,
          ),
          status: "published",
          sortOrder: -200,
        },
      }),
      prisma.tool.create({
        data: {
          name: `无有效教程课程 ${inactiveTutorialToken}`,
          englishName: `Inactive Tutorial ${inactiveTutorialToken}`,
          slug: `audit-inactive-tutorial-${suffix}`,
          type: "skill_learning",
          categoryId: tutorialCategory.id,
          shortDescription: `不应出现在教程中心 ${inactiveTutorialToken}`,
          content: `停用教程内容 ${inactiveTutorialToken}`,
          status: "published",
          sortOrder: -199,
        },
      }),
    ]);
  publishedToolId = publishedTool.id;
  draftToolId = draftTool.id;
  tutorialToolId = tutorialTool.id;
  inactiveTutorialToolId = inactiveTutorialTool.id;

  await Promise.all([
    prisma.tutorial.create({
      data: {
        toolId: tutorialTool.id,
        title: bilingual(
          `公开教程步骤 ${tutorialToken}`,
          `Published tutorial steps ${tutorialToken}`,
        ),
        content: bilingual(
          `完成公开教程操作 ${tutorialToken}`,
          `Follow the published tutorial steps ${tutorialToken} to complete the practical workflow safely.`,
        ),
        status: "active",
        sortOrder: -200,
      },
    }),
    prisma.tutorial.create({
      data: {
        toolId: inactiveTutorialTool.id,
        title: `停用教程 ${inactiveTutorialToken}`,
        content: `停用教程不应公开 ${inactiveTutorialToken}`,
        status: "disabled",
        sortOrder: -199,
      },
    }),
  ]);

  const englishNewsContent = Array.from(
    { length: 55 },
    (_, index) => `verified${index + 1}`,
  ).join(" ");
  const [publishedNews, draftNews] = await Promise.all([
    prisma.newsArticle.create({
      data: {
        title: `公开AI资讯 ${newsToken}`,
        englishTitle: `Published AI News ${newsToken}`,
        slug: `audit-news-${suffix}`,
        summary: `公开资讯摘要 ${newsToken}`,
        content: `公开资讯正文 ${newsToken}`,
        englishSummary: `Published AI news ${newsToken} with verified public information and a clear reader summary.`,
        englishContent: `Published AI news ${newsToken}. ${englishNewsContent}`,
        status: "published",
        publishedAt: new Date(),
      },
    }),
    prisma.newsArticle.create({
      data: {
        title: `草稿AI资讯 ${draftNewsToken}`,
        slug: `audit-draft-news-${suffix}`,
        summary: `草稿摘要 ${draftNewsToken}`,
        content: `草稿正文 ${draftNewsToken}`,
        status: "draft",
      },
    }),
  ]);
  publishedNewsId = publishedNews.id;
  draftNewsId = draftNews.id;

  const trend = await prisma.aiTrendBriefing.create({
    data: {
      date: new Date(Date.now() - Math.floor(Math.random() * 60_000)),
      slug: `2026-07-${String(Math.floor(Math.random() * 20) + 1).padStart(2, "0")}`,
      title: `Published AI Trend ${trendToken}`,
      summary: `Published market and demand trend analysis ${trendToken}.`,
      coreConclusion: `Verified public trend conclusion ${trendToken}.`,
      publicHighlights: [`Public trend signal ${trendToken}`],
      fullHtml: `<p>Published trend briefing ${trendToken}</p>`,
      status: "published",
      publishedAt: new Date(),
    },
  });
  trendId = trend.id;
});

test.afterAll(async () => {
  const toolIds = [
    publishedToolId,
    draftToolId,
    tutorialToolId,
    inactiveTutorialToolId,
  ].filter(Boolean);
  const userIds = [userId, adminId].filter(Boolean);

  await prisma.tutorial.deleteMany({ where: { toolId: { in: toolIds } } });
  await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.loginAttempt.deleteMany({
    where: { identifier: { in: [userEmail, adminEmail] } },
  });
  await prisma.tool.deleteMany({ where: { id: { in: toolIds } } });
  await prisma.toolCategory.deleteMany({
    where: { id: { in: [softwareCategoryId, tutorialCategoryId].filter(Boolean) } },
  });
  await prisma.newsArticle.deleteMany({
    where: { id: { in: [publishedNewsId, draftNewsId].filter(Boolean) } },
  });
  await prisma.aiTrendBriefing.deleteMany({
    where: { id: trendId || "__none__" },
  });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
});

test.beforeEach(async ({ context }) => {
  await context.clearCookies();
});

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: /登录|Log in/i }).click();
}

async function expectSearchResult(
  page: Page,
  path: string,
  query: string,
  type: string,
  title: string,
) {
  await page.goto(`${path}?q=${encodeURIComponent(query)}`);
  const result = page.locator(".public-search-result").filter({ hasText: title });
  await expect(result).toHaveCount(1);
  await expect(result).toContainText(type);
  await expect(result.locator("a")).toHaveCount(0);
  await expect(result).toHaveAttribute("href", /\/(software|ai-news|ai-trends|skill-learning|about)/);
}

test("shows the admin navigation only to administrators and preserves server authorization", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "后台管理" })).toHaveCount(0);

  await login(page, userEmail);
  await expect(page).toHaveURL(/\/user/, { timeout: 15_000 });
  await page.goto("/");
  await expect(page.getByRole("link", { name: "后台管理" })).toHaveCount(0);
  await page.goto("/admin");
  await expect(page).toHaveURL("/");

  await page.context().clearCookies();
  await login(page, adminEmail);
  await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 });
  await page.goto("/");
  await expect(page.getByRole("link", { name: "后台管理" })).toBeVisible();
});

test("returns published public results across all Chinese search channels", async ({
  page,
}) => {
  await expectSearchResult(page, "/search", toolToken, "AI工具", `公开AI工具 ${toolToken}`);
  await expectSearchResult(page, "/search", newsToken, "AI资讯", `公开AI资讯 ${newsToken}`);
  await expectSearchResult(page, "/search", trendToken, "AI趋势", `Published AI Trend ${trendToken}`);
  await expectSearchResult(page, "/search", tutorialToken, "AI教程", `公开AI教程 ${tutorialToken}`);
  await expectSearchResult(page, "/search", "ENHE", "关于我们", "关于恩禾 ENHE AI");
});

test("keeps draft and inactive records out of search", async ({
  page,
}) => {
  for (const token of [draftToken, draftNewsToken, inactiveTutorialToken, missingToken]) {
    await page.goto(`/search?q=${encodeURIComponent(token)}`);
    await expect(page.locator(".public-search-result")).toHaveCount(0);
    await expect(page.getByText("没有找到匹配的公开内容，请尝试其他关键词。")).toBeVisible();
  }
});

test("returns genuine English source content without crossing into draft records", async ({
  page,
}) => {
  await expectSearchResult(
    page,
    "/en/search",
    toolToken,
    "AI Tool",
    `Published AI Tool ${toolToken}`,
  );
  await expectSearchResult(
    page,
    "/en/search",
    newsToken,
    "AI News",
    `Published AI News ${newsToken}`,
  );
  await expectSearchResult(
    page,
    "/en/search",
    trendToken,
    "AI Trend",
    `Published AI Trend ${trendToken}`,
  );
  await expectSearchResult(
    page,
    "/en/search",
    tutorialToken,
    "AI Tutorial",
    `Published AI Tutorial ${tutorialToken}`,
  );

  await page.goto(`/en/search?q=${encodeURIComponent(draftToken)}`);
  await expect(page.locator(".public-search-result")).toHaveCount(0);
});

test("uses formal category relations and canonical list hrefs", async ({
  page,
}) => {
  await page.goto(`/software?category=${softwareCategoryId}`);
  const toolLink = page.getByRole("link", { name: new RegExp(`公开AI工具 ${toolToken}`) }).first();
  await expect(toolLink).toBeVisible();
  await expect(page.getByText(`草稿AI工具 ${draftToken}`)).toHaveCount(0);
  await expect(toolLink).toHaveAttribute("href", `/software/audit-tool-${suffix}`);

  await page.goto(`/skill-learning?category=${tutorialCategoryId}`);
  const tutorialLink = page
    .getByRole("link", { name: new RegExp(`公开AI教程 ${tutorialToken}`) })
    .first();
  await expect(tutorialLink).toBeVisible();
  await expect(tutorialLink).toHaveAttribute(
    "href",
    `/skill-learning/audit-tutorial-${suffix}`,
  );
});
