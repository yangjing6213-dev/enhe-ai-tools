import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../..");

describe("software catalog card clarity", () => {
  it("shows the actual price and does not mislabel a category as the audience", () => {
    const source = readFileSync(
      resolve(root, "src/components/redesign/software/EnheRedesignSoftwareCard.tsx"),
      "utf8",
    );
    expect(source).toContain("product.price");
    expect(source).not.toContain("{t.audienceLabel}: {categoryLabel}");
  });
});
