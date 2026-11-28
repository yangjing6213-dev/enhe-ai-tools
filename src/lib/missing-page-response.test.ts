import { describe, expect, it } from "vitest";
import { createMissingPageResponse } from "./missing-page-response";

describe("localized missing page typography", () => {
  it.each([
    { locale: "zh" as const, language: "zh-CN", family: '"OPPO Sans 4.0"', fontPath: "/fonts/oppo-sans-4/oppo-sans-4.0-4f58dbaeaea7.ttf", preloadPath: "/fonts/oppo-sans-4/oppo-sans-4.0-4f58dbaeaea7.ttf" },
    { locale: "en" as const, language: "en-US", family: '"MiSans"', fontPath: "/fonts/misans-latin/MiSansLatin-Regular-fc17182f3f2b.woff2", preloadPath: "/fonts/misans-latin/MiSansLatin-Regular-fc17182f3f2b.woff2" },
  ])("serves the $locale missing page with its site font and preload", ({ locale, language, family, fontPath, preloadPath }) => {
    const response = createMissingPageResponse(locale);

    expect(response.status).toBe(404);
    expect(response.headers.get("content-language")).toBe(language);

    return response.text().then((html) => {
      expect(html).toContain(`<html lang="${language}">`);
      expect(html).toContain(`<link rel="preload" href="${preloadPath}" as="font"`);
      expect(html).toContain(`font-family:${family}`);
      expect(html).toContain(`src:url("${fontPath}")`);
      expect(html).not.toMatch(/body\{[^}]*font:[^}]*system-ui,sans-serif/i);
    });
  });
});
