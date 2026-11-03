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

  it("renders the dedicated value copy without truncation and adds two factual trust cues", () => {
    const source = readFileSync(
      resolve(root, "src/components/redesign/software/EnheRedesignSoftwareCard.tsx"),
      "utf8",
    );
    const styles = readFileSync(resolve(root, "src/styles/redesign/software.css"), "utf8");

    expect(source).toContain("product.valueProposition");
    expect(source).toContain('<p className="redesign-software-card-description redesign-software-card-value">');
    expect(source).not.toContain("buildValueSentence(product.description");
    expect(source).toContain("data-trust-price");
    expect(source).toContain("data-trust-refund");
    expect(styles).toContain(".redesign-software-card-identity");
    expect(styles).toContain(".redesign-software-card-value");
    expect(styles).not.toMatch(/\.redesign-software-card-value\s*\{[^}]*-webkit-line-clamp/);
  });
});
