import { expect, test } from "@playwright/test";

test.use({ serviceWorkers: "block" });

test("follows the system by default and remembers a chosen theme", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  const response = await page.goto("/", { waitUntil: "load" });
  expect(response?.status()).toBe(200);
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(11, 18, 32)");

  const trigger = page.getByRole("button", { name: "Change theme" });
  await expect(trigger).toBeVisible();
  await trigger.click();
  await expect(page.getByRole("menuitemradio", { name: "System" })).toHaveAttribute("aria-checked", "true");

  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveClass(/dark/);

  await page.getByRole("menuitemradio", { name: "Light" }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await expect.poll(() => page.evaluate(() => localStorage.getItem("theme"))).toBe("light");

  await page.reload({ waitUntil: "load" });
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(page.locator(".redesign-footer")).toHaveCSS("background-color", "rgb(13, 58, 109)");
  await expect(page.locator(".redesign-footer h3").first()).toHaveCSS("color", "rgb(255, 255, 255)");
});
