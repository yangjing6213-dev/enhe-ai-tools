import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { hashSessionToken, signSessionCookieValue } from "../../src/lib/auth-security";
import { deleteForumMediaStoredFile } from "../../src/lib/forum-media-storage";
import { emojiCatalogKey } from "../../src/lib/emojis";
import { deleteStoredLocalFileIfSafe } from "../../src/lib/storage";
import { getUploadDiskPath } from "../../src/lib/upload-path";

const enabled = process.env.ENHE_E2E_ALLOW_DATABASE_MUTATION === "1" && Boolean(process.env.DATABASE_URL);
test.skip(!enabled, "Requires a dedicated local test database and explicit mutation flag.");
if (enabled) {
  const url = new URL(process.env.DATABASE_URL!);
  if (!["localhost", "127.0.0.1"].includes(url.hostname) || !/(?:^|[_-])(test|e2e)(?:[_-]|$)/.test(url.pathname.slice(1))) throw new Error("Forum tests require a dedicated local test/e2e database.");
}

const prefix = `forum-e2e-${Date.now().toString(36)}`;
const userId = `${prefix}-user`;
const adminId = `${prefix}-admin`;
const postId = `${prefix}-post`;
let db: PrismaClient;
let userCookie: string;
let adminCookie: string;

test.beforeAll(async () => {
  if (!enabled) return;
  db = new PrismaClient();
  for (const [id, role] of [[userId, "user"], [adminId, "admin"]] as const) {
    await db.user.create({ data: { id, nickname: `${role} :enhe_01:`, passwordHash: "unused-test-only", role, isTestData: true } });
    const token = randomBytes(32).toString("hex");
    const session = await db.session.create({ data: { userId: id, tokenHash: hashSessionToken(token), expiresAt: new Date(Date.now() + 3_600_000) } });
    const cookie = signSessionCookieValue(session.id, token, process.env.AUTH_SECRET!);
    if (role === "admin") adminCookie = cookie; else userCookie = cookie;
  }
  await db.forumPost.create({ data: { id: postId, authorId: userId, category: "workflow", title: "论坛布局测试", content: "测试正文 :enhe_01:", status: "approved" } });
  const parent = await db.forumReply.create({ data: { postId, authorId: userId, content: "一级回复", status: "approved" } });
  await db.forumReply.create({ data: { postId, authorId: userId, parentId: parent.id, content: "二级回复", status: "approved" } });
});

test.afterAll(async () => {
  if (!enabled || !db) return;
  const ids = [userId, adminId];
  const attachments = await db.forumAttachment.findMany({ where: { authorId: { in: ids } } });
  for (const item of attachments) await deleteForumMediaStoredFile(item.filePath);
  await db.forumAttachment.deleteMany({ where: { authorId: { in: ids } } });
  await db.forumLike.deleteMany({ where: { userId: { in: ids } } });
  await db.forumReply.deleteMany({ where: { authorId: { in: ids } } });
  await db.forumPost.deleteMany({ where: { authorId: { in: ids } } });
  await db.adminAuditLog.deleteMany({ where: { adminId } });
  const catalog = await db.siteSetting.findUnique({ where: { key: emojiCatalogKey } });
  if (catalog) {
    for (const entry of JSON.parse(catalog.value) as { url: string }[]) {
      if (/^\/uploads\/(?:emojis\/[a-z0-9_-]+|[0-9]+-emojis-[0-9]+-enhe-[a-f0-9]{32})\.webp$/.test(entry.url)) await deleteStoredLocalFileIfSafe(getUploadDiskPath(entry.url));
    }
  }
  await db.siteSetting.deleteMany({ where: { key: emojiCatalogKey } });
  await db.session.deleteMany({ where: { userId: { in: ids } } });
  await db.user.deleteMany({ where: { id: { in: ids }, isTestData: true } });
  await db.$disconnect();
});

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: "enhe_session", value: userCookie, url: baseURL! }]);
});

test("forum cover, category spacing, full reply count and saved heart state work at phone and desktop sizes", async ({ page, browser, baseURL }) => {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/forum");
    await expect(page.locator(".redesign-brand-mark")).toHaveAttribute("sizes", "154px");
    await expect(page.locator(".redesign-footer .footer-brand-logo")).toHaveAttribute("sizes", "240px");
    const cover = page.locator(".forum-cover-image");
    const bounds = (await cover.boundingBox())!;
    expect(bounds.width / bounds.height).toBeCloseTo(1448 / 620, 1);
    await expect(cover).toHaveCSS("object-fit", "contain");
    const card = page.locator(".forum-post-card").filter({ hasText: "论坛布局测试" });
    const avatar = (await card.locator(".forum-avatar").boundingBox())!;
    const tag = (await card.locator(".forum-category-tag").boundingBox())!;
    expect(tag.y >= avatar.y + avatar.height || tag.x >= avatar.x + avatar.width + 8).toBe(true);
    await expect(card.getByText("举报", { exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: test.info().outputPath(`forum-${width}.png`), fullPage: true });
  }
  await page.goto(`/forum/${postId}`);
  const meta = page.locator(".forum-post-detail .forum-post-meta");
  await expect(meta.getByRole("link", { name: "2 条回复" })).toBeVisible();
  await expect(page.locator(".forum-back-link")).toContainText("◀");
  const heart = meta.getByRole("button", { name: "喜欢: 0", exact: true });
  await heart.click();
  await expect(meta.getByRole("button", { name: "喜欢: 1", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(meta.locator(".forum-like-heart")).toHaveCSS("animation-name", "forum-heart-pop");
  await page.reload();
  await expect(meta.getByRole("button", { name: "喜欢: 1", exact: true })).toHaveAttribute("aria-pressed", "true");
  await meta.getByRole("button", { name: "喜欢: 1", exact: true }).click();
  await expect(meta.getByRole("button", { name: "喜欢: 0", exact: true })).toHaveAttribute("aria-pressed", "false");
  const summary = page.locator(".forum-section-heading .forum-reply-form > summary");
  await expect(summary).toHaveCSS("color", "rgb(255, 255, 255)");
  expect(await summary.evaluate((node) => getComputedStyle(node, "::marker").content)).toBe('""');
  const reduced = await browser.newContext({ reducedMotion: "reduce" });
  await reduced.addCookies([{ name: "enhe_session", value: userCookie, url: baseURL! }]);
  const reducedPage = await reduced.newPage();
  await reducedPage.goto(`/forum/${postId}`);
  await reducedPage.locator(".forum-post-detail .forum-like-button").click();
  await expect(reducedPage.locator(".forum-post-detail .forum-like-heart")).toHaveCSS("animation-name", "none");
  await reduced.close();
});

test("images, playable video and replies become public immediately after publishing", async ({ page, browser, baseURL }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/forum/new");
  expect((await page.locator(".forum-form-card").boundingBox())!.width).toBeGreaterThan(900);
  const title = `附件话题 ${prefix}`;
  await page.getByLabel("标题", { exact: true }).fill(title);
  const content = page.getByLabel("内容", { exact: true });
  await content.fill("这是一条图片和视频测试话题 ");
  await content.click();
  await page.getByRole("button", { name: "插入表情", exact: true }).click();
  await page.getByRole("button", { name: "插入出发表情", exact: true }).click();
  await expect(content).toHaveValue(/:enhe_01:/);
  const emojiButton = page.getByRole("button", { name: "插入表情", exact: true });
  await expect(emojiButton).toHaveCSS("position", "static");
  const contentBounds = (await content.boundingBox())!;
  const emojiBounds = (await emojiButton.boundingBox())!;
  expect(emojiBounds.y).toBeGreaterThanOrEqual(contentBounds.y + contentBounds.height);
  expect(Math.abs(emojiBounds.x - contentBounds.x)).toBeLessThanOrEqual(2);
  let releaseUpload!: () => void;
  const uploadGate = new Promise<void>((resolve) => { releaseUpload = resolve; });
  await page.route("**/api/forum/media", async (route) => { await uploadGate; await route.continue(); });
  const imageResponse = page.waitForResponse((response) => response.url().endsWith("/api/forum/media") && response.request().method() === "POST");
  await page.locator('input[type="file"][accept^="image/"]').setInputFiles(resolve("public/images/emojis/enhe_01.webp"));
  await expect(page.getByRole("button", { name: "发布话题", exact: true })).toBeDisabled();
  releaseUpload();
  const imageUpload = await imageResponse;
  expect(imageUpload.status()).toBe(201);
  const imageId = (await imageUpload.json()).id as string;
  await page.unroute("**/api/forum/media");
  await expect(page.locator(`input[name="attachmentIds"][value="${imageId}"]`)).toHaveCount(1);
  const videoResponse = page.waitForResponse((response) => response.url().endsWith("/api/forum/media") && response.request().method() === "POST");
  await page.locator('input[type="file"][accept^="video/"]').setInputFiles(resolve("tests/fixtures/forum-media-video.mp4"));
  expect((await videoResponse).status()).toBe(201);
  await expect(page.getByRole("button", { name: "发布话题", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "发布话题", exact: true }).click();
  await expect(page).toHaveURL(/submitted=1/);
  const post = await db.forumPost.findFirstOrThrow({ where: { authorId: userId, title }, include: { attachments: true } });
  expect(post.status).toBe("approved");
  expect(post.attachments).toHaveLength(2);
  const guest = await browser.newContext();
  expect((await guest.request.get(`${baseURL}/api/forum/media/${imageId}`)).status()).toBe(200);
  const video = post.attachments.find((item) => item.kind === "video")!;
  const range = await guest.request.get(`${baseURL}/api/forum/media/${video.id}`, { headers: { Range: "bytes=0-15" } });
  expect(range.status()).toBe(206);
  expect((await range.body()).length).toBe(16);
  await page.goto(`/forum/${post.id}`);
  await expect(page.locator(".forum-detail-content .enhe-inline-emoji")).toHaveCount(1);
  await expect.poll(() => page.locator(".forum-media-display__video").evaluate((node: HTMLVideoElement) => node.readyState)).toBeGreaterThanOrEqual(2);
  await expect(page.locator(".forum-media-display__video")).not.toHaveAttribute("autoplay");
  await page.locator(".forum-section-heading .forum-reply-form > summary").click();
  const form = page.locator(".forum-section-heading .forum-reply-form form");
  await form.locator("textarea").fill("这是一条带图片的回复 :enhe_02:");
  const postWidth = (await page.locator(".forum-post-detail").boundingBox())!.width;
  const replyFormWidth = (await form.boundingBox())!.width;
  expect(Math.abs(postWidth - replyFormWidth)).toBeLessThanOrEqual(2);
  const replyUpload = page.waitForResponse((response) => response.url().endsWith("/api/forum/media") && response.request().method() === "POST");
  await form.locator('input[type="file"]').setInputFiles(resolve("public/images/emojis/enhe_02.webp"));
  expect((await replyUpload).status()).toBe(201);
  await expect(form.getByRole("button", { name: "发布回复", exact: true })).toBeEnabled();
  await form.getByRole("button", { name: "发布回复", exact: true }).click();
  await expect(page).toHaveURL(/replySubmitted=1/);
  const replyRecord = await db.forumReply.findFirstOrThrow({ where: { postId: post.id, authorId: userId }, include: { attachments: true } });
  expect(replyRecord.status).toBe("approved");
  expect((await guest.request.get(`${baseURL}/api/forum/media/${replyRecord.attachments[0].id}`)).status()).toBe(200);
  await page.reload();
  await expect(page.locator(".forum-post-detail .forum-post-meta")).toContainText("1 条回复");
  await expect(page.locator(".forum-reply-card .forum-media-display__image")).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("forum-published-media.png"), fullPage: true });
  await guest.close();
});

test("ordinary text fields accept managed stickers and only administrators manage assets", async ({ page, browser, baseURL }) => {
  expect((await page.request.get("/api/admin/emojis")).status()).toBe(403);
  await page.goto("/user");
  const name = page.getByLabel("用户名", { exact: true });
  await name.fill("测试");
  await name.click();
  await page.getByRole("button", { name: "插入表情", exact: true }).click();
  await page.getByRole("button", { name: "插入挥手表情", exact: true }).click();
  await expect(name).toHaveValue("测试:enhe_02:");
  await page.getByRole("button", { name: "保存用户名", exact: true }).click();
  await expect.poll(async () => (await db.user.findUniqueOrThrow({ where: { id: userId } })).nickname).toBe("测试:enhe_02:");
  await page.reload();
  await expect(page.locator(".redesign-avatar-trigger .enhe-inline-emoji").first()).toBeVisible();
  const guest = await browser.newContext();
  const loginPage = await guest.newPage();
  await loginPage.goto("/login");
  await loginPage.locator('input[type="password"]').first().focus();
  await expect(loginPage.getByRole("button", { name: "插入表情", exact: true })).toHaveCount(0);
  await guest.close();
  const admin = await browser.newContext();
  await admin.addCookies([{ name: "enhe_session", value: adminCookie, url: baseURL! }]);
  const adminPage = await admin.newPage();
  await adminPage.goto("/admin/emojis");
  await expect(adminPage.locator(".enhe-emoji-admin-row")).toHaveCount(26);
  const label = adminPage.locator(".enhe-emoji-admin-row").first().locator('input').first();
  await label.fill("出发测试");
  await label.focus();
  await adminPage.getByRole("button", { name: "插入表情", exact: true }).click();
  await adminPage.getByRole("button", { name: "插入出发表情", exact: true }).click();
  await label.press("End");
  await label.pressSequentially("字");
  await expect(label).toHaveValue(/:enhe_01:字$/);
  await adminPage.getByRole("button", { name: "保存目录", exact: true }).click();
  await expect(adminPage.getByRole("status")).toContainText("已保存");
  await expect(adminPage.getByRole("button", { name: "保存目录", exact: true })).toHaveCSS("color", "rgb(255, 255, 255)");
  await adminPage.getByLabel("表情名称", { exact: true }).fill("浏览器新增素材");
  await adminPage.getByLabel("表情图片", { exact: true }).setInputFiles(resolve("public/images/emojis/enhe_03.webp"));
  await adminPage.getByRole("button", { name: "添加素材", exact: true }).click();
  await expect(adminPage.getByRole("status")).toContainText("表情已添加");
  await expect(adminPage.locator(".enhe-emoji-admin-row")).toHaveCount(27);
  const newImage = adminPage.locator(".enhe-emoji-admin-row").last().getByRole("img");
  await expect(newImage).toHaveAttribute("alt", "浏览器新增素材");
  await newImage.scrollIntoViewIfNeeded();
  await expect.poll(() => newImage.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  const publicCatalog = await page.request.get("/api/emojis");
  expect((await publicCatalog.json()).entries).toHaveLength(27);
  await adminPage.screenshot({ path: test.info().outputPath("admin-emojis.png"), fullPage: true });
  await admin.close();
});
