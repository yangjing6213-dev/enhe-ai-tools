import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { hashSessionToken, signSessionCookieValue } from "../../src/lib/auth-security";
import { isSameLoopbackOrigin } from "../fixtures/loopback-origin";

const enabled = process.env.ENHE_E2E_ALLOW_DATABASE_MUTATION === "1" && Boolean(process.env.DATABASE_URL);
test.skip(!enabled, "Requires an explicitly enabled dedicated local test database.");
if (enabled) {
  const database = new URL(process.env.DATABASE_URL!);
  const name = decodeURIComponent(database.pathname.slice(1));
  if (!["postgres:", "postgresql:"].includes(database.protocol)
    || !["localhost", "127.0.0.1"].includes(database.hostname)
    || !/(?:^|[_-])(test|e2e)(?:[_-]|$)/i.test(name)
    || /(?:^|[_-])(prod|production|live)(?:[_-]|$)/i.test(name)) {
    throw new Error("Topic deletion checks require a dedicated loopback test/e2e database.");
  }
}

const prefix = `topic-delete-e2e-${Date.now().toString(36)}`;
const userId = `${prefix}-user`;
const adminId = `${prefix}-admin`;
const userIds = [userId, adminId];
let db: PrismaClient;
const sessionCookies: Record<string, string> = {};

test.beforeAll(async () => {
  if (!enabled) return;
  db = new PrismaClient();
  for (const [id, role] of [[userId, "user"], [adminId, "admin"]] as const) {
    await db.user.create({ data: { id, nickname: `${role} test fixture`, passwordHash: "unused-local-test-only", role, isTestData: true } });
    const token = randomBytes(32).toString("hex");
    const session = await db.session.create({ data: { userId: id, tokenHash: hashSessionToken(token), expiresAt: new Date(Date.now() + 3_600_000) } });
    sessionCookies[role] = signSessionCookieValue(session.id, token, process.env.AUTH_SECRET ?? "development-auth-secret");
  }
});

test.afterAll(async () => {
  if (!db) return;
  try {
    await db.adminAuditLog.deleteMany({ where: { adminId } });
    await db.forumAttachment.deleteMany({ where: { authorId: userId } });
    await db.forumPost.deleteMany({ where: { authorId: userId } });
    await db.session.deleteMany({ where: { userId: { in: userIds } } });
    await db.user.deleteMany({ where: { id: { in: userIds }, isTestData: true } });
  } finally {
    await db.$disconnect();
  }
});

test.beforeEach(async ({ context, baseURL }) => {
  if (!baseURL || !isSameLoopbackOrigin(baseURL, baseURL)) throw new Error("Only the local test server is allowed.");
  await context.route("**/*", async route => {
    if (isSameLoopbackOrigin(route.request().url(), baseURL)) await route.continue();
    else await route.abort();
  });
});

async function createTopic(suffix: string) {
  return db.forumPost.create({ data: {
    id: `${prefix}-${suffix}`, authorId: userId, category: "workflow", title: `话题删除验证 ${suffix}`, content: "保留以便恢复的测试正文", status: "approved",
    replies: { create: { authorId: userId, content: "保留的测试回复", status: "approved" } },
  }, include: { replies: true } });
}

test("guests and ordinary topic authors have no delete control", async ({ page, context, baseURL }) => {
  const post = await createTopic("permissions");
  for (const role of ["guest", "user"]) {
    if (role === "user") await context.addCookies([{ name: "enhe_session", value: sessionCookies.user, url: baseURL! }]);
    for (const locale of ["zh", "en"]) {
      const root = locale === "en" ? "/en/forum" : "/forum";
      await page.goto(root);
      await expect(page.locator(".forum-post-card").filter({ hasText: post.title })).toBeVisible();
      await expect(page.locator(".forum-delete-post")).toHaveCount(0);
      await page.goto(`${root}/${post.id}`);
      await expect(page.getByRole("heading", { level: 1, name: post.title })).toBeVisible();
      await expect(page.locator(".forum-delete-post")).toHaveCount(0);
    }
  }
});

for (const [locale, surface, width] of [["zh", "list", 1440], ["en", "detail", 390]] as const) {
  test(`administrator confirms deletion from ${locale} ${surface} at ${width}px`, async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: "enhe_session", value: sessionCookies.admin, url: baseURL! }]);
    await page.setViewportSize({ width, height: 1000 });
    const post = await createTopic(`${locale}-${surface}`);
    const attachment = await db.forumAttachment.create({ data: {
      authorId: userId, postId: post.id, kind: "image", filePath: "/uploads/forum/test-fixture-not-stored.webp", mimeType: "image/webp", fileSize: 1, originalName: "test-fixture.webp",
    } });
    const root = locale === "en" ? "/en/forum" : "/forum";
    await page.goto(surface === "list" ? root : `${root}/${post.id}`);
    const card = surface === "list" ? page.locator(".forum-post-card").filter({ hasText: post.title }) : page.locator(".forum-post-detail");
    const button = card.getByRole("button", { name: locale === "en" ? "Delete topic" : "删除话题", exact: true });
    await expect(button).toBeVisible();
    const cancelDialog = page.waitForEvent("dialog");
    const cancelClick = button.click();
    const cancelled = await cancelDialog;
    expect(cancelled.type()).toBe("confirm");
    await cancelled.dismiss();
    await cancelClick;
    await expect(button).toBeVisible();
    expect((await db.forumPost.findUniqueOrThrow({ where: { id: post.id } })).status).toBe("approved");
    expect(await db.adminAuditLog.count({ where: { targetId: post.id } })).toBe(0);
    await page.screenshot({ path: test.info().outputPath(`delete-control-${locale}-${width}.png`), fullPage: true });
    const confirmDialog = page.waitForEvent("dialog");
    const confirmClick = button.click();
    await (await confirmDialog).accept();
    await confirmClick;
    await expect(page).toHaveURL(new RegExp(`${root}\\?postDeleted=1$`));
    await expect(page.locator(".forum-success-notice")).toContainText(locale === "en" ? "Topic deleted" : "话题已删除");
    await expect(page.locator(".forum-post-card").filter({ hasText: post.title })).toHaveCount(0);
    const retained = await db.forumPost.findUniqueOrThrow({ where: { id: post.id }, include: { replies: true, attachments: true } });
    expect(retained.status).toBe("rejected");
    expect(retained.content).toBe(post.content);
    expect(retained.replies.map(reply => reply.content)).toContain("保留的测试回复");
    expect(retained.attachments[0].discardedAt).toBeNull();
    expect(await db.adminAuditLog.count({ where: { adminId, action: "forum.post.delete", targetId: post.id } })).toBe(1);
    for (const detailRoot of ["/forum", "/en/forum"]) {
      const response = await context.request.get(`${baseURL}${detailRoot}/${post.id}`);
      expect(response.status()).toBe(404);
      expect(await response.text()).not.toContain(post.title);
    }
    await context.clearCookies();
    expect((await context.request.get(`${baseURL}/api/forum/media/${attachment.id}`)).status()).toBe(404);
    const sitemap = await context.request.get(`${baseURL}/sitemap.xml`);
    expect(sitemap.status()).toBe(200);
    expect(await sitemap.text()).not.toContain(post.id);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });
}
