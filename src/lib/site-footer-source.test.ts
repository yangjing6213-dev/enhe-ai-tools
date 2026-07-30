import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("site footer source", () => {
  it("keeps footer links valid after removing homepage featured content", () => {
    const footer = readFileSync(new URL("../components/site-footer.tsx", import.meta.url), "utf8");
    const header = readFileSync(new URL("../components/site-header.tsx", import.meta.url), "utf8");
    const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

    expect(footer).toContain("t.footer.helpSupport");
    expect(footer).not.toContain("t.nav.updates");
    expect(footer).not.toContain('buildLocalePath("/#updates", locale)');
    expect(footer).toContain('buildLocalePath("/legal/user-agreement", locale)');
    expect(header).not.toContain("甯姪鏀寔");
    expect(css).toContain(".site-user-chip");
    expect(css).toContain("min-height: 44px");
    expect(css).toContain("padding: 0 13px");
    expect(css).not.toMatch(/\.site-footer\s*\{[^}]*border-top:/);
  });

  it("publishes company contact information in the footer", () => {
    const footer = readFileSync(new URL("../components/site-footer.tsx", import.meta.url), "utf8");

    expect(footer).toContain('import { companyProfile } from "@/lib/company-profile"');
    expect(footer).toContain("companyProfile.name[locale]");
    expect(footer).toContain("companyProfile.address[locale]");
    expect(footer).toContain("companyProfile.phone.href");
    expect(footer).toContain("companyProfile.email.href");
  });

  it("keeps every footer group available through a visible disclosure", () => {
    const footer = readFileSync(new URL("../components/site-footer.tsx", import.meta.url), "utf8");
    const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8").replace(/\r\n/g, "\n");

    expect(footer.match(/<details className="site-footer-disclosure">/g)).toHaveLength(2);
    expect(footer).toContain("ChevronDown");
    expect(footer).not.toContain("site-footer-group-title-desktop");
    expect(css).toContain(
      ".site-footer-disclosure > summary {\n  display: flex;\n  min-height: 52px;",
    );
    expect(css).not.toContain(".site-footer-disclosure {\n    display: contents;");
  });

  it("keeps the footer brand area concise", () => {
    const footer = readFileSync(new URL("../components/site-footer.tsx", import.meta.url), "utf8");
    const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

    expect(footer).not.toContain("site-footer-summary");
    expect(footer).not.toContain("汇集AI前沿资讯");
    expect(css).not.toContain(".site-footer-summary");
  });
});
