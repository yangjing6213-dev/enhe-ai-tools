import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { isSameLoopbackOrigin } from "../fixtures/loopback-origin";

const enabled = process.env.ENHE_E2E_ALLOW_DATABASE_MUTATION === "1" && Boolean(process.env.DATABASE_URL);
test.skip(!enabled, "Requires an explicitly authorized local test database.");
if (enabled) {
  const dbUrl = new URL(process.env.DATABASE_URL!);
  if (!["postgres:", "postgresql:"].includes(dbUrl.protocol) || !["localhost", "127.0.0.1"].includes(dbUrl.hostname)
    || !/(?:^|[_-])(test|e2e)(?:[_-]|$)/i.test(decodeURIComponent(dbUrl.pathname.slice(1)))
    || /(?:^|[_-])(prod|production|live)(?:[_-]|$)/i.test(dbUrl.pathname)) {
    throw new Error("Authentication checks require a dedicated loopback test/e2e database.");
  }
}

const prefix = `slide-e2e-${randomUUID().slice(0, 8)}`;
const account = `${prefix}@enhe.test`;
const password = "LocalSlide123!";
const registeredAccounts = ["drag", "keyboard", "nojs"].map(kind => `${prefix}-${kind}@enhe.test`);
const identifiers = [account, ...registeredAccounts];
let db: PrismaClient;

test.beforeAll(async () => {
  if (!enabled) return;
  db = new PrismaClient();
  await db.user.create({ data: { email: account, nickname: "Local slide fixture", passwordHash: await bcrypt.hash(password, 12), isTestData: true } });
});
test.afterAll(async () => {
  if (!db) return;
  try {
    const users = await db.user.findMany({ where: { email: { in: identifiers } }, select: { id: true } });
    const ids = users.map(user => user.id);
    await db.session.deleteMany({ where: { userId: { in: ids } } });
    await db.loginAttempt.deleteMany({ where: { identifier: { in: identifiers } } });
    await db.user.deleteMany({ where: { id: { in: ids }, email: { in: identifiers } } });
  } finally { await db.$disconnect(); }
});
test.beforeEach(async ({ context, baseURL }) => {
  if (!baseURL || !isSameLoopbackOrigin(baseURL, baseURL)) throw new Error("Only the local test server is allowed.");
  await context.route("**/*", route => isSameLoopbackOrigin(route.request().url(), baseURL) ? route.continue() : route.abort());
});

async function drag(page: Page, fraction = 1, cancel = false) {
  const track = page.locator(".slide-commit__track");
  await track.scrollIntoViewIfNeeded();
  const box = (await track.boundingBox())!;
  const start = box.x + 28;
  await page.mouse.move(start, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(start + (box.width - 56) * fraction, box.y + box.height / 2, { steps: 12 });
  if (cancel) await page.keyboard.press("Escape");
  await page.mouse.up();
}
async function credentials(page: Page, email = account, secret = password) {
  await page.locator("input[name=email]").fill(email);
  await page.locator("input[name=password]").fill(secret);
}

test("Chinese and English sliders fit desktop and phone forms", async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  for (const locale of ["zh", "en"]) {
    for (const kind of ["login", "register"]) {
      for (const width of [320, 390, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.goto(`${locale === "en" ? "/en" : ""}/${kind}?returnTo=%2Fuser`);
        const control = page.getByRole("slider");
        await expect(control).toBeVisible();
        await expect(control).toHaveAttribute("aria-valuenow", "0");
        await expect(page.locator(".slide-commit")).toHaveCSS("height", "56px");
        await expect(page.locator(".slide-commit__track")).toHaveCSS("background-color", "rgb(38, 38, 38)");
        await expect(page.locator(".enhe-auth-page a[href^='/api/auth/google/start']")).toHaveAttribute("href", "/api/auth/google/start?returnTo=%2Fuser");
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.locator(".enhe-auth-page form").screenshot({ path: test.info().outputPath(`${kind}-${locale}-${width}.png`) });
      }
    }
  }
  expect(errors).toEqual([]);
});

test("validation, short drag, Escape and pointer cancellation never submit", async ({ page }) => {
  await page.goto("/login");
  let submissions = 0;
  page.on("request", request => { if (request.method() === "POST") submissions++; });
  await drag(page);
  await expect(page.locator(".slide-commit")).toHaveAttribute("data-phase", "idle");
  expect(await page.locator("input[name=email]").evaluate(input => (input as HTMLInputElement).validity.valueMissing)).toBe(true);
  await credentials(page);
  await drag(page, 0.45);
  await expect(page.getByRole("slider")).toHaveAttribute("aria-valuenow", "0");
  await drag(page, 1, true);
  await expect(page.getByRole("slider")).toHaveAttribute("aria-valuenow", "0");
  const track = page.locator(".slide-commit__track");
  await track.dispatchEvent("pointerdown", { pointerId: 22, isPrimary: true, button: 0, pointerType: "touch", clientX: 30 });
  await track.dispatchEvent("pointermove", { pointerId: 22, clientX: 2000 });
  await track.dispatchEvent("pointercancel", { pointerId: 22 });
  await track.dispatchEvent("pointerup", { pointerId: 22 });
  await expect(page.getByRole("slider")).toHaveAttribute("aria-valuenow", "0");
  expect(submissions).toBe(0);
});

test("wrong password stays retryable, pending locks duplicates, correct keyboard retry signs in", async ({ page, context }) => {
  await page.goto("/en/login?returnTo=%2Fen%2Fuser");
  await credentials(page, account, "WrongLocalPass");
  let release!: () => void;
  const waiting = new Promise<void>(resolve => { release = resolve; });
  let posts = 0;
  await page.route("**/en/login*", async route => {
    if (route.request().method() === "POST") { posts++; await waiting; }
    await route.continue();
  });
  await drag(page);
  await expect(page.locator(".slide-commit")).toHaveAttribute("data-phase", "pending");
  await expect(page.getByRole("slider")).toHaveAttribute("aria-disabled", "true");
  await page.getByRole("slider").press("End");
  await page.locator("input[name=password]").press("Enter");
  expect(posts).toBe(1);
  expect(await db.session.count()).toBe(0);
  await page.locator(".slide-commit").screenshot({ path: test.info().outputPath("login-pending.png") });
  release();
  await expect(page).toHaveURL(/\/en\/login\?message=invalid/);
  await expect(page.locator(".status-danger")).toBeVisible();
  await credentials(page, account, "WrongLocalAgain");
  await page.getByRole("slider").press("End");
  await expect.poll(() => posts).toBe(2);
  await expect(page.getByRole("slider")).not.toHaveAttribute("aria-disabled", "true");
  await credentials(page);
  await page.getByRole("slider").press("Enter");
  await expect(page).toHaveURL(/\/en\/user$/);
  expect(posts).toBe(3);
  expect((await context.cookies()).some(cookie => cookie.name === "enhe_session")).toBe(true);
});

test("mobile touch registration creates one account and redirects to the requested page", async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.goto("/register?returnTo=%2Fuser");
  await page.locator("input[name=nickname]").fill("滑动注册测试");
  await credentials(page, registeredAccounts[0]);
  const track = page.locator(".slide-commit__track");
  await track.scrollIntoViewIfNeeded();
  const box = (await track.boundingBox())!;
  const cdp = await context.newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: box.x + 28, y: box.y + 28 }] });
  for (let step = 1; step <= 10; step++) await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove", touchPoints: [{ x: box.x + 28 + (box.width - 56) * step / 10, y: box.y + 28 }],
  });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(page).toHaveURL(/\/user$/);
  expect(await db.user.count({ where: { email: registeredAccounts[0] } })).toBe(1);
  expect((await context.cookies()).some(cookie => cookie.name === "enhe_session")).toBe(true);
  await cdp.detach();
});

test("input Enter submits registration with reduced motion enabled", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/en/register?returnTo=%2Fen%2Fuser");
  await page.locator("input[name=nickname]").fill("Keyboard fixture");
  await credentials(page, registeredAccounts[1]);
  await page.locator("input[name=password]").press("Enter");
  await expect(page).toHaveURL(/\/en\/user$/);
  expect(await db.user.count({ where: { email: registeredAccounts[1] } })).toBe(1);
});

test("without JavaScript a native registration button remains usable", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, extraHTTPHeaders: { "x-tencent-country": "CN" } });
  try {
    await context.route("**/*", route => isSameLoopbackOrigin(route.request().url(), baseURL!) ? route.continue() : route.abort());
    const page = await context.newPage();
    await page.goto(`${baseURL}/register?returnTo=%2Fuser`);
    await expect(page.getByRole("slider")).not.toBeVisible();
    await page.locator("input[name=nickname]").fill("No JavaScript fixture");
    await credentials(page, registeredAccounts[2]);
    await expect(page.getByRole("button", { name: "创建账号", exact: true })).toBeVisible();
    await page.locator("input[name=password]").press("Enter");
    await expect(page).toHaveURL(/\/user$/);
    expect(await db.user.count({ where: { email: registeredAccounts[2] } })).toBe(1);
  } finally { await context.close(); }
});
