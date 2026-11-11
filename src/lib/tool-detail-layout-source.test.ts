import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../..");

describe("tool detail layout source", () => {
  it("shows the full-width cover before the product summary and real next step", () => {
    const source = readFileSync(resolve(root, "src/app/tools/[slug]/page-shell.tsx"), "utf8");

    expect(source).toContain("tool-detail-hero-stack");
    expect(source).toContain("tool-detail-summary");
    expect(source).not.toContain("tool-detail-quick-offer");
    expect(source).toContain('href="#tool-purchase"');
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

    expect(source.indexOf("tool-detail-cover-frame")).toBeLessThan(source.indexOf("tool-detail-summary"));
  });

  it("keeps the original cover-first, full-width product detail layout on wide screens", () => {
    const styles = readFileSync(resolve(root, "src/styles/redesign/site-refresh.css"), "utf8");
    expect(styles).toContain(".tool-detail-summary");
    expect(styles).toContain(".tool-detail-hero-stack");
    expect(styles).toMatch(/\.tool-detail-hero-stack\s*\{[^}]*display:\s*flex;[^}]*flex-direction:\s*column;/);
    expect(styles).not.toMatch(/\.tool-detail-hero-stack\s*\{[^}]*grid-template-columns:/);
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
    expect(styles).toContain(".tool-detail-product-layout.has-creator");
    expect(styles).toContain("grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);");
    expect(styles).toContain(".tool-detail-payment-method-control");
    expect(styles).toContain(".tool-detail-payment-method-grid");
    expect(styles).toContain(".tool-detail-purchase-submit");
    expect(styles.match(/min-height: 152px/g)).toHaveLength(3);
  });

  it("keeps the refund guarantee and places the optional how-to card after the changelog", () => {
    const source = readFileSync(resolve(root, "src/app/tools/[slug]/page-shell.tsx"), "utf8");
    const changelogStart = source.indexOf('id="tool-changelog"');
    const changelogEnd = source.indexOf("</section>", changelogStart);
    const faqStart = source.indexOf("{!isAiWorkflow ? faqSection : null}");
    const betweenCards = source.slice(changelogEnd, faqStart);
    const factsGridStart = source.indexOf("tool-detail-facts-grid");
    const agentsCardStart = source.indexOf("<SupportedAgentsCard", factsGridStart);
    const safetyCardStart = source.indexOf("product-safety-info-card", factsGridStart);
    const refundCardStart = source.indexOf("{refundPolicyCard}", safetyCardStart);

    expect(source).toContain('forceLocale === "en" ? "Refund guarantee" : "退款保障"');
    expect(agentsCardStart).toBeGreaterThan(-1);
    expect(agentsCardStart).toBeLessThan(safetyCardStart);
    expect(safetyCardStart).toBeLessThan(refundCardStart);
    expect(refundCardStart).toBeLessThan(source.indexOf("tool-detail-payment-method-control"));
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

  it("pairs changelog and sharing cards with the shared detail text scale", () => {
    const source = readFileSync(resolve(root, "src/app/tools/[slug]/page-shell.tsx"), "utf8");
    const sharingStyles = readFileSync(resolve(root, "src/components/product-sharing.module.css"), "utf8");

    expect(source).toContain("tool-detail-changelog-share-grid");
    expect(source).toContain("md:text-4xl");
    expect(sharingStyles).toContain("font-size: 1.875rem");
    expect(sharingStyles).toContain("font-size: 2.25rem");
  });
});
