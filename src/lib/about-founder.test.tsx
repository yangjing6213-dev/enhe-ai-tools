import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, expect, it, vi } from "vitest";
import { AboutFounder } from "@/components/about-founder";

vi.stubGlobal("React", React);
afterAll(() => vi.unstubAllGlobals());

it.each(["zh", "en"] as const)("renders the %s founder with the supplied identity and contacts", locale => {
  const html = renderToStaticMarkup(<AboutFounder locale={locale} />);
  expect(html).toContain(locale === "zh" ? "网站创始人" : "Website Founder");
  expect(html).toContain("Enhe（恩禾）");
  expect(html).toContain('src="/images/about/enhe-founder.webp"');
  expect(html).toContain('href="mailto:amen.enhe@gmail.com"');
  expect(html).toContain('href="https://github.com/yangjing6213-dev"');
  expect(html).toContain('href="https://x.com/Amenenhe_ai"');
  expect(html).toContain("ENHE-AI");
  expect(html).not.toContain("Online");
});
