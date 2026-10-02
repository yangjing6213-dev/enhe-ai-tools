import { expect, test } from "@playwright/test";

const routes = [
  "/admin",
  "/admin/audit",
  "/admin/development",
  "/admin/releases",
  "/admin/seo-audit",
  "/admin/seo-insights",
  "/admin/messages"
] as const;

test("admin operations routes render across all design breakpoints without overflow or writes", async ({
  page,
  context,
  baseURL
}) => {
  test.setTimeout(120_000);
  if (!baseURL) throw new Error("The local visual fixture requires an explicit base URL.");

  const externalRequests: string[] = [];
  const writeRequests: string[] = [];
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];

  await context.addCookies([{ name: "enhe_session", value: "fixture-only", url: baseURL }]);
  await page.route("**/*", async (route) => {
    const request = route.request();
    const requestUrl = new URL(request.url());

    if (
      requestUrl.origin === baseURL &&
      request.method() === "POST" &&
      requestUrl.pathname === "/__nextjs_original-stack-frames"
    ) {
      await route.continue();
      return;
    }

    if (request.method() !== "GET" && request.method() !== "HEAD") {
      writeRequests.push(`${request.method()} ${request.url()}`);
      await route.abort();
      return;
    }

    if (requestUrl.origin !== baseURL) {
      externalRequests.push(requestUrl.origin);
      await route.abort();
      return;
    }

    await route.continue();
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  for (const width of [320, 390, 480, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes) {
      const response = await page.goto(route, { waitUntil: "commit" });
      expect(response?.status(), `${route} response`).toBe(200);
      await expect(page.locator(".enhe-admin-shell")).toBeVisible();
      await expect(page.locator("#main-content h1").first()).toBeVisible();
      await expect(page.locator(".admin-nav-link[aria-current='page']")).toHaveCount(1);
      const geometry = await page.evaluate(() => ({
        viewport: window.innerWidth,
        document: document.documentElement.scrollWidth,
        mainRight: document.querySelector("#main-content")?.getBoundingClientRect().right ?? 0
      }));
      expect(geometry.document, `${route} document at ${width}px`).toBeLessThanOrEqual(width);
      expect(geometry.mainRight, `${route} main content at ${width}px`).toBeLessThanOrEqual(width);
    }
  }

  expect(externalRequests).toEqual([]);
  expect(writeRequests).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
