import { expect, test } from "@playwright/test";

test("shows the topic save confirmation after returning to the editor", async ({ page, context, baseURL }) => {
  test.skip(process.env.ENHE_ADMIN_VISUAL_FIXTURE !== "1", "Requires the read-only local admin fixture.");
  if (!baseURL) throw new Error("The local visual fixture requires an explicit base URL.");
  await context.addCookies([{ name: "enhe_session", value: "fixture-only", url: baseURL }]);
  await page.goto("/admin/forum/local-visual-forum-post/edit?saved=1", { waitUntil: "load" });
  await expect(page.getByRole("status").filter({ hasText: "话题修改已保存。" })).toBeVisible();
  await expect(page.getByRole("button", { name: "保存修改" })).toBeVisible();
});
