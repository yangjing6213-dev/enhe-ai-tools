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
    expect(html).toContain("enhe-white-en-preview.gif");
    expect(html).toContain("legal/privacy-policy");
  });

  it("retains the mascot by default for homepage review layering", () => {
    const html = renderToStaticMarkup(<EnheRedesignFooter locale="zh" />);
    expect(html).toContain("redesign-footer-mascot");
    expect(html).toContain("enhe-dino-peek-mirrored.webp");
  });

  it.each(["zh", "en"] as const)("adds a localized bookmark button to the social controls in %s", (locale) => {
    const html = renderToStaticMarkup(<EnheRedesignFooter locale={locale} />);
    expect(html).toContain("footer-social-bookmark");
    expect(html).toContain(locale === "en" ? "Bookmark this site" : "收藏本站");
  });

  it.each(["zh", "en"] as const)("uses destination-accurate help, tutorial, catalog, and news labels in %s", (locale) => {
    const html = renderToStaticMarkup(<EnheRedesignFooter locale={locale} />);
    if (locale === "zh") {
      expect(html).toContain("常见问题与联系");
      expect(html).toContain("工具使用教程");
      expect(html).toContain("AI教程与课程");
      expect(html).toContain("浏览 AI 工具");
      expect(html).toContain("AI资讯");
      expect(html).toContain("/about#faq-contact");
    } else {
      expect(html).toContain("FAQs &amp; Contact");
      expect(html).toContain("Tool Guides");
      expect(html).toContain("AI Tutorials &amp; Courses");
      expect(html).toContain("Browse AI Tools");
      expect(html).toContain("AI News");
      expect(html).toContain("/en/about#faq-contact");
    }
  });

  it.each(["zh", "en"] as const)("keeps the homepage QR out of the %s footer", (locale) => {
    const html = renderToStaticMarkup(<EnheRedesignFooter locale={locale} />);
    expect(html).not.toContain("role=\"img\"");
    expect(html).toContain('class="footer-bottom"');
  });
});
