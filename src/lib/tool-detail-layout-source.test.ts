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
    expect(source).toContain("href={productActionHref}");
    expect(source).toContain(": softwareDownloadCtaHref");
    expect(source).toContain("object-contain");
    expect(source).not.toContain("lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]");
    expect(source).not.toContain("lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]");

    expect(source.indexOf("tool-detail-product-gallery")).toBeLessThan(source.indexOf("tool-detail-copy-card"));
  });

  it("loads the core product cover eagerly with high fetch priority", () => {
    const source = readFileSync(resolve(root, "src/app/tools/[slug]/page-shell.tsx"), "utf8");
    const coverStart = source.indexOf("tool-detail-cover-frame");
    const coverEnd = source.indexOf("tool-detail-product-gallery", coverStart);
    const coverBlock = source.slice(coverStart, coverEnd);

    expect(coverBlock).toContain("<Image");
    expect(coverBlock).toContain("priority");
    expect(coverBlock).toContain('fetchPriority="high"');
    expect(coverBlock).not.toContain('loading="lazy"');
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

  it("shows only configured AI agents and links to the published refund rules", () => {
    const source = readFileSync(resolve(root, "src/app/tools/[slug]/page-shell.tsx"), "utf8");
    const styles = readFileSync(resolve(root, "src/styles/redesign/software.css"), "utf8");

    expect(source).toContain("{tool.supportedAgents.length ? (");
    expect(source).toContain("<SupportedAgentsCard agents={tool.supportedAgents} locale={forceLocale} />");
    expect(source).toContain("/legal/membership-refund");
    expect(source).toContain("product-refund-policy-card");
    expect(styles).toContain(".product-supported-agents-card");
    expect(styles).toContain("grid-template-columns: minmax(0, 1fr) minmax(280px, 1fr);");
    expect(styles).toContain(".tool-detail-payment-method-control");
  });

  it("keeps the refund guarantee and places the optional how-to card after the changelog", () => {
    const source = readFileSync(resolve(root, "src/app/tools/[slug]/page-shell.tsx"), "utf8");
    const changelogStart = source.indexOf('id="tool-changelog"');
    const changelogEnd = source.indexOf("</section>", changelogStart);
    const faqStart = source.indexOf("{!isAiWorkflow ? faqSection : null}");
    const betweenCards = source.slice(changelogEnd, faqStart);

    expect(source).toContain('forceLocale === "en" ? "Refund guarantee" : "退款保障"');
    expect(source.indexOf("product-refund-policy-card")).toBeLessThan(source.indexOf("tool-detail-offer-creator-grid"));
    expect(source.indexOf("product-refund-policy-card")).toBeLessThan(source.indexOf("tool-detail-payment-method-control"));
    expect(changelogStart).toBeGreaterThan(-1);
    expect(changelogEnd).toBeGreaterThan(changelogStart);
    expect(faqStart).toBeGreaterThan(changelogEnd);
    expect(betweenCards).toContain('id="tool-how-to"');
    expect(betweenCards).toContain("visibleUsageSteps.map");
    expect(source).not.toContain('id="tool-intro"');
    expect(source).toContain('id="tool-product-description"');
    expect(source.slice(changelogStart, changelogEnd)).toContain("tool-detail-changelog-card");
    expect(source.slice(changelogStart, changelogEnd)).toContain("w-full");
  });

  it("pairs changelog and sharing cards and hides the download metric on the generic Skill route", () => {
    const source = readFileSync(resolve(root, "src/app/tools/[slug]/page-shell.tsx"), "utf8");
    const sharingStyles = readFileSync(resolve(root, "src/components/product-sharing.module.css"), "utf8");

    expect(source).toContain("tool-detail-changelog-share-grid");
    expect(source).toContain('!(isAiSkill && tool.slug === "skill")');
    expect(source).toContain("md:text-4xl");
    expect(sharingStyles).toContain("font-size: 1.875rem");
    expect(sharingStyles).toContain("font-size: 2.25rem");
  });
});
