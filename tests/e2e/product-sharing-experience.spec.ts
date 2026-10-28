import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

function localDatabaseEnabled() {
  if (process.env.ENHE_E2E_ALLOW_DATABASE_MUTATION !== "1" || process.env.ADMIN_EMAIL_NOTIFICATIONS_ENABLED !== "false") return false;
  try {
    const url = new URL(process.env.DATABASE_URL ?? "");
    const name = decodeURIComponent(url.pathname.slice(1));
    return ["postgres:", "postgresql:"].includes(url.protocol)
      && ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)
      && /(?:^|[_-])(test|e2e)(?:[_-]|$)/i.test(name)
      && !/(?:^|[_-])(prod|production|live)(?:[_-]|$)/i.test(name);
  } catch { return false; }
}

test.describe("product sharing and AI Skill trust", () => {
  test.skip(!localDatabaseEnabled(), "Requires explicit opt-in, disabled admin email and a dedicated local test database.");
  test.describe.configure({ mode: "serial" });
  test.setTimeout(180_000);
  test.use({ actionTimeout: 15_000 });
  const prisma = new PrismaClient();
  const suffix = `${Date.now()}-${process.pid}`;
  const password = "LocalProductShareE2E123!";
  const adminEmail = `share-admin-${suffix}@enhe.test`;
  const viewerEmail = `share-reader-${suffix}@enhe.test`;
  const skillSlug = `reviewed-skill-${suffix}`;
  const unreviewedSlug = `unreviewed-skill-${suffix}`;
  const softwareSlug = `sharing-software-${suffix}`;
  const skillName = "Local reviewed AI Skill";
  const unreviewedName = "Local unreviewed AI Skill";
  const creatorBio = "I create practical AI Skills for this local browser test.";
  const toolIds: string[] = [];
  const userIds: string[] = [];
  let adminId = "";
  let viewerId = "";
  let skillId = "";
  let orderId = "";
  let fileId = "";

  test.beforeAll(async () => {
    const passwordHash = await bcrypt.hash(password, 12);
    const admin = await prisma.user.create({ data: { email: adminEmail, passwordHash, nickname: "Local skill creator", role: "admin", creatorBio, isTestData: true } });
    adminId = admin.id;
    userIds.push(adminId);
    const viewer = await prisma.user.create({ data: { email: viewerEmail, passwordHash, nickname: "Local skill reader", isTestData: true } });
    viewerId = viewer.id;
    userIds.push(viewerId);
    const file = await prisma.file.create({ data: { fileName: "local-skill.zip", filePath: "https://example.test/never-download.zip" } });
    fileId = file.id;
    const skill = await prisma.tool.create({ data: {
      name: skillName, englishName: skillName, slug: skillSlug, type: "ai_skill", status: "published",
      creatorId: adminId, securityReviewedAt: new Date("2026-10-26T00:00:00Z"),
      shortDescription: "A reviewed local AI Skill with clear delivery notes.",
      content: "This local test Skill helps verify product trust, author details, payment state and sharing without purchasing anything.",
      isDownloadPaid: true, downloadPrice: 5, downloadFileId: fileId, supportedAgents: ["codex", "cursor"],
    } });
    skillId = skill.id;
    toolIds.push(skill.id);
    const unreviewed = await prisma.tool.create({ data: {
      name: unreviewedName, englishName: unreviewedName, slug: unreviewedSlug, type: "ai_skill", status: "published",
      shortDescription: "A local Skill without a review record.", content: "No safety review has been recorded for this local fixture.",
    } });
    toolIds.push(unreviewed.id);
    const software = await prisma.tool.create({ data: {
      name: "Local sharing software", englishName: "Local sharing software", slug: softwareSlug,
      type: "software", status: "published", shortDescription: "Local sharing layout fixture.",
      content: "This fixture verifies changelog, sharing, usage steps and the homepage QR code.",
      deliveryMode: "how_to", usageSteps: [{ title: "Open your AI agent", description: "Use the local instructions to get started." }],
      installPrompt: "Local fixture only. Do not execute.",
      changelogs: { create: { version: "V1.0", title: "Initial release", content: "Local browser validation release.", releaseDate: new Date("2026-10-26T00:00:00Z") } },
    } });
    toolIds.push(software.id);
    const order = await prisma.order.create({ data: {
      orderNo: `LOCAL-SHARE-${suffix}`, userId: viewerId, toolId: skillId, amount: 5,
      orderType: "software_download", orderStatus: "activated", paidAt: new Date(), activatedAt: new Date(), isTestData: true,
    } });
    orderId = order.id;
    await prisma.toolPurchase.create({ data: { userId: viewerId, toolId: skillId, orderId, amount: 5, fileId } });
  });

  test.beforeEach(async ({ context, baseURL }) => {
    const origin = new URL(baseURL!).origin;
    await context.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin });
  });

  test.afterAll(async () => {
    try {
      if (orderId) {
        await prisma.toolPurchase.deleteMany({ where: { orderId } });
        await prisma.order.deleteMany({ where: { id: orderId } });
      }
      if (toolIds.length) {
        await prisma.adminAuditLog.deleteMany({ where: { targetId: { in: toolIds } } });
        await prisma.toolChangelog.deleteMany({ where: { toolId: { in: toolIds } } });
        await prisma.tool.deleteMany({ where: { id: { in: toolIds } } });
      }
      if (fileId) await prisma.file.deleteMany({ where: { id: fileId } });
      if (userIds.length) {
        await prisma.analyticsEvent.deleteMany({ where: { userId: { in: userIds } } });
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
        await prisma.loginAttempt.deleteMany({ where: { identifier: { in: [adminEmail, viewerEmail] } } });
      }
    } finally { await prisma.$disconnect(); }
  });

  async function login(page: Page, email: string) {
    await page.goto("/login");
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(password);
    await page.locator(".login-submit-button").click();
    await expect(page).toHaveURL(email === adminEmail ? /\/admin$/ : /\/user(?:[/?#]|$)/, { timeout: 30_000 });
  }

  test("AI Skill trust records and creator are visible in both languages before and after purchase", async ({ page }, testInfo) => {
    for (const prefix of ["", "/en"]) {
      await page.goto(`${prefix}/ai-skills`);
      const card = page.locator(".redesign-software-card").filter({ has: page.getByRole("heading", { name: skillName, exact: true }) });
      await expect(card.locator(".redesign-software-card-trust")).toBeVisible();
      const unreviewed = page.locator(".redesign-software-card").filter({ has: page.getByRole("heading", { name: unreviewedName, exact: true }) });
      await expect(unreviewed).toBeVisible();
      await expect(unreviewed.locator(".redesign-software-card-trust")).toHaveCount(0);
    }
    for (const purchased of [false, true]) {
      if (purchased) await login(page, viewerEmail);
      for (const prefix of ["", "/en"]) {
        await page.goto(`${prefix}/ai-skills/${skillSlug}`);
        await expect(page.locator(".product-safety-info-card")).toBeVisible();
        await expect(page.locator(".creator-profile-bio")).toHaveText(creatorBio);
        await expect(page.locator("[data-refund-guarantee]")).toBeVisible();
        await expect(page.locator("[data-refund-guarantee] a")).toHaveAttribute("href", `${prefix}/legal/membership-refund`);
        for (const width of [390, 1280]) {
          await page.setViewportSize({ width, height: 900 });
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
          await page.locator(".tool-detail-facts-grid").screenshot({ path: testInfo.outputPath(`skill-${prefix ? "en" : "zh"}-${purchased ? "paid" : "unpaid"}-${width}.png`) });
        }
      }
    }
  });

  test("AI Skill editor offers actual safety review and creator controls", async ({ page }) => {
    await login(page, adminEmail);
    await page.goto(`/admin/ai-skills/${skillId}`);
    await expect(page.locator('input[name="securityReviewed"]')).toBeChecked();
    await expect(page.locator('select[name="creatorId"]')).toHaveValue(adminId);
    await expect(page.locator('textarea[name="creatorBio"]')).toHaveValue(creatorBio);
    await page.goto("/admin/ai-skills/new");
    await expect(page.locator('input[name="securityReviewed"]')).not.toBeChecked();
    await expect(page.locator('select[name="creatorId"]')).toHaveValue(adminId);
  });

  test("product links, QR codes and footer retain layout and work at both sizes and languages", async ({ page }, testInfo) => {
    for (const prefix of ["", "/en"]) {
      const english = Boolean(prefix);
      const path = `${prefix}/software/${softwareSlug}`;
      await page.goto(path);
      const share = page.getByRole("region", { name: english ? "Share this product" : "分享此产品", exact: true });
      const button = share.getByRole("button", { name: english ? "Copy product link" : "复制产品链接", exact: true });
      const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
      expect(canonical).toBe(`https://www.enhe-tech.com.cn${path}`);
      await expect(share).toBeVisible();
      await expect(share).not.toContainText("enhe-tech.com.cn");
      await expect(share.locator("input")).toHaveCount(0);
      await expect(share.locator('svg[role="img"]')).toHaveCount(1);
      await expect(share.locator('svg[role="img"] path')).not.toHaveCount(0);
      await button.click();
      await expect(share.getByRole("status")).toContainText(english ? "Link copied" : "链接已复制");
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(canonical);
      expect(await button.evaluate(node => getComputedStyle(node).color)).toBe("rgb(255, 255, 255)");
      for (const width of [390, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        const changelogBox = await page.locator("#tool-changelog").boundingBox();
        const shareBox = await share.boundingBox();
        const usageBox = await page.locator("#tool-how-to").boundingBox();
        expect(shareBox!.y).toBeGreaterThanOrEqual(changelogBox!.y + changelogBox!.height);
        expect(usageBox!.y).toBeGreaterThanOrEqual(shareBox!.y + shareBox!.height);
        const footer = page.locator("footer");
        const qr = footer.getByRole("img", { name: english ? "Scan to visit the homepage" : "扫码进入网站首页", exact: true });
        const sloganBox = await footer.locator('[id^="redesign-home-brand-value-title-"]').boundingBox();
        const qrBox = await qr.boundingBox();
        const legalBox = await footer.locator(".footer-bottom").boundingBox();
        expect(qrBox!.y).toBeGreaterThan(sloganBox!.y + sloganBox!.height);
        expect(legalBox!.y).toBeGreaterThan(qrBox!.y + qrBox!.height);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await share.screenshot({ path: testInfo.outputPath(`share-${english ? "en" : "zh"}-${width}.png`) });
        await qr.locator("..").screenshot({ path: testInfo.outputPath(`footer-qr-${english ? "en" : "zh"}-${width}.png`) });
      }
    }
  });
});
