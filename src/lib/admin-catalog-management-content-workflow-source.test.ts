import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
const readRepo = (relativePath: string) =>
  readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");

describe("FAQ, category, tag, and changelog admin presentation", () => {
  it("mounts all list and editor routes in the shared light content shell", () => {
    const routes = [
      "app/admin/faqs/page.tsx",
      "app/admin/faqs/[id]/page.tsx",
      "app/admin/categories/page.tsx",
      "app/admin/tags/page.tsx",
      "app/admin/changelogs/page.tsx",
      "app/admin/changelogs/[id]/page.tsx"
    ];

    for (const route of routes) {
      const source = read(route);
      expect(source).toContain("AdminContentShell");
      expect(source).toContain("enhe-admin-content-management");
    }
  });

  it("preserves FAQ, category, tag, and changelog actions and fields", () => {
    const faqEditor = read("app/admin/faqs/[id]/page.tsx");
    const categories = read("app/admin/categories/page.tsx");
    const tags = read("app/admin/tags/page.tsx");
    const changelogEditor = read("app/admin/changelogs/[id]/page.tsx");

    expect(faqEditor).toContain("action={upsertToolFaqAction}");
    expect(faqEditor).toContain("action={deleteToolFaqAction}");
    for (const name of ["toolId", "question", "answer", "sortOrder", "status"]) {
      expect(faqEditor).toContain(`name="${name}"`);
    }
    expect(categories).toContain("action={upsertCategoryAction}");
    expect(categories).toContain("action={deleteCategoryAction}");
    for (const name of ["name", "type", "sortOrder", "status", "description"]) {
      expect(categories).toContain(`name="${name}"`);
    }
    expect(tags).toContain("action={upsertToolTagAction}");
    expect(tags).toContain("action={updateToolTagsAction}");
    for (const name of ["slug", "color", "toolId", "tags"]) {
      expect(tags).toContain(`name="${name}"`);
    }
    expect(changelogEditor).toContain("action={upsertToolChangelogAction}");
    expect(changelogEditor).toContain("action={deleteToolChangelogAction}");
    for (const name of ["toolId", "versionMajor", "versionMinor", "title", "releaseDate", "content", "status"]) {
      expect(changelogEditor).toContain(`name="${name}"`);
    }
  });

  it("exposes responsive lists, create forms, and management cards", () => {
    const lists = [
      read("app/admin/faqs/page.tsx"),
      read("app/admin/changelogs/page.tsx")
    ];
    const categories = read("app/admin/categories/page.tsx");
    const tags = read("app/admin/tags/page.tsx");
    const shell = readRepo("src/styles/redesign/shell.css");

    for (const source of lists) {
      expect(source).toContain("enhe-admin-content-toolbar");
      expect(source).toContain("enhe-admin-content-table");
      expect(source).toContain("enhe-admin-content-row");
      expect(source).toContain("enhe-admin-content-primary-action");
    }
    expect(categories).toContain("enhe-admin-category-create-form");
    expect(categories).toContain("enhe-admin-category-card");
    expect(tags).toContain("enhe-admin-tag-create-form");
    expect(tags).toContain("enhe-admin-tag-card");
    for (const selector of [
      ".enhe-admin-content-management",
      ".enhe-admin-content-table",
      ".enhe-admin-faq-editor-form",
      ".enhe-admin-changelog-editor-form",
      ".enhe-admin-category-create-form",
      ".enhe-admin-tag-create-form"
    ]) {
      expect(shell).toContain(selector);
    }
  });

  it("keeps tag editors compact while preserving the tool binding form", () => {
    const tags = read("app/admin/tags/page.tsx");
    const actions = read("app/admin/actions.ts");
    const detail = readRepo("src/app/tools/[slug]/page-shell.tsx");
    const cardGrid = tags.slice(tags.indexOf("enhe-admin-content-card-grid"), tags.indexOf("工具标签绑定"));
    const bindingSection = tags.slice(tags.indexOf("工具标签绑定"));
    const updateBindings = actions.slice(
      actions.indexOf("export async function updateToolTagsAction"),
      actions.indexOf("export async function deleteToolAction")
    );

    expect(tags).toContain("将标签绑定到工具后，会显示在对应工具详情页");
    expect(cardGrid).toContain("xl:grid-cols-3");
    expect(cardGrid).toContain("grid grid-cols-2 items-start gap-3");
    expect(cardGrid).toContain('style={{ padding: "12px" }}');
    expect(cardGrid).toContain('rows={2} style={{ minHeight: "4.5rem" }}');
    expect(bindingSection).toContain("action={updateToolTagsAction}");
    expect(bindingSection).toContain('name="toolId"');
    expect(bindingSection).toContain('name="tags"');
    expect(bindingSection).toContain('tool.tagLinks.map((link) => link.tag.name).join(", ")');
    expect(updateBindings).toContain('parseTagNames(String(formData.get("tags") ?? ""))');
    expect(updateBindings).toContain("prisma.toolTagLink.deleteMany({ where: { toolId } })");
    expect(updateBindings).toContain("prisma.toolTagLink.create({ data: { toolId, tagId: tag.id } })");
    expect(detail).toContain("tagLinks: {");
    expect(detail).toContain("include: { tag: true }");
    expect(detail).toContain("tool.tagLinks,");
    expect(detail).toContain("localizedTagItems.map((tag) =>");
  });
});
