import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("AI Skill detail navigation", () => {
  it("shows the back link only for skill learning details", () => {
    const page = readFileSync(resolve(root, "src/app/tools/[slug]/page-shell.tsx"), "utf8");

    expect(page).toContain("{isSkillLearning ? (");
    expect(page).toContain('<ButtonLink href={baseListingPath} variant="ghost">');
    expect(page).toContain("返回 AI Skill 分类");
    expect(page).toContain("Back to AI Skills");
  });
});
