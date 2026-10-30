import { expect, test } from "@playwright/test";

for (const path of ["/software", "/en/software"]) {
  test(`emoji insertion stays inside opted-in comment fields on ${path}`, async ({ page }) => {
    await page.goto(path, { waitUntil: "load" });
    const picker = page.getByRole("button", { name: "插入表情", exact: true });
    await page.getByRole("combobox").first().fill("AI");
    await expect(picker).toHaveCount(0);

    // Exercise the real provider without creating accounts, posts or reviews.
    // Server-rendering tests separately verify opt-ins on the real forms.
    await page.locator("main").evaluate((main) => {
      const form = document.createElement("form");
      form.dataset.testid = "emoji-scope-fixture";
      for (const [name, enabled] of [["Topic comment", true], ["Nested reply", true], ["Product review", true], ["Topic body", false], ["Support message", false]] as const) {
        const label = document.createElement("label");
        label.textContent = name;
        const input = document.createElement("textarea");
        input.name = "content";
        input.maxLength = 1000;
        if (enabled) input.dataset.emojiPicker = "on";
        label.append(input);
        form.append(label);
      }
      const label = document.createElement("label");
      label.textContent = "Account name";
      const input = document.createElement("input");
      input.name = "nickname";
      label.append(input);
      form.append(label);
      main.prepend(form);
    });

    for (const label of ["Topic comment", "Nested reply", "Product review"]) {
      const field = page.getByLabel(label, { exact: true });
      await field.fill("ab");
      await field.evaluate((node: HTMLTextAreaElement) => node.setSelectionRange(1, 1));
      await expect(picker).toBeVisible();
      await picker.click();
      await page.getByRole("button", { name: "插入出发表情", exact: true }).click();
      await expect(field).toHaveValue("a:enhe_01:b");
      await expect(field).toBeFocused();

      // A disallowed input must remove the previous field's picker immediately.
      await page.getByLabel("Account name", { exact: true }).fill("name");
      await expect(picker).toHaveCount(0);
    }

    for (const label of ["Topic body", "Support message"]) {
      await page.getByLabel(label, { exact: true }).fill("Draft content");
      await expect(picker).toHaveCount(0);
    }
    await page.getByTestId("emoji-scope-fixture").evaluate(node => node.remove());
  });
}
