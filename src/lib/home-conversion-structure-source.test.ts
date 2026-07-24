import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("homepage conversion structure contract", () => {
  it("adds verifiable trust, task outcomes, a three-step workflow, and a final CTA", () => {
    const page = readFileSync(
      new URL("../app/page-shell.tsx", import.meta.url),
      "utf8",
    );
    const dictionaries = readFileSync(
      new URL("../lib/dictionaries.ts", import.meta.url),
      "utf8",
    );
    const css = readFileSync(
      new URL("../app/globals.css", import.meta.url),
      "utf8",
    ).replace(/\r\n/g, "\n");

    expect(dictionaries).toContain(
      "让每一个普通人，都能轻松驾驭AI，把想法变成现实，把效率变成价值。",
    );
    expect(dictionaries).toContain(
      "Helping everyone use AI with confidence—turn ideas into creations and productivity into value.",
    );

    expect(page).toContain("const homeTrustSignals: Record<Locale, HomeTrustSignal[]> = {");
    expect(page).toContain('className="home-decision-card-shell"');
    expect(page).toContain('className="home-seo-disclosure home-decision-disclosure"');
    expect(page).toContain('href: "/llms.txt"');
    expect(page).toContain('href: "/about"');
    expect(page).toContain('href: "/legal/privacy-policy"');

    expect(page).toContain("const homeTaskOutcomes: Record<Locale, HomeTaskOutcome[]> = {");
    expect(page).toContain('className="home-task-outcomes-shell"');
    expect(page.match(/className="home-task-outcome-link/g)).toHaveLength(1);
    expect(page).toContain('href: "/product-paths/work-efficiency"');
    expect(page).toContain('href: "/product-paths/media-generation"');
    expect(page).toContain('href: "/skill-learning"');
    expect(page).toContain('href: "/ai-news"');
    expect(page).not.toContain("<FlowingMenu");
    expect(page).not.toContain('className="home-flowing-menu-shell"');

    expect(page).toContain("const homeWorkflowSteps = {");
    expect(page).toContain('className="home-workflow-list"');
    expect(page).toContain('className="home-final-cta-band"');
    expect(page).toContain('data-analytics-meta-placement="home-final-cta"');

    expect(css).toContain(".home-decision-card-shell {");
    expect(css).toContain(".home-task-outcomes-shell,");
    expect(css).toContain(".home-final-cta-band {");
    expect(css).not.toContain(".home-hero-cta-primary {");
    expect(css).not.toContain(".home-hero-actions {");
    expect(css).toContain("padding: clamp(2.2rem, 5.8vh, 4.8rem) 0;");
    expect(css).toContain("outline: 1px solid rgba(255, 255, 255, 0.1);");
    expect(css).toContain(".home-task-outcome-link:active {");
    expect(css).toContain("transform: scale(0.96);");
  });
});
