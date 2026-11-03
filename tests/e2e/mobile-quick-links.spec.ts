import { expect, test } from "@playwright/test";

test("mobile support opened from quick links returns keyboard focus to the launcher", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "load" });

  const launcher = page.getByRole("button", { name: "打开快捷入口", exact: true });
  await launcher.focus();
  await page.keyboard.press("Enter");
  const quickLinks = page.getByRole("navigation", { name: "快捷入口" });
  await expect(quickLinks).toBeVisible();
  await expect(quickLinks.getByRole("link", { name: "我的订单" })).toHaveAttribute("href", "/user#orders");
  await expect(quickLinks.getByRole("link", { name: "站内消息" })).toHaveAttribute("href", "/user#notifications");

  await quickLinks.getByRole("button", { name: "联系客服", exact: true }).focus();
  await page.keyboard.press("Enter");
  const supportDialog = page.getByRole("dialog", { name: "客服助手" });
  await expect(supportDialog).toBeVisible();
  await expect(launcher).toBeHidden();
  const panelFocusables = supportDialog.locator(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  );
  const focusableCount = await panelFocusables.count();
  expect(focusableCount).toBeGreaterThan(1);
  await expect(panelFocusables.first()).toBeFocused();
  for (let index = 0; index < focusableCount; index += 1) {
    await page.keyboard.press("Tab");
  }
  await expect(panelFocusables.first()).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(panelFocusables.last()).toBeFocused();

  await supportDialog.getByRole("button", { name: "如何找到适合我的产品？" }).click();
  await expect(supportDialog).toContainText("提升工作效率");
  await supportDialog.getByRole("button", { name: "返回常见问题" }).click();
  await expect(supportDialog.getByText("常见问题")).toBeVisible();
  await page.keyboard.press("Escape");

  await expect(supportDialog).toBeHidden();
  await expect(launcher).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(quickLinks).toBeVisible();
  await quickLinks.getByRole("button", { name: "联系客服", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(supportDialog).toBeVisible();
  await page.keyboard.press("Shift+Tab");
  await expect(panelFocusables.last()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(supportDialog).toBeHidden();
  await expect(launcher).toBeFocused();
});

test("mobile quick links avoid footer links while the footer is visible", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "load" });
  const launcher = page.getByRole("button", { name: "打开快捷入口", exact: true });

  await page.locator(".redesign-footer").evaluate((footer) => {
    footer.scrollIntoView({ block: "end", behavior: "instant" });
  });

  await expect.poll(async () => launcher.evaluate((button) => {
    const action = button.getBoundingClientRect();
    return [...document.querySelectorAll<HTMLElement>(
      ".redesign-footer a, .redesign-footer button, .redesign-footer summary",
    )].some((element) => {
      const bounds = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return style.display !== "none" && style.visibility !== "hidden" &&
        bounds.width > 0 && bounds.height > 0 &&
        action.left < bounds.right && action.right > bounds.left &&
        action.top < bounds.bottom && action.bottom > bounds.top;
    });
  })).toBe(false);
});
