import { expect, test } from "@playwright/test";

test("Order and payment review routes stay contained and read-only in the local fixture", async ({ page, context, baseURL }) => {
  test.setTimeout(90_000);
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
  await page.goto("/admin/orders", { waitUntil: "commit" });
  await expect(page.locator(".enhe-admin-order-filter-form")).toBeVisible();
  await expect(page.locator(".enhe-admin-commerce-records")).toBeVisible();
  await expect(page.locator(".admin-nav-link[aria-current='page']")).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.goto("/admin/payments", { waitUntil: "commit" });
  await expect(page.locator("#main-content h1")).toContainText("支付审核");
  await expect(page.locator(".enhe-admin-commerce-records")).toBeVisible();
  await expect(page.locator(".admin-nav-link[aria-current='page']")).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.goto("/admin/orders/local-visual-order", { waitUntil: "load" });
  await expect(page.locator(".enhe-admin-order-summary-card")).toContainText("LOCAL-VISUAL-ORDER");
  await expect(page.locator(".enhe-admin-order-summary-card")).toContainText("visual-user@localhost.invalid");
  await expect(page.locator(".enhe-admin-order-danger-panel")).toContainText("不可硬删除");
  await expect(page.locator(".admin-nav-link[aria-current='page']")).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.goto("/admin/payments/local-visual-proof", { waitUntil: "commit" });
  await expect(page.locator(".enhe-admin-payment-summary-card")).toContainText("LOCAL-VISUAL-ORDER");
  await expect(page.locator(".enhe-admin-payment-review-form input[name='reviewNote']")).toBeVisible();
  await expect(page.locator(".enhe-admin-payment-review-form button[name='decision']")).toHaveCount(2);
  await expect(page.locator(".enhe-admin-payment-preview")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.setViewportSize({ width: 320, height: 844 });
  const orders320 = await page.goto("/admin/orders", { waitUntil: "load" });
  expect(orders320?.status()).toBe(200);
  await expect(page.locator(".enhe-admin-order-filter-form")).toBeVisible();
  await expect(page.locator(".enhe-admin-commerce-records")).toBeVisible();
  expect(await page.locator(".enhe-admin-commerce-records").evaluate((table) => table.scrollWidth > table.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  const payments320 = await page.goto("/admin/payments", { waitUntil: "load" });
  expect(payments320?.status()).toBe(200);
  await expect(page.locator(".enhe-admin-commerce-records")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  const orderDetail320 = await page.goto("/admin/orders/local-visual-order", { waitUntil: "load" });
  expect(orderDetail320?.status()).toBe(200);
  await expect(page.locator(".enhe-admin-order-update-form")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  const paymentDetail320 = await page.goto("/admin/payments/local-visual-proof", { waitUntil: "load" });
  expect(paymentDetail320?.status()).toBe(200);
  await expect(page.locator(".enhe-admin-payment-review-form")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin/orders", { waitUntil: "load" });
  await expect(page.locator(".enhe-admin-commerce-records")).toBeVisible();
  expect(await page.locator(".enhe-admin-commerce-records").evaluate((table) => table.scrollWidth > table.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.goto("/admin/payments", { waitUntil: "load" });
  await expect(page.locator("#main-content h1")).toContainText("支付审核");
  await expect(page.locator(".enhe-admin-commerce-records")).toBeVisible();
  const paymentListGeometry = await page.locator(".enhe-admin-commerce-records").evaluate((table) => {
    const heading = table.querySelector<HTMLElement>(".enhe-admin-commerce-table-heading");
    const rows = table.querySelector<HTMLElement>(".enhe-admin-commerce-record-rows");
    return {
      viewport: window.innerWidth,
      document: document.documentElement.scrollWidth,
      container: { clientWidth: table.clientWidth, scrollWidth: table.scrollWidth, overflowX: getComputedStyle(table).overflowX },
      heading: heading ? { clientWidth: heading.clientWidth, scrollWidth: heading.scrollWidth, minWidth: getComputedStyle(heading).minWidth } : null,
      rows: rows ? { clientWidth: rows.clientWidth, scrollWidth: rows.scrollWidth, minWidth: getComputedStyle(rows).minWidth } : null
    };
  });
  expect(paymentListGeometry.container.scrollWidth, JSON.stringify(paymentListGeometry)).toBeGreaterThan(paymentListGeometry.container.clientWidth);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.goto("/admin/orders/local-visual-order", { waitUntil: "load" });
  await expect(page.locator(".enhe-admin-order-update-form")).toBeVisible();
  const orderDetailGeometry = await page.evaluate(() => ({
    viewport: window.innerWidth,
    html: { clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth },
    body: { clientWidth: document.body.clientWidth, scrollWidth: document.body.scrollWidth },
    overflowers: [...document.body.querySelectorAll<HTMLElement>("*")]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName.toLowerCase(),
          className: typeof element.className === "string" ? element.className : "",
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          scrollWidth: element.scrollWidth,
          clientWidth: element.clientWidth,
          overflowX: getComputedStyle(element).overflowX,
          overflowWrap: getComputedStyle(element).overflowWrap,
          whiteSpace: getComputedStyle(element).whiteSpace,
          display: getComputedStyle(element).display,
          text: (element.innerText ?? "").slice(0, 100)
        };
      })
      .filter((element) => element.right > window.innerWidth + 1 || element.scrollWidth > element.clientWidth + 1)
      .sort((left, right) => right.scrollWidth - right.clientWidth - (left.scrollWidth - left.clientWidth))
      .slice(0, 10)
  }));
  expect(orderDetailGeometry.html.scrollWidth, JSON.stringify(orderDetailGeometry)).toBeLessThanOrEqual(orderDetailGeometry.viewport);

  await page.goto("/admin/payments/local-visual-proof", { waitUntil: "commit" });
  await expect(page.locator(".enhe-admin-payment-review-form")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  const breakpointRoutes = [
    ["/admin/orders", ".enhe-admin-order-filter-form"],
    ["/admin/payments", ".enhe-admin-commerce-records"],
    ["/admin/orders/local-visual-order", ".enhe-admin-order-update-form"],
    ["/admin/payments/local-visual-proof", ".enhe-admin-payment-review-form"]
  ] as const;
  for (const width of [480, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [route, surface] of breakpointRoutes) {
      const response = await page.goto(route, { waitUntil: "load" });
      expect(response?.status(), `${route} at ${width}px`).toBe(200);
      await expect(page.locator(".enhe-admin-shell")).toBeVisible();
      await expect(page.locator("#main-content h1")).toBeVisible();
      await expect(page.locator(surface)).toBeVisible();
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
