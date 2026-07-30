import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("site footer social source", () => {
  it("moves the social buttons into the contact slot and removes the email pill", () => {
    const footer = readFileSync(
      new URL("../components/site-footer.tsx", import.meta.url),
      "utf8",
    );

    expect(footer).toContain("href: companyProfile.email.href");
    expect(footer).toContain("href: companyProfile.phone.href");
    expect(footer).toContain('href: "https://www.youtube.com/@ENHE-AI"');
    expect(footer).toContain('className="site-footer-newsletter-socials"');
    expect(footer).not.toContain("site-footer-contact-button");
    expect(footer).not.toContain("site-footer-kicker");
  });
});
