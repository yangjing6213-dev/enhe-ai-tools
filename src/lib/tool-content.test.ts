import { describe, expect, it } from "vitest";
import {
  buildToolContentBlocks,
  normalizeToolContentForStorage,
  normalizeToolSummaryForStorage,
  parseTagNames,
  tagSlug
} from "@/lib/tool-content";

describe("tool content helpers", () => {
  it("creates stable tag slugs", () => {
    expect(tagSlug("AI Automation Tool")).toBe("ai-automation-tool");
    expect(tagSlug("Batch Rename")).toBe("batch-rename");
  });

  it("splits and deduplicates tag names", () => {
    expect(parseTagNames("AI, Automation\nAI,Efficiency")).toEqual(["AI", "Automation", "Efficiency"]);
  });

  it("splits full-width Chinese tag separators", () => {
    expect(parseTagNames("AI\uFF0C\u81EA\u52A8\u5316\u3001\u6548\u7387")).toEqual(["AI", "\u81EA\u52A8\u5316", "\u6548\u7387"]);
  });

  it("formats a dense product introduction into readable paragraphs for storage", () => {
    const raw =
      "This tool cleans batch filenames, removes duplicate text, and prepares files before publishing. It is useful for creators, operators, and course teams. You can use it before uploads, archives, and daily delivery.";

    expect(normalizeToolContentForStorage(raw)).toBe(
      [
        "This tool cleans batch filenames, removes duplicate text, and prepares files before publishing.",
        "",
        "It is useful for creators, operators, and course teams.",
        "",
        "You can use it before uploads, archives, and daily delivery."
      ].join("\n")
    );
  });

  it("keeps existing bullets and parses them as a list block", () => {
    const raw = ["Highlights:", "- Batch cleanup", "- Local workflow", "- Clear delivery notes"].join("\n");

    expect(normalizeToolContentForStorage(raw)).toBe(raw);
    expect(buildToolContentBlocks(raw)).toEqual([
      { type: "heading", text: "Highlights" },
      { type: "unordered-list", items: ["Batch cleanup", "Local workflow", "Clear delivery notes"] }
    ]);
  });

  it("parses numbered product copy as an ordered list block", () => {
    expect(buildToolContentBlocks("Steps:\n1. Upload files\n2. Review result\n3. Export package")).toEqual([
      { type: "heading", text: "Steps" },
      { type: "ordered-list", items: ["Upload files", "Review result", "Export package"] }
    ]);
  });

  it("keeps ordered-list start numbers when descriptions split items into separate blocks", () => {
    expect(
      buildToolContentBlocks(
        [
          "Features:",
          "1. Text to speech",
          "Generate audio from text.",
          "",
          "2. Voice cloning",
          "Clone a voice from an authorized sample.",
          "",
          "3. Voice design",
          "Describe a voice style."
        ].join("\n")
      )
    ).toEqual([
      { type: "heading", text: "Features" },
      { type: "ordered-list", items: ["Text to speech"] },
      { type: "paragraph", text: "Generate audio from text." },
      { type: "ordered-list", start: 2, items: ["Voice cloning"] },
      { type: "paragraph", text: "Clone a voice from an authorized sample." },
      { type: "ordered-list", start: 3, items: ["Voice design"] },
      { type: "paragraph", text: "Describe a voice style." }
    ]);
  });

  it("keeps short descriptions compact instead of turning them into article content", () => {
    expect(normalizeToolSummaryForStorage("  Fast cleanup.\n\nWorks locally.  ")).toBe("Fast cleanup. Works locally.");
  });
});
