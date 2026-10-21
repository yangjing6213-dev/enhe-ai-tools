import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { SITE_ANNOUNCEMENT_KEY } from "../../src/lib/site-announcement";

function localDatabaseEnabled() {
  if (process.env.ENHE_E2E_ALLOW_DATABASE_MUTATION !== "1") return false;
  try {
    const url = new URL(process.env.DATABASE_URL ?? "");
    const name = decodeURIComponent(url.pathname.slice(1));
    return ["postgres:", "postgresql:"].includes(url.protocol)
      && ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)
      && /(?:^|[_-])(test|e2e)(?:[_-]|$)/i.test(name)
      && !/(?:^|[_-])(prod|production|live)(?:[_-]|$)/i.test(name);
  } catch { return false; }
}

test.describe("bilingual navigation announcement", () => {
  test.skip(!localDatabaseEnabled(), "Requires explicit opt-in and a dedicated local test database.");
  test.setTimeout(120_000);
  const prisma = new PrismaClient();
  const email = `notice-${Date.now()}-${process.pid}@enhe.test`;
  const password = "LocalAnnouncement123!";
  let adminId = "";
  let previousValue: string | null = null;

  test.beforeAll(async () => {
    const previous = await prisma.siteSetting.findUnique({ where: { key: SITE_ANNOUNCEMENT_KEY } });
    previousValue = previous?.value ?? null;
    adminId = (await prisma.user.create({ data: {
      email, passwordHash: await bcrypt.hash(password, 12), nickname: "Announcement test", role: "admin", isTestData: true,
    } })).id;
  });

  test.afterAll(async () => {
    try {
      if (previousValue === null) await prisma.siteSetting.deleteMany({ where: { key: SITE_ANNOUNCEMENT_KEY } });
      else await prisma.siteSetting.update({ where: { key: SITE_ANNOUNCEMENT_KEY }, data: { value: previousValue } });
      if (adminId) {
        await prisma.adminAuditLog.deleteMany({ where: { adminId } });
        await prisma.analyticsEvent.deleteMany({ where: { userId: adminId } });
        await prisma.user.deleteMany({ where: { id: adminId } });
        await prisma.loginAttempt.deleteMany({ where: { identifier: email } });
      }
    } finally { await prisma.$disconnect(); }
  });

  test("administrator saves both languages; dismissal lasts for the tab and a fresh visit shows it again", async ({ page, context, browser, baseURL }, testInfo) => {
    const origin = new URL(baseURL!).origin;
    await context.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    await page.goto("/login");
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(password);
    await page.getByRole("button", { name: "登录", exact: true }).click();
    await expect(page).toHaveURL(/\/admin$/, { timeout: 30_000 });
    await page.goto("/admin/settings");
    const form = page.locator(".enhe-admin-announcement-form");
    await form.locator('[name="enabled"]').check();
    await form.locator('[name="zhText"]').fill("新工具已上架，查看工具 →");
    await form.locator('[name="enText"]').fill("New tools are available. Explore tools →");
    await form.locator('[name="zhHref"]').fill("javascript:alert(1)");
    await form.locator('[name="enHref"]').fill("/en/software");
    await form.getByRole("button", { name: "保存通知横幅" }).click();
    await expect(form.getByRole("alert")).toBeVisible();
    await form.locator('[name="zhHref"]').fill("/software");
    await form.getByRole("button", { name: "保存通知横幅" }).click();
    await expect(form.getByRole("status")).toContainText("已保存并启用");
    expect(await prisma.adminAuditLog.count({ where: { adminId, action: "site.announcement.update" } })).toBe(1);
    await page.locator('section[aria-labelledby="announcement-settings-title"]').screenshot({ path: testInfo.outputPath("announcement-admin.png") });

    await page.goto("/");
    const banner = page.getByRole("complementary", { name: "网站通知" });
    await expect(banner).toBeVisible();
    await expect(banner.getByRole("link")).toHaveAttribute("href", "/software");
    expect((await banner.boundingBox())!.y).toBeGreaterThanOrEqual((await page.locator("header.redesign-header").boundingBox())!.height);
    await banner.getByRole("link").click();
    await expect(page).toHaveURL(/\/software$/);
    await expect(banner).toBeVisible();
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(banner).toHaveCSS("background-color", "rgb(37, 99, 235)");
      await expect(banner.getByRole("link")).toHaveCSS("color", "rgb(255, 255, 255)");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await banner.screenshot({ path: testInfo.outputPath("announcement-mobile.png") });
    await page.goto("/en/software");
    const englishBanner = page.getByRole("complementary", { name: "Site announcement" });
    await expect(englishBanner).toContainText("New tools are available.");
    await expect(englishBanner.getByRole("link")).toHaveAttribute("href", "/en/software");
    await page.locator('.redesign-mobile-actions .redesign-theme-switch').click();
    await page.getByRole("menuitemradio", { name: "Dark", exact: true }).click();
    await expect(englishBanner).toHaveCSS("background-color", "rgb(37, 99, 235)");
    await expect(englishBanner.getByRole("link")).toHaveCSS("color", "rgb(255, 255, 255)");
    await englishBanner.getByRole("button", { name: "Dismiss announcement" }).click();
    await expect(englishBanner).toHaveCount(0);
    await page.goto("/en");
    await expect(page.locator(".redesign-theme-switch").first()).toBeAttached();
    await expect(page.locator(".site-announcement")).toHaveCount(0);
    await page.reload();
    await expect(page.locator(".site-announcement")).toHaveCount(0);
    await page.goto("/");
    await expect(page.locator(".site-announcement")).toHaveCount(0);

    const fresh = await browser.newContext();
    try {
      await fresh.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
      const visitor = await fresh.newPage();
      await visitor.goto(`${origin}/`);
      await expect(visitor.locator(".site-announcement")).toBeVisible();
      await page.goto("/admin/settings");
      await page.locator('.enhe-admin-announcement-form [name="enabled"]').uncheck();
      await page.getByRole("button", { name: "保存通知横幅" }).click();
      await expect(page.locator('.enhe-admin-announcement-form [role="status"]')).toContainText("当前已关闭");
      await visitor.reload();
      await expect(visitor.locator(".site-announcement")).toHaveCount(0);
    } finally { await fresh.close(); }
  });
});
