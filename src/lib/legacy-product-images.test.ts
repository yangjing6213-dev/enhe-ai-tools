import { describe, expect, it } from "vitest";
import { getLegacyProductImageFallback } from "@/lib/legacy-product-images";

describe("legacy product image fallbacks", () => {
  it("maps missing historical upload paths to bundled product visuals", () => {
    expect(
      getLegacyProductImageFallback(
        "1784038998590-tool-cover-infinitetalk-ai-chatgpt-image-2026-7-14-20-18-23.png"
      )
    ).toBe("/images/products/enhe-visuals/ai/cover.png");
    expect(
      getLegacyProductImageFallback("1781196487296-tool-product-zfb-chatgpt-image-2026-6-12-00-21-51-4-.png")
    ).toBe("/images/products/enhe-visuals/zfb/detail-03-scenario.png");
  });

  it("does not replace valid or unrelated uploads", () => {
    expect(getLegacyProductImageFallback("new-product-cover.png")).toBeNull();
    expect(getLegacyProductImageFallback("payment-qr/wechat/new-qr.png")).toBeNull();
  });
});
