import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
const readRepo = (relativePath: string) =>
  readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");

describe("admin product-demo and tutorial content workflow presentation", () => {
  it("mounts all four list and editor routes in the shared light content shell", () => {
    const routes = [
      "app/admin/product-demos/page.tsx",
      "app/admin/product-demos/[id]/page.tsx",
      "app/admin/tutorials/page.tsx",
      "app/admin/tutorials/[id]/page.tsx"
    ];

    for (const route of routes) {
      const source = read(route);
      expect(source).toContain("AdminContentShell");
      expect(source).toContain("enhe-admin-content-management");
    }
  });

  it("gives long lists contained table surfaces and clear filter and action hooks", () => {
    const productDemos = read("app/admin/product-demos/page.tsx");
    const tutorials = read("app/admin/tutorials/page.tsx");

    for (const source of [productDemos, tutorials]) {
      expect(source).toContain("enhe-admin-content-toolbar");
      expect(source).toContain("enhe-admin-content-table");
      expect(source).toContain("enhe-admin-content-row");
      expect(source).toContain("enhe-admin-content-primary-action");
    }
    expect(productDemos).toContain("enhe-admin-content-filters");
  });

  it("preserves product-demo and tutorial actions, fields, and upload components", () => {
    const demoEditor = read("app/admin/product-demo-editor.tsx");
    const tutorialEditor = read("app/admin/tutorials/[id]/page.tsx");

    expect(demoEditor).toContain("action={upsertProductDemoAction}");
    expect(demoEditor).toContain("action={archiveProductDemoAction}");
    expect(demoEditor).toContain("action={deleteProductDemoAction}");
    expect(demoEditor).toContain("ProductDemoVideoUploadField");
    expect(demoEditor).toContain('name="videoDuration"');
    expect(demoEditor).toContain('name="transcript"');
    expect(demoEditor).toContain('name="faq"');
    expect(demoEditor).toContain('name="relatedProductId"');
    expect(demoEditor).toContain('name="seoTitle"');
    expect(tutorialEditor).toContain("action={upsertTutorialAction}");
    expect(tutorialEditor).toContain("action={deleteTutorialAction}");
    expect(tutorialEditor).toContain('name="content"');
    expect(tutorialEditor).toContain('name="notes"');
    expect(tutorialEditor).toContain('name="commonErrors"');
  });

  it("defines responsive management surfaces and primary actions", () => {
    const shell = readRepo("src/styles/redesign/shell.css");

    expect(shell).toContain(".enhe-admin-content-management");
    expect(shell).toContain(".enhe-admin-content-filters");
    expect(shell).toContain(".enhe-admin-content-records");
    expect(shell).toContain(".enhe-admin-content-row:hover");
    expect(shell).toContain(".enhe-admin-content-primary-action");
    expect(shell).toContain(".enhe-admin-product-demo-form");
    expect(shell).toContain(".enhe-admin-tutorial-editor-form");
  });
});
