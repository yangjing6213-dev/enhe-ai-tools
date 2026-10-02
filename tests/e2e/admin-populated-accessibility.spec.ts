import { expect, test, type Locator, type Page } from "@playwright/test";

const browserErrors = new WeakMap<Page, string[]>();

async function contrast(locator: Locator) {
  return locator.evaluate((element) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Color measurement requires a canvas context.");
    const rgba = (value: string) => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = value;
      context.fillRect(0, 0, 1, 1);
      const values = context.getImageData(0, 0, 1, 1).data;
      return [values[0], values[1], values[2], values[3] / 255];
    };
    let background = [255, 255, 255];
    const ancestors: Element[] = [];
    for (let node: Element | null = element; node; node = node.parentElement) ancestors.unshift(node);
    for (const node of ancestors) {
      const color = rgba(getComputedStyle(node).backgroundColor);
      background = background.map((channel, index) => color[index] * color[3] + channel * (1 - color[3]));
    }
    const foreground = rgba(getComputedStyle(element).color);
    const luminance = (rgb: number[]) => rgb.slice(0, 3).map((value) => {
      const channel = value / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    }).reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
    const light = luminance(foreground), dark = luminance(background);
    return (Math.max(light, dark) + 0.05) / (Math.min(light, dark) + 0.05);
  });
}

async function expectMainContentContained(page: Page, width: number) {
  const geometry = await page.evaluate(() => {
    const main = document.querySelector("#main-content");
    if (!main) throw new Error("Expected the admin main content region.");
    const rect = main.getBoundingClientRect();
    return {
      viewport: window.innerWidth,
      document: document.documentElement.scrollWidth,
      mainLeft: rect.left,
      mainRight: rect.right,
      mainClientWidth: main.clientWidth,
      mainScrollWidth: main.scrollWidth
    };
  });

  expect(geometry.viewport).toBe(width);
  expect(geometry.document).toBeLessThanOrEqual(width);
  expect(geometry.mainLeft).toBeGreaterThanOrEqual(0);
  expect(geometry.mainRight).toBeLessThanOrEqual(width);
  expect(geometry.mainScrollWidth).toBeLessThanOrEqual(geometry.mainClientWidth);
}

test.beforeEach(async ({ page, context, baseURL }) => {
  if (!baseURL) throw new Error("Local fixture URL required.");
  if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(baseURL).hostname)) {
    throw new Error("Admin fixtures must use a loopback host.");
  }
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await context.addCookies([{ name: "enhe_session", value: "fixture-only", url: baseURL }]);
  await page.route("**/*", async (route) => {
    const request = route.request();
    if (new URL(request.url()).origin !== baseURL || !["GET", "HEAD"].includes(request.method())) {
      await route.abort();
      throw new Error(`Unexpected request during read-only fixture check: ${request.method()} ${new URL(request.url()).pathname}`);
    }
    await route.continue();
  });
});

test.afterEach(async ({ page }) => {
  expect(browserErrors.get(page)).toEqual([]);
  browserErrors.delete(page);
});

test("Product image labels and reorder controls stay readable with saved images", async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  await page.goto("/admin/software/local-visual-tool", { waitUntil: "load" });
  const images = page.locator('input[name="existingScreenshots"]');
  await expect(images).toHaveCount(2);
  const cards = page.locator('div.group').filter({ has: images });
  await expect(cards).toHaveCount(2);
  for (const width of [1440, 1280, 1024, 768, 480, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const label of await cards.locator("span.absolute").all()) expect.soft(await contrast(label)).toBeGreaterThanOrEqual(4.5);
    for (const button of await cards.locator("button:enabled").all()) expect.soft(await contrast(button)).toBeGreaterThanOrEqual(3);
    await expectMainContentContained(page, width);
  }
  const originalFirst = await images.nth(0).inputValue();
  await cards.nth(0).locator("button:enabled").click();
  await expect(images.nth(1)).toHaveValue(originalFirst);
  await cards.first().screenshot({ path: testInfo.outputPath("image-controls-mobile.png") });
});

test("SEO run error, failed status, and high finding have readable warning labels", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/admin/seo-audit/local-visual-seo-run?error=LOCAL_FIXTURE", { waitUntil: "load" });
  await expect(page.locator("#main-content h1")).toHaveText("SEO/GEO 巡检详情");
  for (const width of [1440, 1280, 1024, 768, 480, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const label of [page.getByText("操作未完成：", { exact: false }), page.getByText("失败", { exact: true }), page.getByText("high", { exact: true })]) {
      await expect(label).toBeVisible();
      expect.soft(await contrast(label)).toBeGreaterThanOrEqual(4.5);
    }
    await expectMainContentContained(page, width);
  }
});

test("Skill package picker shows focus on its visible label without uploading", async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  await page.goto("/admin/ai-skills/new", { waitUntil: "load" });
  const input = page.locator('input[type="file"][accept*=".zip"]');
  const label = input.locator("..");
  await input.focus();
  await expect(input).toBeFocused();
  const focus = await label.evaluate((element) => {
    const style = getComputedStyle(element);
    return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
  });
  expect(focus.style).not.toBe("none");
  expect(focus.width).toBeGreaterThanOrEqual(2);
  await label.locator("..").screenshot({ path: testInfo.outputPath("package-picker-focus.png") });
});

test("Skill package picker announces upload progress with a local-only response", async ({ page, baseURL }) => {
  test.setTimeout(60_000);
  if (!baseURL) throw new Error("Local fixture URL required.");
  const fixtureOrigin = new URL(baseURL).origin;
  let uploadRequests = 0;
  let announceUploadStarted!: () => void;
  let releaseUploadResponse!: () => void;
  const uploadStarted = new Promise<void>((resolve) => { announceUploadStarted = resolve; });
  const holdUploadResponse = new Promise<void>((resolve) => { releaseUploadResponse = resolve; });

  await page.route("**/api/admin/ai-skill-upload", async (route) => {
    const request = route.request();
    const requestUrl = new URL(request.url());
    if (requestUrl.origin !== fixtureOrigin || request.method() !== "POST") {
      await route.abort();
      throw new Error(`Unexpected upload fixture request: ${request.method()} ${requestUrl.pathname}`);
    }
    uploadRequests += 1;
    announceUploadStarted();
    await holdUploadResponse;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: "local-only-fixture", fileName: "local-only-fixture.zip" }),
    });
  });

  await page.goto("/admin/ai-skills/new", { waitUntil: "load" });
  const input = page.locator('input[type="file"][accept*=".zip"]');
  const picker = input.locator("..");
  const status = page.locator('p[aria-live="polite"]');

  try {
    await input.setInputFiles({
      name: "local-only-fixture.zip",
      mimeType: "application/zip",
      buffer: Buffer.from("synthetic local fixture"),
    });
    await uploadStarted;
    await expect(picker).toContainText("正在上传...");
    await expect(input).toBeDisabled();
    await expect(status).toHaveText("正在上传...");

    releaseUploadResponse();
    await expect(status).toHaveText("已上传");
    await expect(input).toBeEnabled();
    await expect(page.getByText("local-only-fixture.zip", { exact: true })).toBeVisible();
    expect(uploadRequests).toBe(1);
  } finally {
    releaseUploadResponse();
  }
});

test("Files storage configuration notice is readable on desktop and mobile", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/admin/files", { waitUntil: "load" });
  const notice = page.getByText("COS 未启用，缺少：", { exact: false });
  await expect(page.locator('select[name="toolId"] option[value="local-visual-tool"]')).toHaveCount(0);
  for (const width of [1440, 1280, 1024, 768, 480, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(notice).toBeVisible();
    expect.soft(await contrast(notice)).toBeGreaterThanOrEqual(4.5);
    await expectMainContentContained(page, width);
  }
});
