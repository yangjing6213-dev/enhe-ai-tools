import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("brand image alt text", () => {
  it("keeps the header logo image descriptive instead of empty", () => {
    const source = readFileSync(join(process.cwd(), "src/components/site-header.tsx"), "utf8");

    expect(source).toContain("alt={`${brandWordmark} logo`}");
    expect(source).not.toContain('alt=""');
  });

  it("keeps footer brand images descriptive for SEO crawlers", () => {
    const source = readFileSync(join(process.cwd(), "src/components/site-footer.tsx"), "utf8");

    expect(source).not.toContain('alt=""');
    expect(source).toContain("alt={`${siteName} logo`}");
    expect(source).not.toContain("site-footer-gradient-icon");
  });
});
