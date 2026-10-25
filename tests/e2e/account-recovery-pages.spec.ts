import { expect, test } from "@playwright/test";

const token = "A".repeat(43);

test("renders the Chinese account recovery pages and confirmation steps", async ({ page }) => {
  await page.goto("/forgot-password");
  await expect(page.getByRole("heading", { name: "找回密码" })).toBeVisible();
  await expect(page.getByLabel("已验证的找回邮箱")).toBeVisible();

  await page.goto(`/reset-password?token=${token}`);
  await expect(page.getByRole("heading", { name: "设置新密码" })).toBeVisible();
  await expect(page.getByPlaceholder("新密码", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "更新密码" })).toBeVisible();

  await page.goto(`/verify-recovery-email?token=${token}`);
  await expect(page.getByRole("button", { name: "确认验证邮箱" })).toBeVisible();
});

test("renders the English account recovery pages", async ({ page }) => {
  await page.goto("/en/forgot-password");
  await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible();
  await expect(page.getByLabel("Verified recovery email")).toBeVisible();

  await page.goto(`/en/reset-password?token=${token}`);
  await expect(page.getByRole("heading", { name: "Choose a new password" })).toBeVisible();
  await expect(page.getByPlaceholder("New password", { exact: true })).toBeVisible();

  await page.goto(`/en/verify-recovery-email?token=${token}`);
  await expect(page.getByRole("button", { name: "Verify recovery email" })).toBeVisible();
});


test("links to the matching localized password recovery route from login", async ({ page }) => {
  for (const route of [
    { path: "/login", label: "忘记密码？", href: "/forgot-password" },
    { path: "/en/login", label: "Forgot password?", href: "/en/forgot-password" },
  ]) {
    await page.goto(route.path);
    await expect(page.getByRole("link", { name: route.label })).toHaveAttribute("href", route.href);
  }
});
