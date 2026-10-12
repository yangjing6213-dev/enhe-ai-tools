import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, describe, expect, it, vi } from "vitest";
import { EnheRedesignHero } from "@/components/redesign/home/EnheRedesignHero";

vi.stubGlobal("React", React);
afterAll(() => vi.unstubAllGlobals());
vi.mock("@/components/MaskedHeading", () => ({
  default: ({ text }: { text: string }) => <span>{text}</span>,
}));

describe("homepage StarBorder action", () => {
  it.each([
    ["zh", "/software"],
    ["en", "/en/software"],
  ] as const)("keeps the %s tools link and renders the decorative border", (locale, href) => {
    const html = renderToStaticMarkup(<EnheRedesignHero locale={locale} />);
    expect(html).toContain(`href="${href}"`);
    expect(html).toContain('class="star-border redesign-home-cta"');
    expect(html).toContain('--star-border-radius:12px');
    expect(html).toContain('--star-border-text:#ffffff');
    expect(html).toContain('class="star-border__light" aria-hidden="true"');
  });
});
