import { describe, expect, test } from "vitest";
import {
  auditProductPage,
  calculateProductPageScore,
  extractProductPageSignals
} from "../product-page-auditor";

const completeProductHtml = `
  <html>
    <head><title>Creator Video Studio</title></head>
    <body>
      <main>
        <section class="hero"><h1>Creator Video Studio</h1></section>
        <section id="summary"><p>Product summary for creators who need local AI video workflows.</p></section>
        <section><h2>Features</h2><ul><li>Batch render</li><li>Local models</li></ul></section>
        <section><h2>Use cases</h2><p>Use it for ads, tutorials, and creator workflows.</p></section>
        <section><h2>Who it is for</h2><p>Built for creators, marketers, and small teams.</p></section>
        <section><h2>Pricing</h2><p>Paid download with license purchase support.</p></section>
        <a class="button primary" href="/checkout/video-studio">Buy now</a>
        <a class="button secondary" href="/software/video-studio#demo">Watch demo</a>
        <a href="/downloads/video-studio">Download after purchase</a>
        <section><h2>FAQ</h2><h3>Can I use it locally?</h3><p>Yes.</p><h3>Is support included?</h3><p>Yes.</p></section>
        <img src="/images/video-studio.png" alt="Product screenshot" />
        <video src="/videos/video-studio.mp4"></video>
        <section><h2>Support and refund</h2><p>Includes support, service policy, refund notes, and compliance notice.</p></section>
        <a href="/software/voice-generator">Related product</a>
      </main>
    </body>
  </html>
`;

describe("product page auditor", () => {
  test("detects conversion, offer, FAQ, media, and support signals", () => {
    const signals = extractProductPageSignals(completeProductHtml, "https://example.com/software/video-studio");

    expect(signals).toMatchObject({
      path: "/software/video-studio",
      slug: "video-studio",
      productName: "Creator Video Studio",
      hasClearHero: true,
      hasProductSummary: true,
      hasFeatureList: true,
      hasUseCases: true,
      hasTargetAudience: true,
      hasPricingOrPurchaseInfo: true,
      hasPrimaryCTA: true,
      hasSecondaryCTA: true,
      hasBuyLink: true,
      hasDownloadOrDeliveryInfo: true,
      hasFaqSection: true,
      faqCount: 2,
      hasMedia: true,
      hasVideo: true,
      hasProductImage: true,
      hasTrustSignal: true,
      hasRefundOrSupportInfo: true,
      hasComplianceNotice: true
    });
    expect(signals.internalLinksCount).toBeGreaterThanOrEqual(4);
    expect(signals.wordCountEstimate).toBeGreaterThan(20);
  });

  test("generates risks and action items when the primary CTA is missing", () => {
    const audit = auditProductPage({
      url: "https://example.com/software/no-cta",
      html: completeProductHtml.replace(/<a class="button primary"[\s\S]*?<\/a>/, "")
    });

    expect(audit.hasPrimaryCTA).toBe(false);
    expect(audit.risks).toContain("Product page is missing a primary CTA.");
    expect(audit.actionItems).toContainEqual(expect.objectContaining({
      title: expect.stringContaining("primary CTA")
    }));
  });

  test("generates an action item when FAQ coverage is missing", () => {
    const audit = auditProductPage({
      url: "https://example.com/software/no-faq",
      html: completeProductHtml.replace(/<section><h2>FAQ<\/h2>[\s\S]*?<\/section>/, "")
    });

    expect(audit.hasFaqSection).toBe(false);
    expect(audit.actionItems).toContainEqual(expect.objectContaining({
      title: expect.stringContaining("FAQ")
    }));
  });

  test("generates an action item when delivery information is missing", () => {
    const audit = auditProductPage({
      url: "https://example.com/software/no-delivery",
      html: completeProductHtml.replace(/<a href="\/downloads\/video-studio">[\s\S]*?<\/a>/, "")
    });

    expect(audit.hasDownloadOrDeliveryInfo).toBe(false);
    expect(audit.actionItems).toContainEqual(expect.objectContaining({
      title: expect.stringContaining("delivery")
    }));
  });

  test("calculates page score from weighted conversion signals", () => {
    const signals = extractProductPageSignals("<h1>Tool</h1><p>Product summary.</p><a>Buy now</a>", "https://example.com/software/tool");

    expect(calculateProductPageScore({
      ...signals,
      hasFeatureList: false,
      hasUseCases: false,
      hasTargetAudience: false,
      hasPricingOrPurchaseInfo: true,
      hasDownloadOrDeliveryInfo: false,
      hasFaqSection: false,
      hasMedia: false,
      hasRefundOrSupportInfo: false,
      hasComplianceNotice: false
    })).toBe(44);
    expect(auditProductPage({ url: "https://example.com/software/video-studio", html: completeProductHtml }).score).toBe(100);
  });
});
