import { describe, expect, test } from "vitest";
import {
  auditSeoPage,
  classifyPageType,
  extractPageSeoSignals
} from "../seo-page-auditor";

const html = `
<!doctype html>
<html>
  <head>
    <title>Windows AI Tool - ENHE</title>
    <meta name="description" content="Run local AI workflows on Windows.">
    <link rel="canonical" href="https://www.enhe-tech.com.cn/software/windows-ai">
    <meta name="robots" content="index,follow">
    <meta property="og:title" content="Windows AI Tool">
    <meta name="twitter:card" content="summary_large_image">
    <script type="application/ld+json">
      {"@context":"https://schema.org","@type":["SoftwareApplication","FAQPage"]}
    </script>
  </head>
  <body>
    <h1>Windows AI Tool</h1>
    <h2>FAQ</h2>
    <a href="/software">Software</a>
    <a href="https://example.com/source">Source</a>
    <img src="/a.png">
  </body>
</html>`;

describe("seo-page-auditor", () => {
  test("extracts title, meta description, h1, and canonical", () => {
    const signals = extractPageSeoSignals(html, "https://www.enhe-tech.com.cn/software/windows-ai");

    expect(signals.title).toBe("Windows AI Tool - ENHE");
    expect(signals.metaDescription).toBe("Run local AI workflows on Windows.");
    expect(signals.h1).toBe("Windows AI Tool");
    expect(signals.canonical).toBe("https://www.enhe-tech.com.cn/software/windows-ai");
  });

  test("extracts JSON-LD schema types", () => {
    const signals = extractPageSeoSignals(html, "https://www.enhe-tech.com.cn/software/windows-ai");

    expect(signals.hasStructuredData).toBe(true);
    expect(signals.structuredDataTypes).toEqual(expect.arrayContaining(["SoftwareApplication", "FAQPage"]));
  });

  test("creates risks for software detail pages missing Product or FAQ signals", () => {
    const audit = auditSeoPage({
      url: "https://www.enhe-tech.com.cn/software/no-schema",
      html: "<html><head><title>No Schema</title></head><body><h1>No Schema</h1><a href='/'>Home</a></body></html>",
      httpStatus: 200
    });

    expect(classifyPageType(audit.url)).toBe("software_detail");
    expect(audit.risks).toContain("Software detail page is missing Product or FAQ signals.");
    expect(audit.score).toBeLessThan(80);
  });
});
