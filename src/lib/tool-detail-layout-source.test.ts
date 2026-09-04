import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../..");

describe("tool detail layout source", () => {
  it("stacks media above text and preserves full image visibility", () => {
    const source = readFileSync(resolve(root, "src/app/tools/[slug]/page-shell.tsx"), "utf8");

    expect(source).toContain("tool-detail-hero-stack");
    expect(source).toContain("tool-detail-cover-frame");
    expect(source).toContain("tool-detail-product-gallery");
    expect(source).toContain("tool-detail-copy-card");
    expect(source).toContain("tool-detail-product-image-frame");
    expect(source).toContain("resolveSoftwareDownloadCtaHref");
    expect(source).toContain('id="download-links"');
    expect(source).toContain("href={softwareDownloadCtaHref}");
    expect(source).toContain("object-contain");
    expect(source).not.toContain("lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]");
    expect(source).not.toContain("lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]");

    expect(source.indexOf("tool-detail-product-gallery")).toBeLessThan(source.indexOf("tool-detail-copy-card"));
  });

  it("does not show review-promise or VIP-only download-link notices on the public tool page", () => {
    const pageSource = readFileSync(resolve(root, "src/app/tools/[slug]/page-shell.tsx"), "utf8");
    const i18nSource = readFileSync(resolve(root, "src/lib/i18n.ts"), "utf8");

    expect(pageSource).not.toContain("reviewCompletionNotice");
    expect(pageSource).not.toContain("reviewNotice");
    expect(pageSource).not.toContain('commentsIntro.replace("{notice}"');
    expect(pageSource).not.toContain("downloadLinksVipOnlyIntro");
    expect(pageSource).not.toContain("downloadLinksHidden");
    expect(i18nSource).not.toContain("评论提交后进入后台审核，通过后展示。{notice}");
    expect(i18nSource).not.toContain("该工具设置为下载链接仅 VIP 可见。");
    expect(i18nSource).not.toContain("当前下载链接仅对 VIP 用户显示");
  });
});
