import { randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";
import { hashSessionToken, signSessionCookieValue } from "../../src/lib/auth-security";
import { deleteStoredLocalFileIfSafe, isCosStorageConfigured } from "../../src/lib/storage";

const enabled = process.env.ENHE_E2E_ALLOW_DATABASE_MUTATION === "1" && Boolean(process.env.DATABASE_URL);
test.skip(!enabled, "Requires an explicitly enabled local test database.");
if (enabled) {
  if (isCosStorageConfigured()) throw new Error("News media integration checks require local file storage.");
  const url = new URL(process.env.DATABASE_URL!);
  const name = decodeURIComponent(url.pathname.slice(1));
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || !/(?:^|[_-])(test|e2e)(?:[_-]|$)/i.test(name) || /(?:^|[_-])(prod|production|live)(?:[_-]|$)/i.test(name)) {
    throw new Error("AI news editor checks require a dedicated local test/e2e database.");
  }
}

const db = new PrismaClient();
const userId = `news-rich-text-e2e-${randomUUID()}`;
const videoName = `${userId}.mp4`;
const imageName = `${userId}.webp`;
let cookie = "";

test.beforeAll(async () => {
  if (!enabled) return;
  await db.user.create({ data: { id: userId, nickname: "Local news editor", passwordHash: "unused-test-only", role: "admin", isTestData: true } });
  const token = randomBytes(32).toString("hex");
  const session = await db.session.create({ data: { userId, tokenHash: hashSessionToken(token), expiresAt: new Date(Date.now() + 3_600_000) } });
  cookie = signSessionCookieValue(session.id, token, process.env.AUTH_SECRET!);
});

test.afterAll(async () => {
  if (!enabled) return;
  try {
    await db.newsArticle.deleteMany({ where: { id: userId } });
    const files = await db.file.findMany({ where: { fileName: { in: [imageName, videoName] } } });
    for (const file of files) {
      if (file.fileUrl?.startsWith("/uploads/")) await deleteStoredLocalFileIfSafe(file.filePath);
      await db.file.delete({ where: { id: file.id } });
    }
    await db.session.deleteMany({ where: { userId } });
    await db.user.deleteMany({ where: { id: userId, isTestData: true } });
  } finally {
    await db.$disconnect();
  }
});

test("AI news editor exposes the same text formatting tools as forum topics", async ({ browser, baseURL }) => {
  if (!baseURL) throw new Error("Local test server URL is required.");
  const context = await browser.newContext();
  try {
    await context.addCookies([{ name: "enhe_session", value: cookie, url: baseURL }]);
    const page = await context.newPage();
    await page.goto("/admin/ai-news/new");
    await expect(page.getByRole("heading", { name: "新增 AI 资讯", exact: true })).toBeVisible();

    const content = page.locator('textarea[name="content"]');
    await content.fill("AI资讯加粗");
    await content.selectText();
    await page.getByRole("button", { name: "加粗", exact: true }).click();
    await expect(content).toHaveValue("**AI资讯加粗**");

    await content.fill("AI资讯字号");
    await content.selectText();
    await page.getByRole("combobox", { name: "字体大小", exact: true }).selectOption("24");
    await expect(content).toHaveValue("[[size=24]]AI资讯字号[[/size]]");

    await content.fill("AI资讯背景");
    await content.selectText();
    await page.getByRole("combobox", { name: "文字背景", exact: true }).selectOption("#dbeafe");
    await expect(content).toHaveValue("[[bg=#dbeafe]]AI资讯背景[[/bg]]");

    page.once("dialog", (dialog) => void dialog.accept("https://example.com/source"));
    await content.fill("来源链接");
    await content.selectText();
    await page.getByRole("button", { name: "超链接", exact: true }).click();
    await expect(content).toHaveValue("[来源链接](https://example.com/source)");

    await content.fill("代码片段");
    await content.selectText();
    await page.getByRole("button", { name: "代码块", exact: true }).click();
    await expect(content).toHaveValue("```\n代码片段\n```");
    const enContent = page.getByRole("textbox", { name: "English content", exact: true });
    const englishStart = "In this local demonstration, readers can watch the process unfold in a short example. ";
    const englishEnd = "The notes after this video explain the final result and how to follow each step at home.";
    for (const [editor, start, end, label, fileName, mimeType, filePath, marker] of [
      [content, "配图前的段落。", "配图后的段落。", "插入图片或视频", imageName, "image/webp", "public/images/home/flowing-menu/productivity.webp", "!["],
      [enContent, englishStart, englishEnd, "Insert image or video", videoName, "video/mp4", "tests/fixtures/forum-media-video.mp4", "!video["],
    ] as const) {
      await editor.fill(start + end);
      await editor.evaluate((field, offset) => (field as HTMLTextAreaElement).setSelectionRange(offset, offset), start.length);
      const upload = page.waitForResponse((response) => response.url().endsWith("/api/admin/upload") && response.request().method() === "POST");
      await page.getByLabel(label, { exact: true }).setInputFiles({ name: fileName, mimeType, buffer: await readFile(resolve(filePath)) });
      const uploaded = await upload;
      expect(uploaded.ok(), await uploaded.text()).toBe(true);
      const result = await uploaded.json();
      await expect(editor).toHaveValue(`${start}\n\n${marker}${fileName}](${result.fileUrl})\n\n${end}`);
      const media = await context.request.get(new URL(`/api${result.fileUrl}`, baseURL).href);
      expect(media.ok()).toBe(true);
      expect(media.headers()["content-type"]).toContain(mimeType);
    }
    await page.screenshot({ path: test.info().outputPath("ai-news-rich-text-editor.png"), fullPage: true });
    await db.newsArticle.create({ data: {
      id: userId, slug: userId, title: "正文配图位置测试", summary: "验证媒体在中英文正文中的位置。", content: await content.inputValue(),
      englishTitle: "Testing the embedded video", englishSummary: "This demonstration uses local test media to verify placement in both article views.",
      englishContent: await enContent.inputValue(), status: "published", publishedAt: new Date(),
    } });
    await page.goto(`/ai-news/${userId}`);
    await expect(page.locator(`figure img[alt="${imageName}"]`)).toBeVisible();
    await page.goto(`/en/ai-news/${userId}`);
    await expect(page.locator(`video[aria-label="${videoName}"][controls]`)).toBeVisible();
  } finally {
    await context.close();
  }
});
