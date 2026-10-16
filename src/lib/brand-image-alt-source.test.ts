import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("brand image alt text", () => {
  it("keeps the header logo image descriptive instead of empty", () => {
    const source = readFileSync(join(process.cwd(), "src/components/site-header.tsx"), "utf8");

    expect(source).toMatch(/src="\/images\/brand\/enhe-icon-gradient-transparent-cropped\.png"[\s\S]*?alt=\{`\$\{brandWordmark\} logo`\}/);
  });

  it("keeps footer brand images descriptive for SEO crawlers", () => {
    const source = readFileSync(join(process.cwd(), "src/components/site-footer.tsx"), "utf8");

    expect(source).toMatch(/src="\/images\/brand\/enhe-icon-gradient-transparent-cropped\.png"[\s\S]*?alt=\{`\$\{siteName\} logo`\}/);
    expect(source).toMatch(/src="\/images\/brand\/enhe-icon-gradient-transparent-cropped\.png"[\s\S]*?alt=\{`\$\{siteName\} gradient logo`\}/);
  });
});
