import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../..");

describe("AI news filter control sizing", () => {
  it("uses a shared control class and height for search, selects, and submit", () => {
    const page = readFileSync(resolve(root, "src/app/ai-news/page-shell.tsx"), "utf8");
    const styles = readFileSync(resolve(root, "src/styles/redesign/ai-news.css"), "utf8");
    const form = page.slice(page.indexOf("function FilterBar("));

    expect(form.match(/className="[^"]*ai-news-filter-control/g) ?? []).toHaveLength(5);
    expect(styles).toMatch(/\.ai-news-filter-surface\s+:is\(\.ai-news-filter-control\)\s*\{[^}]*min-height:\s*52px/);
  });
});
