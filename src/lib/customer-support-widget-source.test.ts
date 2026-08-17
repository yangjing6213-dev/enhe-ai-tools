import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("customer support widget source", () => {
  it("uses Chat for the English launcher and panel", () => {
    const source = readFileSync(
      new URL("../components/customer-support-widget.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain('launcherLabel: "Chat"');
    expect(source).toContain('title: "Chat"');
    expect(source).toContain('closeLabel: "Close chat"');
    expect(source).not.toContain('launcherLabel: "Customer support"');
  });

  it("keeps the mobile launcher safe-area aware and explicitly accessible", () => {
    const source = readFileSync(
      new URL("../components/customer-support-widget.tsx", import.meta.url),
      "utf8",
    );
    const shell = readFileSync(
      new URL("../styles/redesign/shell.css", import.meta.url),
      "utf8",
    );

    expect(shell).toContain("safe-area-inset-right");
    expect(shell).toContain("safe-area-inset-bottom");
    expect(shell).toContain("--support-safe-area-inline-end");
    expect(shell).toContain("--support-exclusion-applied");
    expect(shell).toContain(
      "right: calc(16px + var(--support-safe-area-inline-end))",
    );
    expect(source).toContain("aria-label={copy.launcherLabel}");
    expect(source).toContain("aria-expanded={isOpen}");
    expect(source).toContain('event.key === "Escape"');
    expect(source).toContain('event.key !== "Tab"');
    expect(source).toContain("launcherRef.current?.focus()");
    expect(source).toContain("autoFocus");
    expect(source).toContain("tabIndex={isOpen ? -1 : 0}");
    expect(source).not.toContain('window.addEventListener("keydown"');
  });

  it("uses the measured 484px text-mode breakpoint and shared exclusion tokens", () => {
    const widget = readFileSync(
      new URL("../components/customer-support-widget.tsx", import.meta.url),
      "utf8",
    );
    const shell = readFileSync(
      new URL("../styles/redesign/shell.css", import.meta.url),
      "utf8",
    );

    expect(widget).toContain("customer-support-widget");
    expect(widget).toContain("customer-support-launcher-label");
    expect(shell).toContain("--support-trigger-icon-size: 44px");
    expect(shell).toContain("--support-trigger-gap: 8px");
    expect(shell).toContain("--support-exclusion-compact: 52px");
    expect(shell).toContain("--support-exclusion-expanded: 104px");
    expect(shell).toContain("--support-text-mode-min-width: 484px");
    const widgetRules = shell.slice(
      shell.indexOf("--support-trigger-icon-size"),
      shell.indexOf(".redesign-header:lang(en)"),
    );
    expect(widgetRules).toContain("@media (width < 768px)");
    expect(widgetRules).toContain("@media (width < 484px)");
    expect(widgetRules).not.toContain("@media (max-width: 767px)");
    expect(shell).not.toContain("@media (max-width: 767px)");
    expect(shell).not.toContain("@media (max-width: 480px)");
  });

  it("keeps support feedback visible without filter motion and stops decorative reduced motion", () => {
    const widget = readFileSync(
      new URL("../components/customer-support-widget.tsx", import.meta.url),
      "utf8",
    );
    const shell = readFileSync(
      new URL("../styles/redesign/shell.css", import.meta.url),
      "utf8",
    );
    const reducedMotion = shell.slice(
      shell.lastIndexOf("@media (prefers-reduced-motion: reduce)"),
    );

    expect(widget).not.toContain("transition-[filter,opacity]");
    expect(widget).not.toContain("hover:brightness-110");
    expect(widget).toContain("transition-opacity");
    expect(widget).toContain("hover:opacity-90");
    expect(reducedMotion).toContain(".enhe-redesign-production .customer-support-launcher");
    expect(reducedMotion).toContain("transition-property: border-color");
    expect(reducedMotion).toContain("transform: none");
    expect(reducedMotion).toContain("#customer-support-panel .animate-spin");
    expect(reducedMotion).toContain("animation: none");
  });

  it("scopes the shared exclusion to approved product, footer, and home targets", () => {
    const card = readFileSync(
      new URL(
        "../components/redesign/software/EnheRedesignSoftwareCard.tsx",
        import.meta.url,
      ),
      "utf8",
    );
    const footer = readFileSync(
      new URL("../components/redesign/enhe-redesign-footer.tsx", import.meta.url),
      "utf8",
    );
    const catalog = readFileSync(
      new URL(
        "../components/redesign/software/EnheRedesignSoftwareCatalog.tsx",
        import.meta.url,
      ),
      "utf8",
    );
    const home = readFileSync(
      new URL(
        "../components/redesign/home/EnheRedesignProductShowcase.tsx",
        import.meta.url,
      ),
      "utf8",
    );
    const brandValue = readFileSync(
      new URL(
        "../components/redesign/home/EnheRedesignBrandValue.tsx",
        import.meta.url,
      ),
      "utf8",
    );
    const homeStyles = readFileSync(
      new URL("../styles/redesign/home.css", import.meta.url),
      "utf8",
    );
    const software = readFileSync(
      new URL("../styles/redesign/software.css", import.meta.url),
      "utf8",
    );
    const shell = readFileSync(
      new URL("../styles/redesign/shell.css", import.meta.url),
      "utf8",
    );

    expect(card).toContain("data-support-exclusion={sectionId}");
    expect(footer).not.toContain('data-support-exclusion="footer"');
    expect(catalog).not.toContain('data-support-exclusion="pagination"');
    expect(home).not.toContain('data-support-exclusion="home-control"');
    expect(brandValue).toContain('data-support-exclusion="home-brand-cta"');
    expect(homeStyles).toContain(
      '[data-support-exclusion="home-brand-cta"]',
    );
    expect(homeStyles).toContain("var(--support-exclusion-applied)");
    expect(homeStyles).not.toContain("@media (max-width: 767px)");
    expect(home).toContain('className="redesign-home-product-control"');
    expect(software).toContain("var(--support-exclusion-applied)");
    expect(software).toContain("[data-catalog-card]:nth-child(2n)");
    expect(software).toContain("[data-catalog-card]:nth-child(3n)");
    expect(software).toContain("[data-catalog-card]:nth-child(4n)");
    expect(software).toContain("@media (width < 768px)");
    expect(software).toContain("@media (768px < width <= 1024px)");
    expect(software).toContain("@media (width > 1024px)");
    expect(software).not.toContain("@media (max-width: 767px)");
    expect(software).not.toContain("--mobile-support-action-reserve");
    expect(software).toContain(".redesign-software-load-row {");
    expect(shell).toContain(".footer-grid nav:last-child,");
    expect(shell).toContain("> .redesign-home-product-control");
    expect(shell).not.toContain('[data-support-exclusion="footer"]');
    expect(shell).not.toContain('[data-support-exclusion="home-control"]');
  });

  it("requires measured all-products baselines and a reflowing 200% browser check", () => {
    const harness = readFileSync(
      new URL("../../tests/e2e/mobile-support-r4-harness.mjs", import.meta.url),
      "utf8",
    );

    expect(harness).toContain("measureAllProductsWithoutExclusion");
    expect(harness).toContain("baselineCardWidthMatch === true");
    expect(harness).not.toContain("baselineCardWidthMatch !== false");
    expect(harness).not.toContain("Emulation.setPageScaleFactor");
    expect(harness).toContain("zoom200PreLayoutWidth");
    expect(harness).toContain("zoom200LayoutWidth");
    expect(harness).toContain("Missing visible targets for ${plan.type}");
    expect(harness).toContain("missingTargetTypes");
    expect(harness).toContain("missingRelevantTargetTypes");
    expect(harness).toContain("relevantTargetSampleCounts");
    expect(harness).toContain("requireRelevant: false");
    expect(harness).toContain("invalidGeometrySamples");
    expect(harness).toContain("measurement.verticalIntersection > 0");
    expect(harness).toContain("Number.isFinite(minimumGap)");
    expect(harness).toContain("Number.isFinite(zoomMinimumGap)");
    expect(harness).toContain(
      "summarizeTargetCoverage(state.measurements, stressPlans)",
    );
    expect(harness).toContain("zoom200MissingTargetTypes");
    expect(harness).toContain("zoom200InvalidGeometrySamples");
    expect(harness).toContain("fractional-boundary-matrix");
    expect(harness).toContain("767.5");
    expect(harness).toContain("768.5");
    expect(harness).toContain("1024.5");
    expect(harness).toContain(
      "--support-exclusion-current: var(--phase2c21r4-test-reserve) !important",
    );
    expect(harness).toContain("display: inline !important");
    expect(harness).toContain("simulated && runs < 2");
  });
});
