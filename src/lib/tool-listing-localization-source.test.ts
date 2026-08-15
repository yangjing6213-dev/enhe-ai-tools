import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("tool listing localization source", () => {
  it("localizes tool cards and english category labels through shared helpers", () => {
    const toolCardSource = readFileSync(join(process.cwd(), "src/components/tool-card.tsx"), "utf8");
    const softwareSource = readFileSync(join(process.cwd(), "src/lib/redesign/software/software-production.ts"), "utf8");
    const softwareCategorySource = readFileSync(join(process.cwd(), "src/lib/redesign/software/software-categories.ts"), "utf8");
    const onlineSource = readFileSync(join(process.cwd(), "src/app/online-tools/page-shell.tsx"), "utf8");

    expect(toolCardSource).toContain('from "@/lib/tool-localization"');
    expect(toolCardSource).toContain("resolveLocalizedToolCategoryName");
    expect(toolCardSource).toContain("resolveLocalizedToolIdentity");
    expect(toolCardSource).toContain("buildLocalizedToolPreviewText");
    expect(softwareSource).toContain("resolveLocalizedToolIdentity");
    expect(softwareSource).toContain("buildLocalizedToolPreviewText");
    expect(softwareCategorySource).toContain('id: "video"');
    expect(softwareCategorySource).toContain('id: "efficiency"');
    expect(onlineSource).toContain("resolveLocalizedToolCategoryName");
  });

  it("keeps P1 purchase decision strips above product grids and conversion metadata inside tool cards", () => {
    const toolCardSource = readFileSync(join(process.cwd(), "src/components/tool-card.tsx"), "utf8");
    const softwareSource = readFileSync(join(process.cwd(), "src/components/redesign/software/EnheRedesignSoftwareCatalog.tsx"), "utf8");
    const softwareCardSource = readFileSync(join(process.cwd(), "src/components/redesign/software/EnheRedesignSoftwareCard.tsx"), "utf8");
    const accountServicesSource = readFileSync(join(process.cwd(), "src/app/account-services/page-shell.tsx"), "utf8");
    const skillLearningSource = readFileSync(join(process.cwd(), "src/app/skill-learning/page-shell.tsx"), "utf8");
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

    expect(softwareSource).toContain("<EnheRedesignSoftwareCategorySelector");
    expect(softwareSource.indexOf("<EnheRedesignSoftwareCategorySelector")).toBeLessThan(
      softwareSource.indexOf('data-section="all-products"'),
    );
    expect(softwareCardSource).toContain("<dd>{product.price}</dd>");
    expect(softwareCardSource.indexOf("<dd>{product.price}</dd>")).toBeLessThan(
      softwareCardSource.indexOf("href={product.detailHref}"),
    );
    expect(accountServicesSource).toContain("<ListingGuidanceFold forceLocale={forceLocale} />");
    expect(accountServicesSource.indexOf("<ListingGuidanceFold")).toBeLessThan(accountServicesSource.indexOf("<FilterBar"));
    expect(accountServicesSource).toContain("<ListingDecisionStrip");
    expect(accountServicesSource).toContain('className="listing-grid mt-8 grid gap-5 md:grid-cols-3"');
    expect(skillLearningSource).toContain("<ListingDecisionStrip");
    expect(skillLearningSource.indexOf("<ListingDecisionStrip")).toBeLessThan(
      skillLearningSource.indexOf("<FilterBar"),
    );
    expect(skillLearningSource).toContain('className="listing-grid mt-8 grid gap-5 md:grid-cols-3"');

    expect(toolCardSource).toContain("const commerceLabel =");
    expect(toolCardSource).toContain("const deliveryLabel =");
    expect(toolCardSource).toContain("tool-card-commerce");
    expect(toolCardSource).toContain("tool-card-primary-action");
    expect(toolCardSource).toContain("t.toolCard.compareBeforeBuy");
    expect(toolCardSource).toContain("t.toolCard.deliveryLabel");
    expect(css).toContain(".listing-decision-strip");
    expect(css).toContain(".tool-card-commerce");
    expect(css).toContain(".tool-card-primary-action");
  });

  it("keeps P2 trust notes compact and reachable before filtering", () => {
    const softwareSource = readFileSync(join(process.cwd(), "src/components/redesign/software/EnheRedesignSoftwareCatalog.tsx"), "utf8");
    const softwareCopySource = readFileSync(join(process.cwd(), "src/lib/redesign/software/software-copy.ts"), "utf8");
    const accountServicesSource = readFileSync(join(process.cwd(), "src/app/account-services/page-shell.tsx"), "utf8");
    const skillLearningSource = readFileSync(join(process.cwd(), "src/app/skill-learning/page-shell.tsx"), "utf8");
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

    expect(softwareSource).toContain("copy.page.intro");
    expect(softwareSource.indexOf("copy.page.intro")).toBeLessThan(
      softwareSource.indexOf("<EnheRedesignSoftwareCategorySelector"),
    );
    expect(softwareCopySource).toContain("价格与使用边界");
    expect(softwareCopySource).toContain("price and boundaries");
    expect(accountServicesSource).toContain("<ListingGuidanceFold forceLocale={forceLocale} />");
    expect(accountServicesSource.indexOf("<ListingGuidanceFold")).toBeLessThan(accountServicesSource.indexOf("<FilterBar"));
    expect(accountServicesSource).toContain("ListingTrustNote");
    expect(accountServicesSource).toContain('className="listing-trust-note"');
    expect(skillLearningSource).toContain("ListingTrustNote");
    expect(skillLearningSource).toContain('className="listing-trust-note"');
    expect(skillLearningSource.indexOf("<ListingTrustNote")).toBeGreaterThan(
      skillLearningSource.indexOf("<ListingDecisionStrip"),
    );
    expect(skillLearningSource.indexOf("<ListingTrustNote")).toBeLessThan(
      skillLearningSource.indexOf("<FilterBar"),
    );

    expect(accountServicesSource).toContain("Official platform rules remain the final source.");
    expect(skillLearningSource).toContain("Course pages should make the outcome and delivery clear before purchase.");
    expect(css).toContain(".listing-trust-note");
    expect(css).toContain(".listing-trust-note a");
  });
});
