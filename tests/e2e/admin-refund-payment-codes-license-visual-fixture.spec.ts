import { expect, test } from "@playwright/test";

test("refund, payment-code, and license screens stay contained and read-only in the local fixture", async ({ page, context, baseURL }) => {
  test.setTimeout(90_000);
  if (!baseURL) throw new Error("The local visual fixture requires an explicit base URL.");

  const externalRequests: string[] = [];
  const writeRequests: string[] = [];
  const localDevDiagnostics: string[] = [];
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];

  await context.addCookies([{ name: "enhe_session", value: "fixture-only", url: baseURL }]);
  await page.route("**/*", async (route) => {
    const requestUrl = new URL(route.request().url());
    if (
      requestUrl.origin === baseURL &&
      route.request().method() === "POST" &&
      requestUrl.pathname === "/__nextjs_original-stack-frames"
    ) {
      localDevDiagnostics.push(requestUrl.pathname);
      await route.continue();
      return;
    }
    if (!["GET", "HEAD"].includes(route.request().method())) {
      writeRequests.push(`${route.request().method()} ${route.request().url()}`);
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

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/admin/refunds", { waitUntil: "load" });
  await expect(page.locator(".enhe-admin-refund-filter-form")).toBeVisible();
  await expect(page.locator(".enhe-admin-refund-records")).toBeVisible();
  await expect(page.locator(".enhe-admin-refund-empty")).toBeVisible();
  await expect(page.locator(".admin-nav-link[aria-current='page']")).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.goto("/admin/refunds/local-visual-refund", { waitUntil: "load" });
  await expect(page.locator(".enhe-admin-refund-summary-card")).toContainText("LOCAL-VISUAL-ORDER");
  await expect(page.locator(".enhe-admin-refund-summary-card")).toContainText("visual-user@localhost.invalid");
  await expect(page.locator(".enhe-admin-refund-entitlement-warning")).toBeVisible();
  await expect(page.locator(".enhe-admin-refund-action-form input[name='refundConfirmation']")).toBeVisible();
  await expect(page.locator(".enhe-admin-refund-action-form button[name='status']")).toHaveCount(2);
  await expect(page.locator(".admin-nav-link[aria-current='page']")).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.goto("/admin/payment-codes", { waitUntil: "load" });
  await expect(page.locator(".enhe-admin-payment-codes-form")).toBeVisible();
  await expect(page.locator(".enhe-admin-payment-code-editor")).toHaveCount(2);
  await expect(page.locator(".enhe-admin-payment-codes-form input[name='alipayQr']")).toHaveValue("Local visual fixture only");
  await expect(page.locator(".enhe-admin-payment-codes-form input[name='wechatQr']")).toHaveValue("Local visual fixture only");
  await expect(page.locator(".enhe-admin-payment-codes-form input[type='file']")).toHaveCount(2);
  await expect(page.locator(".enhe-admin-payment-codes-form img")).toHaveCount(0);
  expect(await page.locator(".enhe-admin-payment-codes-hint").evaluate((hint) => getComputedStyle(hint).color)).toBe("rgb(112, 72, 8)");
  const paymentSaveColors = await page.locator(".enhe-admin-payment-codes-form button[type='submit']").evaluate((button) => {
    const style = getComputedStyle(button);
    return { color: style.color, backgroundColor: style.backgroundColor };
  });
  expect(paymentSaveColors.color).toBe("rgb(255, 255, 255)");
  expect(paymentSaveColors.backgroundColor).not.toBe("rgb(0, 0, 0)");
  await expect(page.locator(".admin-nav-link[aria-current='page']")).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.goto("/admin/license-generator", { waitUntil: "load" });
  await expect(page.locator(".enhe-admin-license-generator-form")).toBeVisible();
  await expect(page.locator(".enhe-admin-license-generator-output textarea[readonly]")).toBeVisible();
  await expect(page.locator(".enhe-admin-license-generator-form select[name='licenseProduct']")).toBeVisible();
  const machineButtonColor = await page.locator(".enhe-admin-license-generator-form button[type='button']").evaluate((button) => getComputedStyle(button).color);
  expect(machineButtonColor).not.toBe("rgb(255, 255, 255)");
  await expect(page.locator(".admin-nav-link[aria-current='page']")).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.setViewportSize({ width: 320, height: 844 });
  const refunds320 = await page.goto("/admin/refunds", { waitUntil: "load" });
  expect(refunds320?.status()).toBe(200);
  await expect(page.locator(".enhe-admin-refund-filter-form")).toBeVisible();
  await expect(page.locator(".enhe-admin-refund-records")).toBeVisible();
  expect(await page.locator(".enhe-admin-refund-records").evaluate((records) => records.scrollWidth > records.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  const refundDetail320 = await page.goto("/admin/refunds/local-visual-refund", { waitUntil: "load" });
  expect(refundDetail320?.status()).toBe(200);
  await expect(page.locator(".enhe-admin-refund-action-form")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  const paymentCodes320 = await page.goto("/admin/payment-codes", { waitUntil: "load" });
  expect(paymentCodes320?.status()).toBe(200);
  await expect(page.locator(".enhe-admin-payment-codes-form")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  const licenseGenerator320 = await page.goto("/admin/license-generator", { waitUntil: "load" });
  expect(licenseGenerator320?.status()).toBe(200);
  await expect(page.locator(".enhe-admin-license-generator-form")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of [
    "/admin/refunds",
    "/admin/refunds/local-visual-refund",
    "/admin/payment-codes",
    "/admin/license-generator"
  ]) {
    await page.goto(route, { waitUntil: "load" });
    await expect(page.locator(".enhe-admin-content-management")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await page.goto("/admin/refunds", { waitUntil: "load" });
  await expect(page.locator(".enhe-admin-refund-records")).toBeVisible();
  expect(await page.locator(".enhe-admin-refund-records").evaluate((records) => records.scrollWidth > records.clientWidth)).toBe(true);

  const breakpointRoutes = [
    ["/admin/refunds", ".enhe-admin-refund-records"],
    ["/admin/refunds/local-visual-refund", ".enhe-admin-refund-action-form"],
    ["/admin/payment-codes", ".enhe-admin-payment-codes-form"],
    ["/admin/license-generator", ".enhe-admin-license-generator-form"]
  ] as const;
  for (const width of [480, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [route, surface] of breakpointRoutes) {
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
  expect(writeRequests).toEqual([]);
  expect(localDevDiagnostics.every((pathname) => pathname === "/__nextjs_original-stack-frames")).toBe(true);
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
