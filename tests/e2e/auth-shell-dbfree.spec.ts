import { expect, test } from "@playwright/test";

const routes = [
  { path: "/login", locale: "zh", title: "登录", kind: "login" },
  { path: "/register", locale: "zh", title: "注册", kind: "register" },
  { path: "/en/login", locale: "en", title: "Log in", kind: "login" },
  { path: "/en/register", locale: "en", title: "Sign up", kind: "register" }
] as const;

for (const route of routes) {
  for (const width of [320, 390]) {
    test(`${route.path} has a usable DB-free auth shell at ${width}px`, async ({ page, baseURL }) => {
      if (process.env.DATABASE_URL?.trim()) throw new Error("Auth shell checks require an unset DATABASE_URL.");
      if (!baseURL || !["localhost", "127.0.0.1", "[::1]"].includes(new URL(baseURL).hostname)) {
        throw new Error("Auth shell checks require a local base URL.");
      }

      const externalRequests: string[] = [];
      const writeRequests: string[] = [];
      const pageErrors: string[] = [];
      const consoleErrors: string[] = [];
      await page.route("**/*", async (requestRoute) => {
        const request = requestRoute.request();
        const requestUrl = new URL(request.url());
        if (requestUrl.origin !== new URL(baseURL).origin) {
          externalRequests.push(requestUrl.origin);
          await requestRoute.abort();
          return;
        }
        if (!["GET", "HEAD"].includes(request.method())) {
          writeRequests.push(`${request.method()} ${requestUrl.pathname}`);
          await requestRoute.abort();
          return;
        }
        await requestRoute.continue();
      });
      page.on("pageerror", (error) => pageErrors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });

      await page.setViewportSize({ width, height: 844 });
      const response = await page.goto(route.path, { waitUntil: "load" });
      expect(response?.status()).toBe(200);
      const form = page.locator(".enhe-auth-page form");
      await expect(form).toBeVisible();
      await expect(form.getByRole("heading", { level: 1 })).toHaveText(route.title);
      const account = form.getByLabel(route.locale === "en" ? "Account" : "账号", { exact: true });
      const password = form.getByLabel(route.locale === "en" ? "Password" : "密码", { exact: true });
      await expect(account).toBeVisible();
      await expect(account).toHaveAttribute("type", "email");
      await expect(password).toBeVisible();
      await expect(password).toHaveAttribute("type", "password");

      await form.getByRole("button", { name: route.locale === "en" ? "Show password" : "显示密码", exact: true }).click();
      await expect(password).toHaveAttribute("type", "text");
      await form.getByRole("button", { name: route.locale === "en" ? "Hide password" : "隐藏密码", exact: true }).click();
      await expect(password).toHaveAttribute("type", "password");
      if (route.kind === "register") {
        await expect(form.getByLabel(route.locale === "en" ? "Email" : "邮箱", { exact: true })).toBeVisible();
      }
      const submitButton = form.locator("button[type='submit']");
      await expect(submitButton).toBeVisible();
      await expect(submitButton).toHaveText(
        route.kind === "login" ? route.title : route.locale === "en" ? "Create account" : "创建账号"
      );

      const visibleFields = form.locator("input:not([type='hidden']), button");
      for (const field of await visibleFields.all()) {
        const box = await field.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      expect(externalRequests).toEqual([]);
      expect(writeRequests).toEqual([]);
      expect(pageErrors).toEqual([]);
      expect(consoleErrors).toEqual([]);
    });
  }
}
