import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

const root = process.cwd();
const assetDir = join(root, "docs", "ebos", "validation-assets");

const assetFiles = [
  "2026-07-03-ai-prompt-kit-minimum-product.md",
  "2026-07-03-ai-prompt-kit-landing-copy.md",
  "2026-07-03-ai-prompt-kit-marketplace-listings.md",
  "2026-07-03-ai-prompt-kit-synthetic-optimized-copy.md",
  "2026-07-03-faceswap-validation-copy.md",
  "2026-07-03-ai-video-studio-validation-copy.md",
  "2026-07-03-social-promotion-copy.md",
  "2026-07-03-three-day-validation-checklist.md",
  "2026-07-03-validation-input-fill-guide.md",
  "2026-07-03-codex-operator-summary.md"
];

describe("validation operator assets", () => {
  test("creates all Step 9.8 validation asset files", () => {
    for (const fileName of assetFiles) {
      expect(existsSync(join(assetDir, fileName)), fileName).toBe(true);
    }
  });

  test("documents non-fabrication rules and runnable validation commands", () => {
    const summary = readFileSync(join(assetDir, "2026-07-03-codex-operator-summary.md"), "utf8");
    const fillGuide = readFileSync(join(assetDir, "2026-07-03-validation-input-fill-guide.md"), "utf8");

    expect(summary).toContain("不能由 Codex 代填");
    expect(summary).toContain("validation_ai_prompt_kit_cta_click");
    expect(fillGuide).toContain("reports/ebos/validation/inputs/2026-07-03-validation-input.json");
    expect(fillGuide).toContain("npx tsx scripts/check-ebos-validation-input.ts --date 2026-07-03");
  });

  test("adds the bilingual AI Prompt Kit validation page with CTA tracking", () => {
    const sharedPage = readFileSync(join(root, "src", "components", "validation-ai-prompt-kit-page.tsx"), "utf8");

    expect(existsSync(join(root, "src", "app", "(zh-public)", "validation", "ai-prompt-kit", "page.tsx"))).toBe(true);
    expect(existsSync(join(root, "src", "app", "en", "validation", "ai-prompt-kit", "page.tsx"))).toBe(true);
    expect(sharedPage).toContain("validation_ai_prompt_kit_cta_click");
    expect(sharedPage).toContain("ENHE AI Prompt Kit");
  });

  test("adds Step 20S optimized AI Prompt Kit validation copy", () => {
    const sharedPage = readFileSync(join(root, "src", "components", "validation-ai-prompt-kit-page.tsx"), "utf8");

    expect(sharedPage).toContain("先免费领取 5 个高频 Prompt 模板");
    expect(sharedPage).toContain("验证阶段价格测试");
    expect(sharedPage).toContain("适合谁 / 不适合谁");
    expect(sharedPage).toContain("Free sample prompts");
    expect(sharedPage).toContain("Pricing validation");
    expect(sharedPage).toContain("No income, platform traffic, ranking, or order guarantee");
    expect(sharedPage).toContain("模板仅作为效率辅助");
  });

  test("updates private outreach, WeChat, and Xiaohongshu publishing copy", () => {
    const optimizedCopy = readFileSync(join(assetDir, "2026-07-03-ai-prompt-kit-synthetic-optimized-copy.md"), "utf8");

    expect(optimizedCopy).toContain("我整理了 5 个可以免费领取的 AI Prompt 样例，想送你试用一下。如果你觉得有用，我再做完整模板包。");
    expect(optimizedCopy).toContain("朋友圈");
    expect(optimizedCopy).toContain("微信群");
    expect(optimizedCopy).toContain("我整理了 20 个能直接用的 AI 提示词，免费送");
    expect(optimizedCopy).toContain("不会写提示词？我做了一套可复制的 AI 模板");
    expect(optimizedCopy).toContain("做副业/自媒体/产品上架，这些 Prompt 真的能省时间");
  });
});
