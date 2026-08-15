import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(process.cwd(), "src");

function read(relativePath: string) {
  const path = join(root, relativePath);
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

describe("production public shell visual boundary", () => {
  it("provides a production root and removes the legacy empty top spacer", () => {
    const chrome = read("components/public-site-chrome.tsx");
    const shell = read("styles/redesign/shell.css");

    expect(chrome).toContain('className="enhe-redesign-production"');
    expect(shell).toContain(".enhe-redesign-production");
    expect(shell).toContain(".enhe-redesign-production > .fade-in");
    expect(shell).toMatch(/\.enhe-redesign-production\s*>\s*\.fade-in[^{]*\{[^}]*padding-top:\s*0/);
  });

  it("sets the approved production canvas and readable shell ink", () => {
    const shell = read("styles/redesign/shell.css");

    expect(shell).toMatch(/\.enhe-redesign-production\s*\{[\s\S]*?background:\s*var\(--enhe-page-bg\)/);
    expect(shell).toMatch(/\.enhe-redesign-production\s*\{[\s\S]*?color:\s*var\(--enhe-text\)/);
    expect(shell).toMatch(/\.enhe-redesign-production\s*\{[\s\S]*?color-scheme:\s*light/);
    expect(shell).toContain(".enhe-redesign-production .redesign-header");
    expect(shell).toContain("color: var(--enhe-text);");
  });

  it("keeps the reviews section on the approved light surface with dark controls", () => {
    const home = read("styles/redesign/home.css");

    expect(home).toMatch(/\.enhe-redesign-production\s+\.redesign-home-reviews\s*\{[\s\S]*?background(?:-color)?:\s*var\(--enhe-page-bg\)/);
    expect(home).toMatch(/\.enhe-redesign-production\s+\.redesign-home-reviews\s*\{[\s\S]*?color:\s*var\(--enhe-text/);
    expect(home).toMatch(/\.enhe-redesign-production\s+\.redesign-home-reviews-control[^}]*\{[\s\S]*?color:\s*var\(--enhe-text/);
  });
});
