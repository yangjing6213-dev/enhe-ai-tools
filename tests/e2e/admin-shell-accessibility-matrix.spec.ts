import { expect, test } from "@playwright/test";

const widths = [320, 390, 480, 768, 1024, 1440] as const;

test("admin shell stays usable across breakpoints and accessibility modes in the local fixture", async ({
  page,
  context,
  baseURL
}) => {
  test.setTimeout(60_000);
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

    if (!(["GET", "HEAD"] as const).includes(request.method() as "GET" | "HEAD")) {
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

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/admin/settings", { waitUntil: "commit" });
  await expect(page.locator(".enhe-admin-settings-empty")).toBeVisible();
  await expect(page.locator(".admin-topbar .site-user-chip")).toBeVisible();
  await expect(page.locator(".admin-topbar .site-language-switcher a")).toHaveCount(2);
  await expect(page.locator(".admin-topbar .site-language-switcher a.is-active")).toHaveCount(1);
  await expect(page.locator(".admin-nav-link[aria-current='page']")).toHaveCount(1);
  await expect(page.locator(".enhe-admin-setting-card")).toHaveCount(0);

  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    const geometry = await page.evaluate(() => ({
      viewport: window.innerWidth,
      document: document.documentElement.scrollWidth,
      mainRight: document.querySelector("#main-content")?.getBoundingClientRect().right ?? 0
    }));

    expect(geometry.document, `document overflow at ${width}px`).toBeLessThanOrEqual(width);
    expect(geometry.mainRight, `main content outside viewport at ${width}px`).toBeLessThanOrEqual(width);
    await expect(page.locator(".enhe-admin-settings-empty")).toBeVisible();
    if (width < 640) {
      await expect(page.locator(".admin-topbar .site-user-chip")).toBeVisible();
      await expect(page.locator(".admin-topbar .site-language-switcher")).toBeVisible();
    }
  }

  await page.setViewportSize({ width: 640, height: 900 });
  await expect(page.locator(".admin-topbar .site-user-chip")).toBeVisible();
  await expect(page.locator(".admin-topbar .site-language-switcher")).toBeVisible();
  const importResponse = await page.goto("/admin/ai-news/import", { waitUntil: "load" });
  expect(importResponse?.status()).toBe(200);
  const importForm = page.locator("form.enhe-admin-content-form");
  const htmlField = page.locator('textarea[name="html"]');
  await expect(importForm).toBeVisible();
  await expect(htmlField).toBeVisible();
  await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
  const zoomGeometry = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    main: document.querySelector("#main-content")?.getBoundingClientRect().toJSON() ?? null,
    form: document.querySelector("form.enhe-admin-content-form")?.getBoundingClientRect().toJSON() ?? null,
    formScrollWidth: document.querySelector("form.enhe-admin-content-form")?.scrollWidth ?? 0,
    formClientWidth: document.querySelector("form.enhe-admin-content-form")?.clientWidth ?? 0,
    htmlField: document.querySelector('textarea[name="html"]')?.getBoundingClientRect().toJSON() ?? null
  }));
  expect(zoomGeometry.document, "200% text zoom document overflow").toBeLessThanOrEqual(zoomGeometry.viewport);
  expect(zoomGeometry.main?.left ?? -1, "200% text zoom main left boundary").toBeGreaterThanOrEqual(0);
  expect(zoomGeometry.main?.right ?? Infinity, "200% text zoom main right boundary").toBeLessThanOrEqual(zoomGeometry.viewport);
  expect(zoomGeometry.form?.left ?? -1, "200% text zoom form left boundary").toBeGreaterThanOrEqual(0);
  expect(zoomGeometry.form?.right ?? Infinity, "200% text zoom form right boundary").toBeLessThanOrEqual(zoomGeometry.viewport);
  expect(zoomGeometry.formScrollWidth, "200% text zoom form content overflow").toBeLessThanOrEqual(zoomGeometry.formClientWidth);
  expect(zoomGeometry.htmlField?.right ?? Infinity, "200% text zoom HTML field right boundary").toBeLessThanOrEqual(zoomGeometry.viewport);

  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  await page.keyboard.press("Tab");
  await expect(page.locator(".redesign-skip-link")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();

  let lightModeHtmlFieldFocused = false;
  for (let tab = 0; tab < 40; tab += 1) {
    await page.keyboard.press("Tab");
    lightModeHtmlFieldFocused = await htmlField.evaluate((element) => document.activeElement === element);
    if (lightModeHtmlFieldFocused) break;
  }
  expect(lightModeHtmlFieldFocused, "keyboard navigation reaches the HTML field in light mode").toBe(true);
  const lightModeFocusShadow = await htmlField.evaluate((element) => getComputedStyle(element).boxShadow);
  const lightModeFocusRing = lightModeFocusShadow.match(
    /color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\/\s*[\d.]+\)/,
  );
  expect(lightModeFocusRing, "the light theme uses a visible Radix blue focus ring").not.toBeNull();
  expect(Number(lightModeFocusRing?.[3])).toBeGreaterThan(Number(lightModeFocusRing?.[2]));
  expect(Number(lightModeFocusRing?.[2])).toBeGreaterThan(Number(lightModeFocusRing?.[1]));

  await page.emulateMedia({ forcedColors: "active" });
  expect(await page.evaluate(() => matchMedia("(forced-colors: active)").matches)).toBe(true);
  await expect(importForm).toBeVisible();
  await expect(htmlField).toBeVisible();
  await page.goto("/admin/ai-news/import", { waitUntil: "load" });

  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  await page.keyboard.press("Tab");
  await expect(page.locator(".redesign-skip-link")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();

  let htmlFieldFocused = false;
  for (let tab = 0; tab < 40; tab += 1) {
    await page.keyboard.press("Tab");
    htmlFieldFocused = await htmlField.evaluate((element) => document.activeElement === element);
    if (htmlFieldFocused) break;
  }
  expect(htmlFieldFocused, "keyboard navigation reaches the HTML import field").toBe(true);
  const focusIndicator = await htmlField.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      focusVisible: element.matches(":focus-visible"),
      outlineStyle: style.outlineStyle,
      outlineWidth: Number.parseFloat(style.outlineWidth),
      boxShadow: style.boxShadow
    };
  });
  expect(focusIndicator.focusVisible).toBe(true);
  expect(
    (focusIndicator.outlineStyle !== "none" && focusIndicator.outlineWidth >= 2) || focusIndicator.boxShadow !== "none",
    "keyboard-focused HTML field has a visible focus indicator"
  ).toBe(true);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/admin/plans", { waitUntil: "commit" });
  const reducedMotion = await page.locator(".enhe-admin-plans-cta").evaluate((element) =>
    getComputedStyle(element).transitionDuration
  );
  expect(reducedMotion).toBe("0s");
  await expect(page.locator(".enhe-admin-plans-disabled-card")).toBeVisible();

  await page.keyboard.press("Tab");
  await expect(page.locator(".redesign-skip-link")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
  expect(await page.evaluate(() => document.readyState)).not.toBe("loading");

  expect(externalRequests).toEqual([]);
  expect(writeRequests).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
