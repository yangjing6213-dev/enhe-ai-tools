import { expect, test } from "@playwright/test";

test("user actions have white labels and empty accounts expose confirmed deletion", async ({ page, context, baseURL }) => {
  test.skip(process.env.ENHE_ADMIN_VISUAL_FIXTURE !== "1", "Requires isolated read-only fixture");
  await context.addCookies([{ name: "enhe_session", value: "fixture-only", url: baseURL! }]);
  await page.goto("/admin/users");
  const edit = page.getByRole("link", { name: "查看/编辑" }).first();
  await expect(edit).toBeVisible();
  expect(await edit.evaluate(element => getComputedStyle(element).color)).toBe("rgb(255, 255, 255)");
  await edit.click();
  for (const label of ["保存用户", "重置密码", "删除用户"]) {
    const button = page.getByRole("button", { name: label, exact: true });
    await expect(button).toBeVisible();
    expect(await button.evaluate(element => getComputedStyle(element).color)).toBe("rgb(255, 255, 255)");
  }
  const confirmation = page.locator('input[name="confirmDelete"]');
  await expect(confirmation).toHaveAttribute("required", "");
  await expect(page.getByText("0 条受保护业务记录", { exact: true })).toBeVisible();
});
