import { describe, expect, it } from "vitest";
import { isToolImageSource, resolveToolImageSrc } from "@/lib/tool-image";

describe("tool image sources", () => {
  it("routes private COS product images through the signed image proxy", () => {
    const source =
      "https://enhe-ai-tools-1303691623.cos.ap-shanghai.myqcloud.com/tool-cover-a-skill/cover.png";

    expect(isToolImageSource(source)).toBe(true);
    expect(resolveToolImageSrc(source)).toBe(
      `/api/tool-images?src=${encodeURIComponent(source)}`,
    );
  });

  it("routes product demo cover object paths through the signed image proxy", () => {
    const source = "cos://enhe-ai-tools-1303691623/product-demo-cover-a-skill/cover.webp";

    expect(isToolImageSource(source)).toBe(true);
    expect(resolveToolImageSrc(source)).toBe(
      `/api/tool-images?src=${encodeURIComponent(source)}`,
    );
  });

  it("keeps local and non-product image sources unchanged", () => {
    expect(resolveToolImageSrc("uploads/tool-cover.png")).toBe(
      "/api/uploads/tool-cover.png",
    );
    expect(isToolImageSource("https://example.com/cover.png")).toBe(false);
    expect(isToolImageSource("https://enhe-ai-tools-1303691623.cos.ap-shanghai.myqcloud.com/tool-videos/demo.mp4")).toBe(false);
    expect(isToolImageSource("cos://enhe-ai-tools-1303691623/tool-cover-a-skill/../private.png")).toBe(false);
  });
});
