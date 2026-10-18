import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const styles = readFileSync(join(process.cwd(), "src/components/MaskedHeading.css"), "utf8");

describe("homepage heading loading transition", () => {
  it("keeps the original headline color until the image mask is ready", () => {
    expect(styles).toMatch(/\.masked-heading\[data-initial-fallback\]:not\(\[data-mask-ready\]\)[^{]*\{[^}]*color:\s*var\(--enhe-text,\s*#080808\)/);
  });

  it("hides the unmeasured image mask and fades the fallback out when ready", () => {
    expect(styles).toMatch(/\.masked-heading\[data-initial-fallback\]:not\(\[data-mask-ready\]\) \.masked-heading__reveal\s*\{[^}]*visibility:\s*hidden/);
    expect(styles).toMatch(/\.masked-heading\[data-initial-fallback\]\[data-mask-ready\] \.masked-heading__measure\s*\{[^}]*opacity:\s*0/);
    expect(styles).toMatch(/\.masked-heading\[data-initial-fallback\] \.masked-heading__measure\s*\{[^}]*transition:\s*opacity/);
  });
});
