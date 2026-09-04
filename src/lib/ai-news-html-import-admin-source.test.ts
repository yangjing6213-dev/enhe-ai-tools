import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function exists(path: string) {
  return existsSync(join(process.cwd(), path));
}

describe("AI news HTML admin import source contracts", () => {
  it("adds an admin HTML import page wired to the import action", () => {
    expect(exists("src/app/admin/ai-news/import/page.tsx")).toBe(true);

    const page = read("src/app/admin/ai-news/import/page.tsx");
    expect(page).toContain("importNewsArticleHtmlAction");
    expect(page).toContain('name="htmlFile"');
    expect(page).toContain('name="html"');
    expect(page).toContain('name="publishMode"');
    expect(page).toContain('value="draft"');
    expect(page).toContain('value="published"');
  });

  it("exposes the HTML import entry from the admin AI news list", () => {
    const listPage = read("src/app/admin/ai-news/page.tsx");
    expect(listPage).toContain('/admin/ai-news/import');
  });

  it("imports pasted or uploaded HTML through the shared import service", () => {
    const actions = read("src/app/admin/actions.ts");
    expect(actions).toContain("export async function importNewsArticleHtmlAction");
    expect(actions).toContain("buildAiNewsImportPayloadFromHtml");
    expect(actions).toContain("importAiNewsArticle");
    expect(actions).toContain('formData.get("htmlFile")');
    expect(actions).toContain('formData.get("html")');
    expect(actions).toContain("/admin/ai-news/import?error=");
    expect(actions).toContain("/admin/ai-news/${result.articleId}?saved=1");
  });

  it("does not catch the success redirect from the HTML import action", () => {
    const actions = read("src/app/admin/actions.ts");
    const actionMatch = actions.match(/export async function importNewsArticleHtmlAction[\s\S]*?export async function upsertNewsCategoryAction/);
    expect(actionMatch).not.toBeNull();
    const actionSource = actionMatch?.[0] ?? "";
    const successRedirectIndex = actionSource.indexOf("redirect(`/admin/ai-news/${result.articleId}?saved=1`)");
    const catchIndex = actionSource.indexOf("} catch (error) {");

    expect(successRedirectIndex).toBeGreaterThan(catchIndex);
  });
});
