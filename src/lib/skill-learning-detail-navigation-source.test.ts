import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("catalog detail navigation", () => {
  it("uses the shared localized back control without a duplicate catalog link", () => {
    const page = readFileSync(resolve(root, "src/app/tools/[slug]/page-shell.tsx"), "utf8");

    expect(page).not.toContain('<ButtonLink href={baseListingPath} variant="ghost">');
    const chrome = readFileSync(resolve(root, "src/components/redesign/enhe-production-public-shell.tsx"), "utf8");
    const back = readFileSync(resolve(root, "src/components/back-navigation-bar.tsx"), "utf8");
    expect(chrome).toContain('<BackNavigationBar locale={locale} />');
    expect(back).toContain('locale === "en" ? "Back" : "返回"');
  });
});
