import { PrismaClient } from "@prisma/client";
import { expect, test, type Locator, type Page, type Route, type TestInfo } from "@playwright/test";
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
    throw new Error("Admin hold deletion checks require a dedicated loopback test/e2e database.");
  }
}

const prefix = `hold-admin-e2e-${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`;
const adminId = `${prefix}-admin`;
const targetUserId = `${prefix}-target`;
const retainedUserId = `${prefix}-retained`;
const categoryId = `${prefix}-category`;
const userIds = [adminId, targetUserId, retainedUserId];
let db: PrismaClient;
let adminCookie: string;
let targetSessionId: string;

test.beforeAll(async ({ baseURL }) => {
  if (!enabled) return;
  if (!baseURL || !isSameLoopbackOrigin(baseURL, baseURL)) throw new Error("Only the local test server is allowed.");
  db = new PrismaClient();
  await db.user.createMany({ data: userIds.map(id => ({
    id, nickname: id, passwordHash: "unused-local-test-only", isTestData: true,
    role: id === adminId ? "admin" as const : "user" as const,
  })) });
  await db.toolCategory.create({ data: { id: categoryId, name: categoryId, type: "software" } });
  for (const id of [adminId, targetUserId]) {
    const token = randomBytes(32).toString("hex");
    const session = await db.session.create({ data: {
      userId: id, tokenHash: hashSessionToken(token), expiresAt: new Date(Date.now() + 3_600_000),
    } });
    if (id === adminId) adminCookie = signSessionCookieValue(session.id, token, getAuthSecret());
    else targetSessionId = session.id;
  }
});

test.afterAll(async () => {
  if (!db) return;
  try {
    await db.adminAuditLog.deleteMany({ where: { adminId, targetId: { in: [categoryId, targetUserId] } } });
    await db.toolCategory.deleteMany({ where: { id: categoryId, name: categoryId } });
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
  await context.addCookies([{ name: process.env.AUTH_COOKIE_NAME ?? "enhe_session", value: adminCookie, url: baseURL }]);
});

function deletionForm(page: Page, id: string) {
  return page.locator("form[data-hold-delete-form]").filter({ has: page.locator(`input[name="id"][value="${id}"]`) });
}

async function holdWithMouse(page: Page, button: Locator, duration = 2_150) {
  await button.hover();
  await page.mouse.down();
  try { await page.waitForTimeout(duration); }
  finally { await page.mouse.up(); }
}

function isActionPost(route: Route, baseURL: string, pathname: string) {
  const request = route.request();
  return isSameLoopbackOrigin(request.url(), baseURL)
    && new URL(request.url()).pathname === pathname
    && request.method() === "POST"
    && Boolean(request.headers()["next-action"]);
}

async function pauseActionPosts(page: Page, baseURL: string, pathname: string) {
  let count = 0;
  let notifyRequest!: () => void;
  let release!: () => void;
  const seen = new Promise<void>(resolve => { notifyRequest = resolve; });
  const gate = new Promise<void>(resolve => { release = resolve; });
  const handler = async (route: Route) => {
    if (!isActionPost(route, baseURL, pathname)) return route.fallback();
    count += 1;
    notifyRequest();
    await gate;
    await route.continue();
  };
  await page.route("**/*", handler);
  return { seen, release, count: () => count, dispose: async () => { release(); await page.unroute("**/*", handler); } };
}

async function captureStyle(page: Page, button: Locator, label: string, info: TestInfo, name: string) {
  await button.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  await page.waitForTimeout(220);
  const style = await button.evaluate(element => {
    const computed = getComputedStyle(element);
    const fill = getComputedStyle(element.querySelector(".hold-button__fill")!);
    return {
      background: computed.backgroundColor, color: computed.color, radius: computed.borderRadius,
      fill: fill.backgroundColor, fillText: fill.color, height: element.getBoundingClientRect().height,
      label: element.querySelector(".hold-button__label > .hold-button__idle")?.textContent,
    };
  });
  expect(style).toMatchObject({
    background: "rgb(39, 39, 42)", color: "rgb(245, 245, 245)", radius: "14px",
    fill: "rgb(82, 39, 255)", fillText: "rgb(255, 255, 255)", label,
  });
  expect(style.height).toBeGreaterThanOrEqual(44);
  await info.attach(`${name}-computed-style`, { body: JSON.stringify(style, null, 2), contentType: "application/json" });
  await page.screenshot({ path: info.outputPath(`${name}.png`), fullPage: true });
  await expectNoOverflow(page);
}

async function expectNoOverflow(page: Page) {
  const sizes = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(sizes.document).toBeLessThanOrEqual(sizes.viewport);
  expect(sizes.body).toBeLessThanOrEqual(sizes.viewport);
}

test("Chinese desktop category requires a full hold and locks a pending real deletion", async ({ page, context, baseURL }, info) => {
  await context.addCookies([{ name: "enhe_locale", value: "zh", url: baseURL! }]);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/admin/categories");
  const form = deletionForm(page, categoryId);
  const button = form.locator(".hold-button");
  await expect(button).toBeVisible();
  await captureStyle(page, button, "长按删除", info, "category-zh-1440");
  const gate = await pauseActionPosts(page, baseURL!, "/admin/categories");
  try {
    await button.click();
    await expect(button).toHaveAttribute("data-phase", "idle");
    await holdWithMouse(page, button, 500);
    await expect(button).toHaveAttribute("data-phase", "idle");
    await button.press("Enter");
    await form.evaluate(element => (element as HTMLFormElement).requestSubmit());
    await page.waitForTimeout(250);
    expect(gate.count()).toBe(0);
    expect(await db.toolCategory.count({ where: { id: categoryId } })).toBe(1);
    expect(await db.adminAuditLog.count({ where: { adminId, targetId: categoryId } })).toBe(0);

    await Promise.all([gate.seen, holdWithMouse(page, button)]);
    await expect(button).toHaveAttribute("data-phase", "pending");
    await expect(button).toHaveAttribute("aria-busy", "true");
    await expect(button).toBeDisabled();
    await expect(button.locator(".hold-button__label > .hold-button__pending").first()).toHaveText("删除中…");
    expect(await db.toolCategory.count({ where: { id: categoryId } })).toBe(1);
    const box = await button.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.keyboard.press("Enter");
    await form.evaluate(element => (element as HTMLFormElement).requestSubmit());
    await page.waitForTimeout(250);
    expect(gate.count()).toBe(1);
    await page.screenshot({ path: info.outputPath("category-zh-1440-pending.png"), fullPage: true });
    await expectNoOverflow(page);
    gate.release();
    await expect.poll(() => db.toolCategory.count({ where: { id: categoryId } })).toBe(0);
    await expect(form).toHaveCount(0);
    await expect.poll(() => db.adminAuditLog.count({ where: { adminId, action: "category.delete", targetId: categoryId } })).toBe(1);
    expect(gate.count()).toBe(1);
    expect(await db.user.count({ where: { id: { in: userIds } } })).toBe(3);
    await expectNoOverflow(page);
  } finally { await gate.dispose(); }
});

test("English mobile user deletion preserves the required checkbox and unrelated users", async ({ page, context, baseURL }, info) => {
  await context.addCookies([{ name: "enhe_locale", value: "en", url: baseURL! }]);
  await page.setViewportSize({ width: 390, height: 844 });
  let posts = 0;
  page.on("request", request => {
    if (request.method() === "POST" && Boolean(request.headers()["next-action"])
      && new URL(request.url()).pathname === `/admin/users/${targetUserId}`) posts += 1;
  });
  await page.goto(`/admin/users/${targetUserId}`);
  const form = deletionForm(page, targetUserId);
  const button = form.locator(".hold-button");
  const confirmation = form.locator('input[name="confirmDelete"]');
  await expect(button).toBeVisible();
  await expect(confirmation).toHaveAttribute("required", "");
  await expect(confirmation).toHaveValue("DELETE_USER");
  await captureStyle(page, button, "Hold to delete user", info, "user-en-390");
  await holdWithMouse(page, button);
  await expect(button).toHaveAttribute("data-phase", "idle");
  await expect(confirmation).not.toBeChecked();
  await confirmation.press("Enter");
  await form.evaluate(element => (element as HTMLFormElement).requestSubmit());
  await page.waitForTimeout(250);
  expect(posts).toBe(0);
  expect(await db.user.count({ where: { id: targetUserId } })).toBe(1);
  expect(await db.session.count({ where: { id: targetSessionId } })).toBe(1);

  await confirmation.check();
  await confirmation.press("Enter");
  await page.waitForTimeout(250);
  expect(posts).toBe(0);
  await holdWithMouse(page, button);
  await expect(page).toHaveURL(/\/admin\/users\?deleted=1$/);
  await expect(page.locator(".enhe-admin-user-state-success")).toHaveText("User deleted.");
  expect(posts).toBe(1);
  expect(await db.user.count({ where: { id: targetUserId } })).toBe(0);
  expect(await db.session.count({ where: { id: targetSessionId } })).toBe(0);
  expect(await db.user.count({ where: { id: { in: [adminId, retainedUserId] }, status: "active" } })).toBe(2);
  expect(await db.adminAuditLog.count({ where: { adminId, action: "user.delete", targetId: targetUserId } })).toBe(1);
  await page.goto(`/admin/users?q=${encodeURIComponent(prefix)}`);
  await expect(page.getByRole("link", { name: "View / Edit", exact: true })).toHaveCount(2);
  await expectNoOverflow(page);
  await page.screenshot({ path: info.outputPath("users-en-390-after-delete.png"), fullPage: true });
});
