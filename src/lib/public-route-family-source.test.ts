import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("public route family editorial shell contract", () => {
  it("marks the core bilingual public route shells for the light editorial canvas", () => {
    const routes = [
      "src/app/about/page-shell.tsx",
      "src/app/legal/[slug]/page-shell.tsx",
      "src/app/search/page-shell.tsx",
      "src/app/ai-topics/page-shell.tsx",
      "src/app/build-your-own-x/page-shell.tsx",
      "src/app/pricing/page-shell.tsx",
    ];

    for (const route of routes) {
      const source = read(route);
      expect(source, route).toContain("enhe-editorial-page");
      expect(source, route).toMatch(/<main(?:\s[^>]*)?>/);
    }
  });

  it("keeps the content-bearing routes' structured data and DB-free search status", () => {
    for (const route of [
      "src/app/about/page-shell.tsx",
      "src/app/legal/[slug]/page-shell.tsx",
      "src/app/ai-topics/page-shell.tsx",
      "src/app/pricing/page-shell.tsx",
    ]) {
      expect(read(route), route).toContain("StructuredData");
    }

    const search = read("src/app/search/page-shell.tsx");
    expect(search).toContain('data-content-status={isDbFreeMode ? "UNVERIFIED" : undefined}');
    expect(search).toContain("PublicSearchDialog");

    const shellStyles = read("src/styles/redesign/shell.css");
    expect(shellStyles).toContain(".enhe-editorial-page::before");
    expect(shellStyles).toContain("public-search-overlay");
    expect(shellStyles).toContain("background: var(--enhe-page-bg)");
    expect(shellStyles).toContain(".enhe-editorial-page.byox-page");
    expect(shellStyles).toContain(".byox-chip-row span");
    expect(shellStyles).toContain(".byox-project-card-top > span");
  });

  it("keeps auth forms inside the redesigned public shell", () => {
    for (const route of [
      "src/app/(auth)/login/page-shell.tsx",
      "src/app/(auth)/register/page-shell.tsx",
    ]) {
      const source = read(route);
      expect(source, route).toContain("enhe-editorial-page");
      expect(source, route).toContain("surface-panel");
      expect(source, route).toContain("form-control-dark");
    }

    expect(read("src/app/(auth)/layout.tsx")).toContain("EnheRedesignPublicHeader");
    expect(read("src/app/(auth)/layout.tsx")).toContain("EnheRedesignPublicFooter");
  });
});
