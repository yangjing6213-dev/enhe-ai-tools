import { expect, test } from "@playwright/test";

test("account menu closes on outside click and Escape without blocking inside interactions", async ({ page }) => {
  await page.goto("/redesign-preview/shell");
  const menu = page.locator(".redesign-account-menu").first();
  const trigger = menu.locator("summary");
  await trigger.click();
  await expect(menu).toHaveAttribute("open", "");
  await menu.locator(".redesign-avatar-menu").click({ position: { x: 3, y: 3 } });
  await expect(menu).toHaveAttribute("open", "");
  await page.getByRole("heading", { name: "ENHE public shell", exact: true }).click();
  await expect(menu).not.toHaveAttribute("open");
  await trigger.click();
  await page.keyboard.press("Escape");
  await expect(menu).not.toHaveAttribute("open");
  await expect(trigger).toBeFocused();
  await trigger.click();
  await trigger.click();
  await expect(menu).not.toHaveAttribute("open");
});
