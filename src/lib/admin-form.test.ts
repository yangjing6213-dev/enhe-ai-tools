import { describe, expect, it } from "vitest";
import {
  buildPublicUploadUrl,
  buildSeoFriendlySlug,
  parseBooleanField,
  parseNumberField,
  parseScreenshotsField,
  resolveToolSlug,
  slugify
} from "@/lib/admin-form";

describe("admin form helpers", () => {
  it("creates stable lowercase slugs from names", () => {
    expect(slugify("ENHE Batch Tool 1.0")).toBe("enhe-batch-tool-1-0");
    expect(slugify("  ---Copy Cleaner---  ")).toBe("copy-cleaner");
  });

  it("creates a non-empty fallback slug for Chinese-only tool names", () => {
    expect(resolveToolSlug({ name: "测试", fallbackSeed: "cmptpgzow0007toe0ld9yuc0w" })).toBe("tool-cmptpgzow0007toe0ld9yuc0w");
  });

  it("normalizes manual tool slugs before saving", () => {
    expect(resolveToolSlug({ name: "测试", slugInput: " My Tool 01 ", fallbackSeed: "seed" })).toBe("my-tool-01");
  });

  it("builds SEO-friendly slugs from english names before falling back to weak legacy slugs", () => {
    expect(
      buildSeoFriendlySlug({
        currentSlug: "ai-ai",
        name: "AI语音生成",
        englishName: "AI Voice Generator - Flexible Edition"
      })
    ).toBe("ai-voice-generator-flexible-edition");

    expect(
      buildSeoFriendlySlug({
        currentSlug: "tool-mq12l5w6",
        name: "测试工具",
        englishName: null
      })
    ).toBe("tool-mq12l5w6");
  });

  it("parses checkbox-style boolean fields", () => {
    expect(parseBooleanField("on")).toBe(true);
    expect(parseBooleanField("true")).toBe(true);
    expect(parseBooleanField(null)).toBe(false);
  });

  it("parses optional number fields with fallback", () => {
    expect(parseNumberField("12.5", 0)).toBe(12.5);
    expect(parseNumberField("", 7)).toBe(7);
  });

  it("splits screenshot fields by line and comma", () => {
    expect(parseScreenshotsField("a.png, b.png\nc.png")).toEqual(["a.png", "b.png", "c.png"]);
  });

  it("builds browser-safe upload urls", () => {
    expect(buildPublicUploadUrl("proof image.png")).toMatch(/^\/uploads\/\d+-proof-image\.png$/);
  });
});
