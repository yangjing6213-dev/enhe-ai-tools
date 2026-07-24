import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(process.cwd(), "src");

function publicTsxFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    const projectPath = relative(root, path).replace(/\\/g, "/");

    if (
      projectPath.startsWith("app/admin/") ||
      projectPath.startsWith("app/api/") ||
      projectPath.startsWith("app/(auth)/") ||
      projectPath.startsWith("app/user/")
    ) {
      return [];
    }

    if (statSync(path).isDirectory()) return publicTsxFiles(path);
    return name.endsWith(".tsx") && !name.includes(".test.") ? [path] : [];
  });
}

describe("public interface polish contract", () => {
  it("uses explicit transition properties in public TSX", () => {
    const offenders = publicTsxFiles(root).flatMap((path) => {
      const lines = readFileSync(path, "utf8").split(/\r?\n/);
      return lines.flatMap((line, index) =>
        /(?<![-\w])transition(?![-\w])/.test(line)
          ? [`${relative(process.cwd(), path)}:${index + 1}`]
          : [],
      );
    });

    expect(offenders).toEqual([]);
  });

  it("keeps navigation, disclosure, and footer hit areas at least 40 pixels", () => {
    const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8").replace(/\r\n/g, "\n");

    expect(css).toMatch(/\.mobile-nav-sublink\s*{[\s\S]*?min-height:\s*44px;/);
    expect(css).toMatch(/\.site-footer-link,[\s\S]*?min-height:\s*40px;/);
    expect(css).toMatch(/\.home-seo-disclosure summary\s*{[\s\S]*?min-height:\s*44px;/);
  });

  it("keeps footer groups collapsed by default and expandable on every viewport", () => {
    const footer = readFileSync(new URL("../components/site-footer.tsx", import.meta.url), "utf8");
    const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

    expect(footer).not.toContain('className="site-footer-disclosure" open');
    expect(footer).toContain('<details className="site-footer-disclosure">');
    expect(css).toContain(".site-footer-disclosure > summary");
    expect(css).not.toContain(".site-footer-disclosure {\n    display: contents;");
  });

  it("uses tabular numbers and targeted neutral outlines for public dynamic metrics and thumbnails", () => {
    const toolCard = readFileSync(new URL("../components/tool-card.tsx", import.meta.url), "utf8");
    const newsList = readFileSync(new URL("../app/ai-news/page-shell.tsx", import.meta.url), "utf8");
    const newsDetail = readFileSync(new URL("../app/ai-news/[slug]/page-shell.tsx", import.meta.url), "utf8");
    const searchDialog = readFileSync(new URL("../components/public-search-dialog.tsx", import.meta.url), "utf8");
    const toolDetail = readFileSync(new URL("../app/tools/[slug]/page-shell.tsx", import.meta.url), "utf8");
    const productDemo = readFileSync(new URL("../components/product-demo-card.tsx", import.meta.url), "utf8");

    expect(toolCard).toContain("tabular-nums");
    expect(newsList).toContain("tabular-nums");
    expect(newsDetail).toContain("tabular-nums");
    expect(searchDialog).toContain("tabular-nums");
    expect(toolDetail).toContain("numeric");
    expect(toolCard).toContain("content-thumbnail-outline");
    expect(newsList).toContain("content-thumbnail-outline");
    expect(productDemo).toContain("content-thumbnail-outline");
  });
});
