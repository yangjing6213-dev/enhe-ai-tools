import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("tool listing localization source", () => {
  it("localizes tool cards and english category labels through shared helpers", () => {
    const toolCardSource = readFileSync(join(process.cwd(), "src/components/tool-card.tsx"), "utf8");
    const softwareSource = readFileSync(join(process.cwd(), "src/app/software/page-shell.tsx"), "utf8");
    const onlineSource = readFileSync(join(process.cwd(), "src/app/online-tools/page-shell.tsx"), "utf8");

    expect(toolCardSource).toContain('from "@/lib/tool-localization"');
    expect(toolCardSource).toContain("resolveLocalizedToolCategoryName");
    expect(toolCardSource).toContain("resolveLocalizedToolIdentity");
    expect(toolCardSource).toContain("buildLocalizedToolPreviewText");
    expect(softwareSource).toContain("resolveLocalizedToolCategoryName");
    expect(onlineSource).toContain("resolveLocalizedToolCategoryName");
  });
});
