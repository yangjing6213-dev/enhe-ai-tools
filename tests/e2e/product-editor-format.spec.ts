import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ context, baseURL }) => {
  test.skip(process.env.ENHE_ADMIN_VISUAL_FIXTURE !== "1", "Requires isolated read-only admin fixture.");
  await context.addCookies([{ name: "enhe_session", value: "fixture-only", url: baseURL! }]);
});

test("product copy supports insertion at the caret and preserves emoji in submitted form data", async ({ page }) => {
  await page.goto("/admin/software/local-visual-tool", { waitUntil: "networkidle" });
  const field = page.locator('textarea[name="content"]');
  await expect(field).toBeVisible();
  await field.fill("First\n\n  Second 👨‍👩‍👧‍👦");
  await field.evaluate(node => { node.focus(); (node as HTMLTextAreaElement).setSelectionRange(5, 5); });
  const root = field.locator("..");
  await root.locator("summary").click();
  await root.getByRole("button", { name: "插入 ✅", exact: true }).click();
  await expect(field).toHaveValue("First✅\n\n  Second 👨‍👩‍👧‍👦");
  expect(await field.evaluate(node => new FormData((node as HTMLTextAreaElement).form!).get("content"))).toBe("First✅\n\n  Second 👨‍👩‍👧‍👦");
  expect(await field.evaluate(node => getComputedStyle(node).fontFamily)).toContain("Segoe UI Emoji");
  const images = page.locator('input[name="existingScreenshots"]');
  expect(await images.count()).toBe(2);
  const before = await images.evaluateAll(nodes => nodes.map(node => (node as HTMLInputElement).value));
  await page.getByRole("button", { name: /上移.*2/ }).first().click();
  expect(await images.evaluateAll(nodes => nodes.map(node => (node as HTMLInputElement).value))).toEqual([...before].reverse());
  await page.locator('input[name="screenshotFiles"]').setInputFiles({ name: "invalid.txt", mimeType: "text/plain", buffer: Buffer.from("invalid") });
  expect(await page.locator('input[name="screenshotFiles"]').evaluate(node => (node as HTMLInputElement).files?.length)).toBe(0);
});

test("video uploads block premature saves and bind the finished URL", async ({ page }) => {
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/admin/tool-video-upload", async route => {
    await pending;
    await route.fulfill({ json: { videoUrl: "/uploads/local-demo.mp4", message: "Local simulated upload complete" } });
  });
  await page.goto("/admin/software/local-visual-tool", { waitUntil: "networkidle" });
  await page.locator('input[aria-label="本地上传视频 1"]').setInputFiles({ name: "local.mp4", mimeType: "video/mp4", buffer: Buffer.from("local fixture video") });
  await expect(page.locator('[aria-busy="true"]')).toBeVisible();
  expect(await page.locator(".enhe-admin-tool-editor-form").evaluate(node => node.dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true })))).toBe(false);
  release();
  await expect(page.locator('input[name="videoUrl"]')).toHaveValue("/uploads/local-demo.mp4");
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
});

test("related copy editors expose editable emoji-enabled text and bound fields", async ({ page }) => {
  for (const [route, field] of [["tutorials/local-visual-tutorial", "content"], ["faqs/local-visual-faq", "answer"], ["changelogs/local-visual-changelog", "content"]]) {
    await page.goto(`/admin/${route}`, { waitUntil: "networkidle" });
    const input = page.locator(`textarea[name="${field}"]`);
    await expect(input).toBeVisible();
    await input.fill("Hello ✅\n\n  Details 🚀");
    expect(await input.evaluate(node => new FormData((node as HTMLTextAreaElement).form!).get((node as HTMLTextAreaElement).name))).toBe("Hello ✅\n\n  Details 🚀");
    await expect(input.locator("..").locator("summary")).toContainText("插入表情");
  }
});


test("rendered card copy preserves exact text, line breaks and emoji on desktop and mobile", async ({ page }) => {
  const copy = "Hello 👩🏽‍💻\n\n  First line ✅\n    Second line 👍🏽\n\n\nhttps://example.test/download";
  const script = `import React from 'react'; import {renderToStaticMarkup} from 'react-dom/server'; import {ToolRichContent} from './src/components/tool-rich-content.tsx'; globalThis.React=React; process.stdout.write(renderToStaticMarkup(React.createElement(ToolRichContent,{content:${JSON.stringify(copy)}})));`;
  const html = execFileSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", script], { encoding: "utf8" });
  await page.goto("/admin", { waitUntil: "networkidle" });
  await page.locator("main").evaluate((node, markup) => {
    const probe = document.createElement("div");
    probe.id = "format-probe";
    probe.style.cssText = "width:100%;max-width:600px";
    probe.innerHTML = markup;
    document.body.append(probe);
  }, html);
  const text = page.locator("#format-probe .enhe-authored-text");
  expect(await text.textContent()).toBe(copy);
  await expect(text).toHaveCSS("white-space", "pre-wrap");
  await expect(text.locator("a")).toHaveAttribute("href", "https://example.test/download");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await text.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
  expect(await text.textContent()).toBe(copy);
});
