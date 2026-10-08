import { expect, test } from "@playwright/test";

test.use({ serviceWorkers: "block" });

test("site pages keep white surfaces and black neutral text, including interactive states", async ({ page }) => {
  test.setTimeout(90_000);
  if (process.env.DATABASE_URL?.trim()) {
    throw new Error("The sitewide color check requires an unset DATABASE_URL.");
  }

  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  const response = await page.goto("/", { waitUntil: "load" });
  expect(response?.status()).toBe(200);

  const homeColors = await page.evaluate(() => {
    const main = document.querySelector<HTMLElement>("main");
    const card = document.querySelector<HTMLElement>(".redesign-home-feature-card");
    const action = document.querySelector<HTMLElement>(".redesign-home-cta");
    const eyebrow = document.querySelector<HTMLElement>(".redesign-home-products-eyebrow");
    if (!main || !card || !action || !eyebrow) throw new Error("The homepage main area, feature cards, eyebrow, and call to action must render.");
    const root = getComputedStyle(document.documentElement);
    return {
      page: getComputedStyle(document.body).backgroundColor,
      main: getComputedStyle(main).backgroundColor,
      card: getComputedStyle(card).backgroundColor,
      foreground: root.getPropertyValue("--enhe-text").trim(),
      muted: root.getPropertyValue("--enhe-text-muted").trim(),
      mainText: getComputedStyle(main).color,
      actionText: getComputedStyle(action).color,
      eyebrowText: getComputedStyle(eyebrow).color,
    };
  });
  expect(homeColors).toMatchObject({
    page: "rgb(255, 255, 255)",
    main: "rgb(255, 255, 255)",
    card: "rgb(255, 255, 255)",
    foreground: "#000",
    muted: "#000",
    mainText: "rgb(0, 0, 0)",
    actionText: "rgb(0, 0, 0)",
    eyebrowText: "rgb(0, 102, 204)",
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".redesign-menu-trigger").click();
  const mobileMenu = page.locator(".redesign-mobile-drawer");
  await expect(mobileMenu).toBeVisible();
  await expect(mobileMenu.locator(".theme-toggle")).toHaveCount(0);
  await page.locator(".redesign-drawer-close").click();
  await page.evaluate(() => {
    const button = document.createElement("a");
    button.className = "mobile-nav-user-center";
    button.dataset.sitewideColorProbe = "true";
    button.textContent = "User center";
    button.style.position = "fixed";
    button.style.top = "0";
    button.style.left = "0";
    button.style.zIndex = "9999";
    document.body.append(button);
  });
  const mobileUserAction = page.locator("[data-sitewide-color-probe='true']");
  await mobileUserAction.hover();
  await expect(mobileUserAction).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(mobileUserAction).toHaveCSS("color", "rgb(0, 0, 0)");

  const newsResponse = await page.goto("/ai-news", { waitUntil: "load" });
  expect(newsResponse?.status()).toBe(200);
  const newsColors = await page.locator("main.ai-news-page").evaluate((main) => ({
    background: getComputedStyle(main).backgroundColor,
    color: getComputedStyle(main).color,
  }));
  expect(newsColors).toEqual({ background: "rgb(255, 255, 255)", color: "rgb(0, 0, 0)" });

  const softwareResponse = await page.goto("/redesign-preview/software", { waitUntil: "load" });
  expect(softwareResponse?.status()).toBe(200);
  const categoryTrigger = page.locator(".redesign-software-category-trigger");
  await categoryTrigger.focus();
  await categoryTrigger.press("Enter");
  const categoryOption = page.locator(".redesign-software-category-button").first();
  const categoryClose = page.locator('[data-category-close="true"]');
  await expect(categoryOption).toBeVisible();
  const softwareControls = await page.evaluate(() => {
    const option = document.querySelector<HTMLElement>(".redesign-software-category-button");
    const unselectedOption = document.querySelector<HTMLElement>(".redesign-software-category-button:not([data-selected='true'])");
    const close = document.querySelector<HTMLElement>('[data-category-close="true"]');
    if (!option || !unselectedOption || !close) throw new Error("The software category controls must render.");
    return {
      primaryForeground: getComputedStyle(document.documentElement).getPropertyValue("--primary-foreground").trim(),
      optionText: getComputedStyle(option).color,
      optionSelected: option.dataset.selected,
      optionBorder: getComputedStyle(unselectedOption).borderColor,
      closeText: getComputedStyle(close).color,
      closeBorder: getComputedStyle(close).borderColor,
    };
  });
  expect(softwareControls.optionText, JSON.stringify(softwareControls)).toBe("rgb(0, 0, 0)");
  expect(softwareControls.optionBorder).toBe("rgb(118, 118, 118)");
  expect(softwareControls.closeText).toBe("rgb(0, 0, 0)");
  expect(softwareControls.closeBorder).toBe("rgb(118, 118, 118)");

  const byoxResponse = await page.goto("/build-your-own-x", { waitUntil: "load" });
  expect(byoxResponse?.status()).toBe(200);
  const codeSample = await page.locator(".byox-prompt-card").evaluate((card) => {
    const sample = document.createElement("pre");
    sample.textContent = "const readable = true;";
    card.append(sample);
    return {
      background: getComputedStyle(sample).backgroundColor,
      color: getComputedStyle(sample).color,
    };
  });
  expect(codeSample).toEqual({ background: "rgb(255, 255, 255)", color: "rgb(0, 0, 0)" });
});
