import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../..");

describe("product detail UI source", () => {
  it("keeps product FAQ visible above comments without rendering empty disclosure cards", () => {
    const pageSource = readFileSync(
      resolve(root, "src/app/tools/[slug]/page-shell.tsx"),
      "utf8",
    );

    expect(pageSource).toContain(
      "const visibleFaqPreview = visibleFaqs.slice(0, 3)",
    );
    expect(pageSource).toContain("const hasTutorialSection =");
    expect(pageSource).toContain("...(hasTutorialSection");
    expect(pageSource).toContain(
      'className="tool-detail-faq-card glass scroll-mt-24 rounded-2xl p-7"',
    );
    expect(pageSource).not.toContain(
      'id="tool-faq"\n            className="tool-detail-mobile-disclosure glass scroll-mt-24 rounded-2xl p-7"',
    );
    expect(pageSource.indexOf("{!isAiWorkflow ? faqSection : null}")).toBeLessThan(
      pageSource.indexOf("td.commentsTitle"),
    );
  });

  it("places the purchase button below the payment helper copy", () => {
    const pageSource = readFileSync(
      resolve(root, "src/app/tools/[slug]/page-shell.tsx"),
      "utf8",
    );

    expect(pageSource).toContain("tool-detail-payment-method-grid");
    expect(pageSource).toContain("tool-detail-payment-help");
    expect(pageSource).not.toContain(
      "sm:grid-cols-[minmax(180px,220px)_auto] sm:items-end",
    );
    expect(pageSource.indexOf("paymentMethodHelpId")).toBeLessThan(
      pageSource.indexOf("<FormSubmitButton"),
    );
  });
});
