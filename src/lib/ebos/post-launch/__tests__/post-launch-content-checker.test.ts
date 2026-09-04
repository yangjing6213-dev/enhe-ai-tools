import { describe, expect, test } from "vitest";
import { checkValidationPageContent } from "../post-launch-content-checker";

function completeHtml(overrides: { body?: string; title?: string; description?: string } = {}) {
  const title = overrides.title ?? "AI Prompt Kit Validation";
  const description = overrides.description ?? "Validate AI Prompt Kit with ENHE.";
  const body = overrides.body ?? [
    "<main>",
    "<h1>AI Prompt Kit</h1>",
    "<a href=\"mailto:hello@example.com\">Contact us</a>",
    "<section><h2>FAQ</h2><p>Common questions.</p></section>",
    "<section><h2>Compliance</h2><p>Disclaimer: validate outputs before use.</p></section>",
    "</main>"
  ].join("");
  return `<!doctype html><html><head><title>${title}</title><meta name="description" content="${description}"></head><body>${body}${"x".repeat(600)}</body></html>`;
}

describe("post-launch content checker", () => {
  test("passes complete validation page content", () => {
    const result = checkValidationPageContent(completeHtml(), "/validation/ai-prompt-kit");

    expect(result.blockers).toEqual([]);
    expect(result.contentChecks.every((item) => item.status === "pass")).toBe(true);
    expect(result.ctaChecks[0]?.status).toBe("pass");
    expect(result.faqChecks[0]?.status).toBe("pass");
    expect(result.complianceChecks[0]?.status).toBe("pass");
    expect(result.metadataChecks.every((item) => item.status === "pass")).toBe(true);
  });

  test("fails empty HTML", () => {
    const result = checkValidationPageContent("", "/validation/ai-prompt-kit");

    expect(result.blockers.join("\n")).toContain("Non-empty HTML");
  });

  test("fails Next.js error page", () => {
    const result = checkValidationPageContent(
      completeHtml({ body: "<main><h1>Application error</h1><p>An error occurred in the Server Components render.</p></main>" }),
      "/validation/ai-prompt-kit"
    );

    expect(result.blockers.join("\n")).toContain("Next.js error");
  });

  test("fails 404 fallback", () => {
    const result = checkValidationPageContent(
      completeHtml({ body: "<main><h1>404</h1><p>This page could not be found.</p></main>" }),
      "/validation/ai-prompt-kit"
    );

    expect(result.blockers.join("\n")).toContain("404 fallback");
  });

  test("fails when CTA is missing", () => {
    const result = checkValidationPageContent(
      completeHtml({ body: "<main><h1>AI Prompt Kit</h1><section><h2>FAQ</h2></section><section><h2>Compliance</h2></section></main>" }),
      "/validation/ai-prompt-kit"
    );

    expect(result.ctaChecks[0]?.status).toBe("fail");
    expect(result.blockers.join("\n")).toContain("CTA present");
  });

  test("fails when FAQ is missing", () => {
    const result = checkValidationPageContent(
      completeHtml({ body: "<main><h1>AI Prompt Kit</h1><a>Contact</a><section><h2>Compliance</h2></section></main>" }),
      "/en/validation/ai-prompt-kit"
    );

    expect(result.faqChecks[0]?.status).toBe("fail");
    expect(result.blockers.join("\n")).toContain("FAQ present");
  });
});
