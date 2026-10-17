import { PrismaClient } from "@prisma/client";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { randomBytes, randomUUID } from "node:crypto";
import { hashSessionToken, signSessionCookieValue } from "../../src/lib/auth-security";
import { isSameLoopbackOrigin } from "../fixtures/loopback-origin";

const enabled = process.env.ENHE_E2E_ALLOW_DATABASE_MUTATION === "1" && Boolean(process.env.DATABASE_URL);
test.skip(!enabled, "Requires explicitly enabled local test database writes.");
if (enabled) {
  const database = new URL(process.env.DATABASE_URL!);
  const name = decodeURIComponent(database.pathname.slice(1));
  if (!["postgres:", "postgresql:"].includes(database.protocol) || !["localhost", "127.0.0.1"].includes(database.hostname)
    || !/(?:^|[_-])(test|e2e)(?:[_-]|$)/i.test(name) || /(?:^|[_-])(prod|production|live)(?:[_-]|$)/i.test(name)) {
    throw new Error("Forum interaction tests require a dedicated loopback test/e2e database.");
  }
}

const prefix = `forum-interactions-e2e-${randomUUID()}`;
const userIds = [`${prefix}-owner`, `${prefix}-other`];
const postId = `${prefix}-topic`;
const nativePostId = `${prefix}-native`;
let db: PrismaClient;
const cookies: string[] = [];

test.beforeAll(async () => {
  if (!enabled) return;
  db = new PrismaClient();
  for (const id of userIds) {
    await db.user.create({ data: { id, nickname: "Local forum interaction fixture", passwordHash: "unused-local-test-only", isTestData: true } });
    const token = randomBytes(32).toString("hex");
    const session = await db.session.create({ data: { userId: id, tokenHash: hashSessionToken(token), expiresAt: new Date(Date.now() + 3_600_000) } });
    cookies.push(signSessionCookieValue(session.id, token, process.env.AUTH_SECRET ?? "development-auth-secret"));
  }
  for (const id of [postId, nativePostId]) await db.forumPost.create({ data: {
    id, authorId: userIds[0], category: "workflow", title: `四项互动测试 ${id === postId ? "desktop" : "native"}`, content: "真实本地接口测试正文", status: "approved",
    replies: { create: { authorId: userIds[0], content: "保留回复树", status: "approved" } },
  } });
});

test.afterAll(async () => {
  if (!db) return;
  try {
    await db.forumPost.deleteMany({ where: { authorId: userIds[0] } });
    await db.session.deleteMany({ where: { userId: { in: userIds } } });
    await db.user.deleteMany({ where: { id: { in: userIds }, isTestData: true } });
  } finally { await db.$disconnect(); }
});

async function prepare(context: BrowserContext, baseURL: string, account?: number) {
  if (!isSameLoopbackOrigin(baseURL, baseURL)) throw new Error("Only the local test server is allowed.");
  await context.route("**/*", route => isSameLoopbackOrigin(route.request().url(), baseURL) ? route.continue() : route.abort());
  if (account !== undefined) await context.addCookies([{ name: "enhe_session", value: cookies[account], url: baseURL }]);
}

function actions(page: Page, id = postId) {
  return page.locator(".forum-post-card").filter({ has: page.locator(`[data-forum-action="bookmark"]`) }).filter({ hasText: id === postId ? "四项互动测试 desktop" : "四项互动测试 native" }).locator(".forum-post-actions");
}

test("topic bar keeps action order, reply navigation and narrow-screen targets", async ({ page, context, baseURL }) => {
  await prepare(context, baseURL!, 0);
  for (const locale of ["zh", "en"]) {
    const root = locale === "en" ? "/en/forum" : "/forum";
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(root);
      const row = actions(page);
      await expect(row.locator("[data-forum-action]")).toHaveCount(4);
      expect(await row.locator("[data-forum-action]").evaluateAll(nodes => nodes.map(node => node.getAttribute("data-forum-action")))).toEqual(["reply", "share", "like", "bookmark"]);
      await expect(row.locator("[data-forum-action=reply]")).toHaveAttribute("href", `${root}/${postId}#replies`);
      for (const icon of await row.locator(".forum-action-icon").all()) {
        await expect(icon).toHaveCSS("color", "rgb(0, 0, 0)");
        await expect(icon).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
        await expect(icon).toHaveCSS("border-top-width", "0px");
      }
      const boxes = await row.locator(".forum-action-icon").evaluateAll(nodes => nodes.map(node => {
        const rect = node.getBoundingClientRect(); return { width: rect.width, height: rect.height, top: rect.top };
      }));
      expect(boxes.every(box => box.width >= 44 && box.height >= 44)).toBe(true);
      expect(new Set(boxes.map(box => Math.round(box.top))).size).toBe(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await row.screenshot({ path: test.info().outputPath(`forum-actions-${locale}-${width}.png`) });
    }
    await actions(page).locator("[data-forum-action=reply]").click();
    await expect(page).toHaveURL(new RegExp(`${root}/${postId}#replies$`));
    await expect(actions(page).locator("[data-forum-action=reply]")).toHaveAttribute("href", "#replies");
    await expect(page.locator(".forum-reply-tree").first()).toContainText("保留回复树");
  }
});

test("account bookmarks sync across browser contexts and stay separate between accounts", async ({ page, context, browser, baseURL }) => {
  await prepare(context, baseURL!, 0);
  await page.goto(`/forum/${postId}`);
  const bookmark = actions(page).locator("[data-forum-action=bookmark]");
  await expect(bookmark).toHaveAttribute("aria-pressed", "false");
  await bookmark.click();
  await expect(bookmark).toHaveAttribute("aria-pressed", "true");
  await expect(bookmark.locator(".forum-action-icon")).toHaveCSS("color", "rgb(4, 98, 194)");
  await expect.poll(() => db.forumBookmark.count({ where: { postId } })).toBe(1);
  const secondDevice = await browser.newContext();
  const otherAccount = await browser.newContext();
  try {
    await prepare(secondDevice, baseURL!, 0);
    const secondPage = await secondDevice.newPage();
    await secondPage.goto(`${baseURL}/en/forum/${postId}`);
    await expect(actions(secondPage).locator("[data-forum-action=bookmark]")).toHaveAttribute("aria-pressed", "true");
    await prepare(otherAccount, baseURL!, 1);
    const otherPage = await otherAccount.newPage();
    await otherPage.goto(`${baseURL}/forum/${postId}`);
    const otherBookmark = actions(otherPage).locator("[data-forum-action=bookmark]");
    await expect(otherBookmark).toHaveAttribute("aria-pressed", "false");
    await otherBookmark.click();
    await expect(otherBookmark).toHaveAttribute("aria-pressed", "true");
    await bookmark.click();
    await expect(bookmark).toHaveAttribute("aria-pressed", "false");
    expect(await db.forumBookmark.count({ where: { postId, userId: userIds[0] } })).toBe(0);
    expect(await db.forumBookmark.count({ where: { postId, userId: userIds[1] } })).toBe(1);
    await secondPage.reload();
    await expect(actions(secondPage).locator("[data-forum-action=bookmark]")).toHaveAttribute("aria-pressed", "false");
  } finally { await secondDevice.close(); await otherAccount.close(); }
});

test("likes persist with the new visual controls and reduced motion does not render sparks", async ({ page, context, baseURL }) => {
  await prepare(context, baseURL!, 0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`/forum/${postId}`);
  const like = actions(page).locator("[data-forum-action=like]");
  await like.click();
  await expect(like).toHaveAttribute("aria-pressed", "true");
  await expect(like.locator(".forum-action-icon")).toHaveCSS("color", "rgb(226, 59, 99)");
  await expect(like.locator(".forum-action-count")).toHaveText("1");
  expect(await actions(page).locator("canvas").count()).toBe(0);
  await page.reload();
  await expect(actions(page).locator("[data-forum-action=like]")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".forum-reply-card .forum-like-button")).toBeVisible();
  await expect(page.getByRole("button", { name: "删除回复", exact: true })).toBeVisible();
});

test("desktop copy records a unique share and guests can copy without an account record", async ({ page, context, browser, baseURL }) => {
  const installClipboard = async (target: BrowserContext) => target.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (url: string) => { (window as unknown as { copiedTopicUrl: string }).copiedTopicUrl = url; } } });
  });
  await prepare(context, baseURL!, 0);
  await installClipboard(context);
  await page.goto(`/forum/${postId}`);
  const share = actions(page).locator("[data-forum-action=share]");
  for (let repeat = 0; repeat < 2; repeat++) {
    await share.click();
    await expect(share.locator(".forum-action-count")).toHaveText("1");
    await expect(share.locator(".forum-action-icon")).toHaveCSS("color", "rgb(22, 163, 74)");
    await expect(share).toBeEnabled();
  }
  expect(await page.evaluate(() => (window as unknown as { copiedTopicUrl: string }).copiedTopicUrl)).toBe(`${baseURL}/forum/${postId}`);
  expect(await db.forumShare.count({ where: { postId } })).toBe(1);
  const guest = await browser.newContext();
  try {
    await prepare(guest, baseURL!);
    await installClipboard(guest);
    const guestPage = await guest.newPage();
    await guestPage.goto(`${baseURL}/forum/${postId}`);
    await expect(actions(guestPage).locator("[data-forum-action=bookmark]")).toHaveAttribute("href", /\/login\?returnTo=/);
    await expect(actions(guestPage).locator("[data-forum-action=like]")).toHaveAttribute("href", /\/login\?returnTo=/);
    await actions(guestPage).locator("[data-forum-action=share]").click();
    await expect(guestPage.locator(".forum-action-status")).toContainText("已复制");
    expect(await db.forumShare.count({ where: { postId } })).toBe(1);
  } finally { await guest.close(); }
});

test("native share cancellation does not count and a successful native share does", async ({ browser, baseURL }) => {
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile Safari/604.1", isMobile: true, hasTouch: true });
  try {
    await prepare(mobile, baseURL!, 0);
    await mobile.addInitScript(() => {
      (window as unknown as { cancelShare: boolean }).cancelShare = true;
      Object.defineProperty(navigator, "share", { configurable: true, value: async () => {
        if ((window as unknown as { cancelShare: boolean }).cancelShare) throw new DOMException("Cancelled", "AbortError");
      } });
    });
    const page = await mobile.newPage();
    await page.goto(`${baseURL}/forum/${nativePostId}`);
    const share = actions(page, nativePostId).locator("[data-forum-action=share]");
    await share.click();
    await expect(share).toBeEnabled();
    await expect(share.locator(".forum-action-count")).toHaveText("0");
    await expect(page.locator(".forum-action-status")).toHaveCount(0);
    expect(await db.forumShare.count({ where: { postId: nativePostId } })).toBe(0);
    await page.evaluate(() => { (window as unknown as { cancelShare: boolean }).cancelShare = false; });
    await share.click();
    await expect(share.locator(".forum-action-count")).toHaveText("1");
    expect(await db.forumShare.count({ where: { postId: nativePostId } })).toBe(1);
  } finally { await mobile.close(); }
});
