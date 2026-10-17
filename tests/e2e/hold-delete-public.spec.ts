import { PrismaClient } from "@prisma/client";
import { expect, test, type BrowserContext, type Locator, type Page } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { getAuthSecret, hashSessionToken, signSessionCookieValue } from "../../src/lib/auth-security";
import { isSameLoopbackOrigin } from "../fixtures/loopback-origin";

const enabled = process.env.ENHE_E2E_ALLOW_DATABASE_MUTATION === "1" && Boolean(process.env.DATABASE_URL);
test.skip(!enabled, "Requires an explicitly enabled dedicated local test database.");
test.setTimeout(60_000);
if (enabled) {
  const database = new URL(process.env.DATABASE_URL!);
  const name = decodeURIComponent(database.pathname.slice(1));
  if (!["postgres:", "postgresql:"].includes(database.protocol)
    || !["localhost", "127.0.0.1", "::1", "[::1]"].includes(database.hostname)
    || !/(?:^|[_-])(test|e2e)(?:[_-]|$)/i.test(name)
    || /(?:^|[_-])(prod|production|live)(?:[_-]|$)/i.test(name)) {
    throw new Error("Public hold deletion checks require a dedicated loopback test/e2e database.");
  }
}

const prefix = `hold-public-e2e-${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`;
const ownerId = `${prefix}-owner`;
const otherId = `${prefix}-other`;
const adminId = `${prefix}-admin`;
const userIds = [ownerId, otherId, adminId];
const postId = `${prefix}-topic`;
const parentReplyId = `${prefix}-parent`;
const childReplyId = `${prefix}-child`;
const toolId = `${prefix}-product`;
const commentId = `${prefix}-comment`;
const retainedCommentId = `${prefix}-retained-comment`;
const ownCommentText = "Comment selected for hold deletion.";
const retainedCommentText = "This other account comment must remain.";
let db: PrismaClient;
const sessionCookies: Record<string, string> = {};

test.beforeAll(async ({ baseURL }) => {
  if (!enabled) return;
  if (!baseURL || !isSameLoopbackOrigin(baseURL, baseURL)) throw new Error("Only the local test server is allowed.");
  db = new PrismaClient();
  for (const [id, role] of [[ownerId, "user"], [otherId, "user"], [adminId, "admin"]] as const) {
    await db.user.create({ data: { id, nickname: role === "admin" ? "Hold test admin" : "Hold test member", passwordHash: "unused-local-test-only", role, isTestData: true } });
    const token = randomBytes(32).toString("hex");
    const session = await db.session.create({ data: { userId: id, tokenHash: hashSessionToken(token), expiresAt: new Date(Date.now() + 3_600_000) } });
    sessionCookies[id] = signSessionCookieValue(session.id, token, getAuthSecret());
  }
  await db.forumPost.create({ data: { id: postId, authorId: ownerId, category: "workflow", title: "长按删除回复测试", content: "需要保留的话题正文。", status: "approved" } });
  await db.forumReply.create({ data: { id: parentReplyId, postId, authorId: ownerId, content: "长按删除父回复", status: "approved" } });
  await db.forumReply.create({ data: { id: childReplyId, postId, parentId: parentReplyId, authorId: otherId, content: "需要保留的子回复", status: "approved" } });
  await db.forumLike.create({ data: { userId: otherId, replyId: parentReplyId } });
  await db.tool.create({ data: {
    id: toolId, slug: toolId, type: "software", name: "长按评论测试产品", englishName: "Hold comment test product",
    shortDescription: "[[zh]]仅用于本地删除验证。[[/zh]][[en]]A disposable local deletion test product.[[/en]]",
    content: "[[zh]]仅用于本地测试。[[/zh]][[en]]Local browser verification only.[[/en]]",
    status: "published", isVipRequired: false, isDownloadLinkVipOnly: false,
  } });
  await db.comment.createMany({ data: [
    { id: commentId, userId: ownerId, toolId, content: ownCommentText, status: "approved", isPinned: true, showOnHomepage: true, rating: 5 },
    { id: retainedCommentId, userId: otherId, toolId, content: retainedCommentText, status: "approved", rating: 4 },
  ] });
});

test.afterAll(async () => {
  if (!db) return;
  try {
    await db.adminAuditLog.deleteMany({ where: { adminId, targetId: { in: [parentReplyId, commentId] } } });
    await db.comment.deleteMany({ where: { id: { in: [commentId, retainedCommentId] }, toolId } });
    await db.tool.deleteMany({ where: { id: toolId, slug: toolId } });
    await db.forumLike.deleteMany({ where: { replyId: { in: [parentReplyId, childReplyId] }, userId: { in: userIds } } });
    await db.forumPost.deleteMany({ where: { id: postId, authorId: ownerId } });
    await db.session.deleteMany({ where: { userId: { in: userIds } } });
    await db.user.deleteMany({ where: { id: { in: userIds }, isTestData: true } });
  } finally { await db.$disconnect(); }
});

test.beforeEach(async ({ context, baseURL }) => {
  if (!baseURL || !isSameLoopbackOrigin(baseURL, baseURL)) throw new Error("Only the local test server is allowed.");
  await context.route("**/*", async route => {
    if (!isSameLoopbackOrigin(route.request().url(), baseURL)) return route.abort();
    // Keep unrelated visit telemetry out of the disposable database fixture.
    if (new URL(route.request().url()).pathname === "/api/analytics") return route.fulfill({ status: 204 });
    await route.continue();
  });
});

async function account(context: BrowserContext, baseURL: string, userId?: string) {
  await context.clearCookies();
  if (userId) await context.addCookies([{ name: process.env.AUTH_COOKIE_NAME ?? "enhe_session", value: sessionCookies[userId], url: baseURL }]);
}

function deleteForm(page: Page, kind: "forum-reply" | "public-comment", id: string) {
  const field = kind === "forum-reply" ? "replyId" : "id";
  return page.locator(`form[data-delete-kind="${kind}"]`).filter({ has: page.locator(`input[name="${field}"][value="${id}"]`) });
}

async function hold(page: Page, button: Locator) {
  await button.hover();
  await page.mouse.down();
  try { await page.waitForTimeout(2_150); }
  finally { await page.mouse.up(); }
}

async function expectNoOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth
    && document.body.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
}

test("reply ownership survives the hold upgrade and deleting a parent preserves the child", async ({ page, context, baseURL }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const viewer of [undefined, otherId, ownerId]) {
    await account(context, baseURL!, viewer);
    await page.goto(`/forum/${postId}`);
    await expect(page.getByText("长按删除父回复", { exact: true })).toBeVisible();
    await expect(deleteForm(page, "forum-reply", parentReplyId)).toHaveCount(viewer === ownerId ? 1 : 0);
    await expect(deleteForm(page, "forum-reply", childReplyId)).toHaveCount(viewer === otherId ? 1 : 0);
  }
  const form = deleteForm(page, "forum-reply", parentReplyId);
  const button = form.locator(".hold-button");
  await button.click();
  await expect(button).toHaveAttribute("data-phase", "idle");
  expect((await db.forumReply.findUniqueOrThrow({ where: { id: parentReplyId } })).content).toBe("长按删除父回复");
  await button.scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath("reply-owner-zh-390.png"), fullPage: true });
  await expectNoOverflow(page);
  await hold(page, button);
  await expect(form).toHaveCount(0);
  await expect(page.locator(".forum-reply-deleted > .forum-reply-content")).toHaveText("这条回复已删除。");
  await expect(page.getByText("需要保留的子回复", { exact: true })).toBeVisible();
  const parent = await db.forumReply.findUniqueOrThrow({ where: { id: parentReplyId } });
  expect(parent).toMatchObject({ content: "", status: "approved", postId });
  expect(await db.forumLike.count({ where: { replyId: parentReplyId } })).toBe(0);
  expect(await db.forumReply.findUniqueOrThrow({ where: { id: childReplyId } })).toMatchObject({ content: "需要保留的子回复", parentId: parentReplyId, status: "approved" });
  expect((await db.forumPost.findUniqueOrThrow({ where: { id: postId } })).status).toBe("approved");
  expect(await db.adminAuditLog.count({ where: { targetId: parentReplyId } })).toBe(0);
  await account(context, baseURL!, adminId);
  await page.reload();
  await expect(deleteForm(page, "forum-reply", childReplyId).locator(".hold-button")).toBeVisible();
  await expectNoOverflow(page);
});

test("public comment hold deletion keeps guest, owner, other account and administrator permissions", async ({ page, context, baseURL }, info) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const path = `/en/software/${toolId}`;
  for (const viewer of [undefined, otherId, ownerId, adminId]) {
    await account(context, baseURL!, viewer);
    await page.goto(path);
    await expect(page.getByText(ownCommentText, { exact: true })).toBeVisible();
    await expect(deleteForm(page, "public-comment", commentId)).toHaveCount(viewer === ownerId || viewer === adminId ? 1 : 0);
    await expect(deleteForm(page, "public-comment", retainedCommentId)).toHaveCount(viewer === otherId || viewer === adminId ? 1 : 0);
  }
  const form = deleteForm(page, "public-comment", commentId);
  const button = form.locator(".hold-button");
  await button.click();
  await expect(button).toHaveAttribute("data-phase", "idle");
  expect((await db.comment.findUniqueOrThrow({ where: { id: commentId } })).status).toBe("approved");
  await button.scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath("comment-admin-en-1440.png"), fullPage: true });
  await expectNoOverflow(page);
  await hold(page, button);
  await expect(form).toHaveCount(0);
  await expect(page.getByText(ownCommentText, { exact: true })).toHaveCount(0);
  await expect(page.getByText(retainedCommentText, { exact: true })).toBeVisible();
  expect(await db.comment.findUniqueOrThrow({ where: { id: commentId } })).toMatchObject({
    status: "deleted", content: ownCommentText, isPinned: false, showOnHomepage: false,
  });
  expect((await db.comment.findUniqueOrThrow({ where: { id: retainedCommentId } })).status).toBe("approved");
  expect(await db.adminAuditLog.count({ where: { adminId, action: "comment.soft_delete", targetId: commentId } })).toBe(1);
  await page.reload();
  await expect(page.getByText(ownCommentText, { exact: true })).toHaveCount(0);
  await expect(page.getByText(retainedCommentText, { exact: true })).toBeVisible();
  await expectNoOverflow(page);
});

test("a failed draft attachment removal stays visible, blocks publication and permits a new hold", async ({ page, context, baseURL }, info) => {
  await account(context, baseURL!, ownerId);
  await page.setViewportSize({ width: 390, height: 844 });
  const attachmentId = `${prefix}-draft-media`;
  const uploadUrl = new URL("/api/forum/media", baseURL).href;
  const image = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=", "base64");
  let removals = 0;
  await page.route(uploadUrl, route => route.fulfill({ status: 201, json: { id: attachmentId, type: "image", url: `/api/forum/media/${attachmentId}` } }));
  await page.route(`${uploadUrl}/${attachmentId}`, route => {
    if (route.request().method() !== "DELETE") return route.fulfill({ status: 200, contentType: "image/png", body: image });
    removals += 1;
    return removals === 1
      ? route.fulfill({ status: 503, json: { code: "FORUM_MEDIA_UNAVAILABLE" } })
      : route.fulfill({ status: 200, json: { deleted: true } });
  });
  await page.goto("/forum/new");
  const editor = page.locator(".forum-media-editor");
  await editor.locator('input[type="file"][accept^="image/"]').setInputFiles({ name: "hold-removal.png", mimeType: "image/png", buffer: image });
  const item = editor.locator(".forum-media-editor__item");
  const button = item.locator(".hold-button");
  const submit = page.locator('.forum-form-card button[type="submit"]');
  await expect(item.locator('input[name="attachmentIds"]')).toHaveValue(attachmentId);
  await button.click();
  expect(removals).toBe(0);
  await hold(page, button);
  await expect(button).toHaveAttribute("data-phase", "error");
  await expect(item.locator(".forum-media-editor__status")).toHaveText("移除失败，请稍后重试。");
  await expect(item).toHaveCount(1);
  await expect(button).toBeEnabled();
  await expect(submit).toBeDisabled();
  expect(removals).toBe(1);
  await page.screenshot({ path: info.outputPath("attachment-remove-failed-zh-390.png"), fullPage: true });
  await expectNoOverflow(page);
  await hold(page, button);
  await expect(item).toHaveCount(0);
  await expect(submit).toBeEnabled();
  expect(removals).toBe(2);
  expect(await db.forumAttachment.count({ where: { id: attachmentId } })).toBe(0);
  expect(await db.forumPost.count({ where: { authorId: ownerId } })).toBe(1);
  await expectNoOverflow(page);
});
