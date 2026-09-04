import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routeFiles = [
  "../app/en/page.tsx",
  "../app/en/legal/[slug]/page.tsx",
  "../app/en/account-services/page.tsx",
  "../app/en/account-services/[slug]/page.tsx",
  "../app/en/pricing/page.tsx",
  "../app/en/skill-learning/page.tsx",
  "../app/en/skill-learning/[slug]/page.tsx",
  "../app/en/software/page.tsx",
  "../app/en/software/[slug]/page.tsx",
  "../app/en/tools/[slug]/route.ts",
  "../app/en/tutorials/page.tsx",
  "../app/(zh-public)/legal/[slug]/page.tsx",
  "../app/(zh-public)/account-services/page.tsx",
  "../app/(zh-public)/account-services/[slug]/page.tsx",
  "../app/(zh-public)/pricing/page.tsx",
  "../app/(zh-public)/skill-learning/page.tsx",
  "../app/(zh-public)/skill-learning/[slug]/page.tsx",
  "../app/(zh-public)/software/page.tsx",
  "../app/(zh-public)/software/[slug]/page.tsx",
  "../app/(zh-public)/tools/[slug]/route.ts",
  "../app/(zh-public)/tutorials/page.tsx"
];

describe("route revalidate source contract", () => {
  it("uses statically analyzable revalidate literals on public app routes", () => {
    for (const relativePath of routeFiles) {
      const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");

      expect(source).toContain("export const revalidate = 300;");
      expect(source).not.toMatch(/export const revalidate = [A-Za-z_][A-Za-z0-9_]*/);
      expect(source).not.toMatch(/,\s*[A-Za-z]+PageRevalidate\s*}/);
    }
  });
});
