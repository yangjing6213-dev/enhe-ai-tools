import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("tool copy formatting source", () => {
  it("auto-formats product and tutorial copy before saving from admin forms", () => {
    const source = readFileSync(join(process.cwd(), "src/app/admin/actions.ts"), "utf8");

    expect(source).toContain("normalizeToolContentForStorage");
    expect(source).toContain("normalizeToolSummaryForStorage");
    expect(source).toContain("content: normalizeToolContentForStorage");
    expect(source).toContain("shortDescription: normalizeToolSummaryForStorage");
  });

  it("renders public tool and lesson copy through the structured rich content component", () => {
    const source = readFileSync(join(process.cwd(), "src/app/tools/[slug]/page-shell.tsx"), "utf8");

    expect(source).toContain("ToolRichContent");
    expect(source).toContain('content={localizedLongContent}');
    expect(source).toContain('content={tutorial.content}');
    expect(source).not.toContain('style={{ whiteSpace: "pre-line" }} className="text-base leading-8 text-[#C5D0E2]"');
    expect(source).not.toContain('style={{ whiteSpace: "pre-line" }} className="mt-3 leading-7 text-[#8F9DB2]"');
  });

  it("preserves paragraph breaks in localized long content", () => {
    const source = readFileSync(join(process.cwd(), "src/lib/tool-localization.ts"), "utf8");

    expect(source).toContain("normalizeRichText");
    expect(source).toContain("const localizedContent = resolveLocalizedInlineCopy(");
    expect(source).toContain("normalizeRichText,");
    expect(source).not.toContain("const content = normalizeText(tool.content);");
  });
});
