import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EnheRedesignFooter } from "./enhe-redesign-footer";

Object.assign(globalThis, { React });

describe("footer decoration around account forms", () => {
  it.each(["zh", "en"] as const)("omits only the mascot when %s forms need clear controls", (locale) => {
    const html = renderToStaticMarkup(<EnheRedesignFooter locale={locale} showMascot={false} />);
    expect(html).not.toContain("redesign-footer-mascot");
    expect(html).not.toContain("enhe-dino-peek-mirrored.webp");
    expect(html).toContain("redesign-footer-inner");
    expect(html).toContain("enhe-footer-wordmark.png");
    expect(html).toContain("legal/privacy-policy");
  });

  it("retains the mascot by default for homepage review layering", () => {
    const html = renderToStaticMarkup(<EnheRedesignFooter locale="zh" />);
    expect(html).toContain("redesign-footer-mascot");
    expect(html).toContain("enhe-dino-peek-mirrored.webp");
  });
});
