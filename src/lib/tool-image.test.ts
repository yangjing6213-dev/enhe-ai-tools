import { describe, expect, it } from "vitest";
import {
  isToolImageSource,
  resolvePublicToolImageSrc,
  resolveToolImageSrc,
} from "@/lib/tool-image";

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

  it("uses opaque public catalog URLs and only accepts approved local media roots", () => {
    const source =
      "https://enhe-ai-tools-1303691623.cos.ap-shanghai.myqcloud.com/tool-cover-a-skill/cover.png";

    expect(resolvePublicToolImageSrc("tool-1", source)).toBe(
      "/api/tool-images?id=tool-1",
    );
    expect(resolvePublicToolImageSrc("tool-2", "/images/tool.png")).toBe(
      "/images/tool.png",
    );
    expect(resolvePublicToolImageSrc("tool-3", "uploads/tool.png")).toBe(
      "/api/uploads/tool.png",
    );
    expect(
      resolvePublicToolImageSrc("tool-4", "https://tracker.example/cover.png"),
    ).toBeNull();
    expect(
      resolvePublicToolImageSrc("tool-5", "//tracker.example/cover.png"),
    ).toBeNull();
    expect(
      resolvePublicToolImageSrc("tool-6", "C:\\private\\cover.png"),
    ).toBeNull();
    expect(
      resolvePublicToolImageSrc("tool-7", "/private/cover.png"),
    ).toBeNull();
    expect(
      resolvePublicToolImageSrc("tool-8", "/images/../api/private.png"),
    ).toBeNull();
    expect(
      resolvePublicToolImageSrc("tool-9", "/images/%2e%2e/api/private.png"),
    ).toBeNull();
  });
});
