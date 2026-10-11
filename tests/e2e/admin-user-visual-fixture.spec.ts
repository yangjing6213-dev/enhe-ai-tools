import { expect, test } from "@playwright/test";

test("Admin user list and detail use the reference shell without submitting account actions", async ({ page, context, baseURL }) => {
  test.setTimeout(60_000);
  if (!baseURL) throw new Error("The local visual fixture requires an explicit base URL.");

  const externalRequests: string[] = [];
  const writeMethods: string[] = [];
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];

  await context.addCookies([{ name: "enhe_session", value: "fixture-only", url: baseURL }]);
  await page.route("**/*", async (route) => {
    const requestUrl = new URL(route.request().url());
    const method = route.request().method();
    if (
      requestUrl.origin === baseURL &&
      method === "POST" &&
      requestUrl.pathname === "/__nextjs_original-stack-frames"
    ) {
      await route.continue();
      return;
    }
    if (requestUrl.origin !== baseURL) {
      externalRequests.push(requestUrl.origin);
      await route.abort();
      return;
    }
    if (method !== "GET" && method !== "HEAD") {
      await route.abort();
      return;
    }
    await route.continue();
  });
  page.on("request", (request) => {
    const requestUrl = new URL(request.url());
    const isAllowedNextDiagnosticsRequest =
      requestUrl.origin === baseURL &&
      request.method() === "POST" &&
      requestUrl.pathname === "/__nextjs_original-stack-frames";
    if (!["GET", "HEAD"].includes(request.method()) && !isAllowedNextDiagnosticsRequest) {
      writeMethods.push(request.method());
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/admin/users", { waitUntil: "commit" });
  await expect(page.locator(".enhe-admin-user-filter-form")).toBeVisible();
  await expect(page.locator(".enhe-admin-user-records")).toBeVisible();
  await expect(page.locator(".admin-nav-link[aria-current='page']")).toHaveCount(1);
  await expect(page.locator(".enhe-admin-user-filter-form button")).toHaveCSS("color", "rgb(255, 255, 255)");
  const userNameTruncation = await page.locator(".enhe-admin-user-primary").first().evaluate((element) => {
    const original = element.textContent;
    element.textContent = "A".repeat(140);
    const style = getComputedStyle(element);
    const result = { textOverflow: style.textOverflow, overflow: style.overflow, original };
    element.textContent = original;
    return result;
  });
  expect(userNameTruncation.textOverflow).toBe("ellipsis");
  expect(userNameTruncation.overflow).toBe("hidden");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.goto("/admin/users/local-visual-user", { waitUntil: "commit" });
  await expect(page.locator(".enhe-admin-user-summary-card")).toContainText("Local Visual Fixture User");
  await expect(page.locator(".enhe-admin-user-contact")).toContainText("visual-user@localhost.invalid");
  await expect(page.locator(".enhe-admin-user-metadata")).toContainText("测试数据");
  await expect(page.locator(".enhe-admin-user-danger-panel input[name='confirmDelete']")).toBeVisible();
  await expect(page.locator(".admin-nav-link[aria-current='page']")).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.setViewportSize({ width: 320, height: 844 });
  const users320 = await page.goto("/admin/users", { waitUntil: "load" });
  expect(users320?.status()).toBe(200);
  await expect(page.locator(".enhe-admin-user-filter-form")).toBeVisible();
  await expect(page.locator(".enhe-admin-user-records")).toBeVisible();
  await expect(page.locator(".admin-nav-link[aria-current='page']")).toHaveCount(1);
  expect(await page.locator(".enhe-admin-user-records").evaluate((table) => table.scrollWidth > table.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  const userDetail320 = await page.goto("/admin/users/local-visual-user", { waitUntil: "load" });
  expect(userDetail320?.status()).toBe(200);
  await expect(page.locator(".enhe-admin-user-profile-form")).toBeVisible();
  await expect(page.locator(".enhe-admin-user-danger-panel input[name='confirmDelete']")).toBeVisible();
  await expect(page.locator(".admin-nav-link[aria-current='page']")).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin/users", { waitUntil: "commit" });
  await expect(page.locator(".enhe-admin-user-records")).toBeVisible();
  expect(await page.locator(".enhe-admin-user-records").evaluate((table) => table.scrollWidth > table.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.goto("/admin/users/local-visual-user", { waitUntil: "commit" });
  await expect(page.locator(".enhe-admin-user-profile-form")).toBeVisible();
  await expect(page.locator(".enhe-admin-user-danger-panel input[name='confirmDelete']")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  for (const width of [480, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [route, surface] of [
      ["/admin/users", ".enhe-admin-user-records"],
      ["/admin/users/local-visual-user", ".enhe-admin-user-profile-form"]
    ] as const) {
      const response = await page.goto(route, { waitUntil: "load" });
      expect(response?.status(), `${route} at ${width}px`).toBe(200);
      await expect(page.locator(".enhe-admin-shell")).toBeVisible();
      await expect(page.locator(surface)).toBeVisible();
      await expect(page.locator(".admin-nav-link[aria-current='page']")).toHaveCount(1);
      const geometry = await page.evaluate(() => ({
        viewport: window.innerWidth,
        document: document.documentElement.scrollWidth,
        mainRight: document.querySelector("#main-content")?.getBoundingClientRect().right ?? 0
      }));
      expect(geometry.document, `${route} document at ${width}px`).toBeLessThanOrEqual(width);
      expect(geometry.mainRight, `${route} main at ${width}px`).toBeLessThanOrEqual(width);
    }
  }

  expect(externalRequests).toEqual([]);
  expect(writeMethods).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test("User list truncates long labels, and comment cards show rating and avatar", async ({ page, context, baseURL }) => {
  test.setTimeout(60_000);
  if (!baseURL) throw new Error("The local visual fixture requires an explicit base URL.");

  await context.addCookies([{ name: "enhe_session", value: "fixture-only", url: baseURL }]);
  await page.route("**/*", async (route) => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.origin !== baseURL || !["GET", "HEAD"].includes(route.request().method())) {
      await route.abort();
      return;
    }
    await route.continue();
  });

  await page.goto("/admin/users", { waitUntil: "load" });
  const filterButton = page.locator(".enhe-admin-user-filter-form button");
  await expect(filterButton).toHaveCSS("color", "rgb(255, 255, 255)");
  const label = page.locator(".enhe-admin-user-primary").first();
  const truncation = await label.evaluate((element) => {
    element.textContent = "A".repeat(140);
    const style = getComputedStyle(element);
    return {
      textOverflow: style.textOverflow,
      overflow: style.overflow,
      fullLabelInTitle: Boolean(element.getAttribute("title"))
    };
  });
  expect(truncation).toEqual({ textOverflow: "ellipsis", overflow: "hidden", fullLabelInTitle: true });

  await page.goto("/admin/comments", { waitUntil: "load" });
  const comment = page.locator(".enhe-admin-comment-card").first();
  await expect(comment).toContainText("Local Visual Fixture User");
  await expect(comment).toContainText("Local visual fixture tool");
  await expect(comment).toContainText("★★★★★");
  await expect(comment.locator("img")).toHaveCount(1);

  await page.goto("/admin/files", { waitUntil: "load" });
  const uploadButton = page.getByRole("button", { name: "上传并创建记录" });
  await expect(uploadButton).toHaveCSS("background-color", "rgb(4, 98, 194)");
  await expect(uploadButton).toHaveCSS("color", "rgb(255, 255, 255)");
});

test("User center exposes username and avatar controls without submitting changes", async ({ page, context, baseURL }) => {
  test.setTimeout(60_000);
  if (!baseURL) throw new Error("The local visual fixture requires an explicit base URL.");

  await context.addCookies([{ name: "enhe_session", value: "fixture-only", url: baseURL }]);
  await page.route("**/*", async (route) => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.origin !== baseURL || !["GET", "HEAD"].includes(route.request().method())) {
      await route.abort();
      return;
    }
    await route.continue();
  });

  await page.goto("/user", { waitUntil: "load" });
  await expect(page.getByRole("heading", { name: "个人资料" })).toBeVisible();
  await expect(page.locator("#profile-nickname")).toHaveValue("Local Visual Fixture User");
  await expect(page.locator("#profile-avatar")).toHaveAttribute("accept", "image/png,image/jpeg,image/webp");
  await expect(page.locator("#profile-avatar").locator("xpath=ancestor::form")).toHaveAttribute("enctype", "multipart/form-data");
});
