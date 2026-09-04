import { describe, expect, it } from "vitest";
import { mergeToolProductImages } from "@/lib/tool-product-images";

describe("tool product images", () => {
  it("keeps selected existing images and appends newly uploaded images", () => {
    expect(mergeToolProductImages(["/uploads/a.png", "/uploads/b.png"], ["/uploads/c.png"])).toEqual([
      "/uploads/a.png",
      "/uploads/b.png",
      "/uploads/c.png"
    ]);
  });

  it("removes blank and duplicate image URLs while preserving order", () => {
    expect(mergeToolProductImages(["/uploads/a.png", " ", "/uploads/a.png"], ["/uploads/a.png", "/uploads/b.png"])).toEqual([
      "/uploads/a.png",
      "/uploads/b.png"
    ]);
  });
});
