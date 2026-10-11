import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("catalog detail navigation", () => {
  it("shows the same localized back link on every catalog detail type", () => {
    const page = readFileSync(resolve(root, "src/app/tools/[slug]/page-shell.tsx"), "utf8");

    expect(page).toContain('<div className="mb-5">');
    expect(page).toContain('<ButtonLink href={baseListingPath} variant="ghost">');
    expect(page).toContain('forceLocale === "en" ? "Back" : "返回"');
  });
});
