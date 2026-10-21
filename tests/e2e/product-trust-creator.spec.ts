import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

function localDatabaseEnabled() {
  if (process.env.ENHE_E2E_ALLOW_DATABASE_MUTATION !== "1") return false;
  try {
    const url = new URL(process.env.DATABASE_URL ?? "");
    const name = decodeURIComponent(url.pathname.slice(1));
    return ["postgres:", "postgresql:"].includes(url.protocol)
      && ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)
      && /(?:^|[_-])(test|e2e)(?:[_-]|$)/i.test(name)
      && !/(?:^|[_-])(prod|production|live)(?:[_-]|$)/i.test(name);
  } catch {
    return false;
  }
}

test.describe("product trust and creator contact", () => {
  test.skip(!localDatabaseEnabled(), "Requires explicit opt-in and a dedicated local test database.");
  test.setTimeout(180_000);
  const prisma = new PrismaClient();
  const suffix = `${Date.now()}-${process.pid}`;
  const password = "LocalCreatorE2E123!";
  const adminEmail = `creator-${suffix}@enhe.test`;
  const viewerEmail = `viewer-${suffix}@enhe.test`;
  const slug = `creator-check-${suffix}`;
  let adminId = "";
  let viewerId = "";
  let toolId = "";

  test.beforeAll(async () => {
    const passwordHash = await bcrypt.hash(password, 12);
    const admin = await prisma.user.create({ data: { email: adminEmail, passwordHash, nickname: "Local creator", role: "admin", isTestData: true } });
    adminId = admin.id;
    const viewer = await prisma.user.create({ data: { email: viewerEmail, passwordHash, nickname: "Local reader", isTestData: true } });
    viewerId = viewer.id;
    const tool = await prisma.tool.create({ data: {
      name: "Local creator product", englishName: "Local creator product", slug,
      type: "software", status: "published", creatorId: adminId,
      shortDescription: "A local product for testing creator information and manual safety reviews.",
      content: "This local test product helps verify that creator profiles, safety review details, and contact messages work correctly together.",
      systemRequirement: "Windows 11", version: "1.0",
    } });
    toolId = tool.id;
    await prisma.comment.createMany({ data: [
      { userId: viewerId, toolId, content: "Approved review", rating: 4, status: "approved" },
      { userId: viewerId, toolId, content: "Pending review", rating: 1, status: "pending" },
    ] });
  });

  test.beforeEach(async ({ context, baseURL }) => {
    const origin = new URL(baseURL!).origin;
    await context.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  });

  test.afterAll(async () => {
    try {
      if (toolId) {
        await prisma.adminAuditLog.deleteMany({ where: { targetId: toolId } });
        await prisma.comment.deleteMany({ where: { toolId } });
        await prisma.tool.deleteMany({ where: { id: toolId } });
      }
      const ids = [adminId, viewerId].filter(Boolean);
      if (ids.length) {
        await prisma.analyticsEvent.deleteMany({ where: { userId: { in: ids } } });
        await prisma.user.deleteMany({ where: { id: { in: ids } } });
        await prisma.loginAttempt.deleteMany({ where: { identifier: { in: [adminEmail, viewerEmail] } } });
      }
    } finally {
      await prisma.$disconnect();
    }
  });

  async function login(page: Page, email: string) {
    await page.goto("/login");
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(password);
    await page.getByRole("button", { name: "登录", exact: true }).click();
    await expect(page).toHaveURL(email === adminEmail ? /\/admin$/ : /\/user(?:[/?#]|$)/, { timeout: 30_000 });
  }

  test("admin review and bio appear publicly, and creator receives a reader's message", async ({ page, context }, testInfo) => {
    await login(page, adminEmail);
    await page.goto("/admin/software/new");
    await expect(page.locator('select[name="creatorId"]')).toHaveValue(adminId);
    await expect(page.locator('input[name="securityReviewed"]')).not.toBeChecked();
    await page.goto(`/admin/software/${toolId}`);
    await page.locator('input[name="securityReviewed"]').check();
    await page.locator('textarea[name="creatorBio"]').fill("I build useful AI tools.");
    await page.locator('.enhe-admin-tool-editor-form button[type="submit"]').click();
    await expect(page).toHaveURL(/saved=1/, { timeout: 30_000 });
    expect((await prisma.tool.findUniqueOrThrow({ where: { id: toolId } })).securityReviewedAt).not.toBeNull();

    for (const prefix of ["", "/en"]) {
      await page.goto(`${prefix}/software`);
      const card = page.locator(".redesign-software-card").filter({ has: page.getByRole("heading", { name: "Local creator product", exact: true }) }).first();
      await expect(card.locator(".redesign-software-card-trust")).toBeVisible();
      await page.goto(`${prefix}/software/${slug}`);
      await expect(page.locator(".product-safety-info-card")).toBeVisible();
      await expect(page.locator(".creator-profile-bio")).toHaveText("I build useful AI tools.");
      await expect(page.locator(".creator-profile-products")).toContainText("1");
      await expect(page.locator(".creator-profile-rating")).toContainText("4.0");
      await expect(page.locator(".creator-profile-rating-count")).toHaveText("(1)");
    }

    await page.setViewportSize({ width: 1440, height: 1000 });
    const offer = await page.locator(".tool-detail-offer-creator-main").boundingBox();
    const creator = await page.locator(".creator-profile-card").boundingBox();
    expect(creator!.x).toBeGreaterThanOrEqual(offer!.x + offer!.width);
    await page.locator(".tool-detail-offer-creator-grid").screenshot({ path: testInfo.outputPath("creator-desktop.png") });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.locator(".creator-profile-card").screenshot({ path: testInfo.outputPath("creator-mobile.png") });

    await context.clearCookies();
    await login(page, viewerEmail);
    await page.goto(`/software/${slug}`);
    await page.getByRole("button", { name: "联系创作者", exact: true }).click();
    const message = "请问这个产品是否支持离线使用？";
    await page.locator('.creator-contact-form textarea').fill(message);
    await page.getByRole("button", { name: "发送留言", exact: true }).click();
    await expect(page.locator(".creator-contact-success")).toBeVisible();
    expect(await prisma.notification.count({ where: { userId: adminId, senderId: viewerId, type: "creator_message" } })).toBe(1);
    await context.clearCookies();
    await login(page, adminEmail);
    await page.goto("/user");
    await expect(page.locator("#notifications")).toContainText(message);

    await page.goto(`/admin/software/${toolId}`);
    await page.locator('input[name="securityReviewed"]').uncheck();
    await page.locator('.enhe-admin-tool-editor-form button[type="submit"]').click();
    await expect(page).toHaveURL(/saved=1/, { timeout: 30_000 });
    await page.goto(`/software/${slug}`);
    await expect(page.locator(".product-safety-info-card")).toHaveCount(0);
  });
});
