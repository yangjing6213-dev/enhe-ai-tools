import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HOME_FEATURES } from "@/components/redesign/home/EnheRedesignFeatures";

function read(relativePath: string) {
  const path = join(process.cwd(), relativePath);
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

const globalStyles = read("src/app/globals.css");
const tokens = read("src/styles/redesign/tokens.css");
const refreshStyles = read("src/styles/redesign/site-refresh.css");
const home = read("src/components/redesign/home/EnheRedesignHome.tsx");
const featureCards = read("src/components/redesign/home/EnheRedesignFeatures.tsx");
const brandLockup = read("src/components/redesign/enhe-brand-lockup.tsx");
const authLayout = read("src/app/(auth)/layout.tsx");
const loginPage = read("src/app/(auth)/login/page-shell.tsx");
const registerPage = read("src/app/(auth)/register/page-shell.tsx");
const trendPage = read("src/app/ai-trends/page-shell.tsx");
const productPage = read("src/app/tools/[slug]/page-shell.tsx");

describe("ENHE public visual refresh contract", () => {
  it("loads the selected official rounded font locally and uses one bilingual family", () => {
    expect(globalStyles).toMatch(/@font-face\s*\{[\s\S]*?AlimamaFangYuanTi[\s\S]*?\.woff2[\s\S]*?font-display:\s*swap/);
    expect(globalStyles).toContain("--font-sans: 'Alimama Fang Yuan Ti'");
    expect(tokens).toContain('--enhe-font-zh: "Alimama Fang Yuan Ti"');
    expect(tokens).toContain('--enhe-font-en: "Alimama Fang Yuan Ti"');
  });

  it("adds four factual linked benefit cards below the home hero", () => {
    expect(home).toContain("<EnheRedesignFeatures locale={locale} />");
    expect(HOME_FEATURES).toHaveLength(4);
    expect(new Set(HOME_FEATURES.map((feature) => feature.href.zh)).size).toBe(4);
    expect(new Set(HOME_FEATURES.map((feature) => feature.href.en)).size).toBe(4);
    expect(featureCards).toContain('aria-label=');
  });

  it("uses a white, image-free hero, white cards, and a dark green footer", () => {
    expect(brandLockup).toContain("/images/enhe-logo-white.png");
    expect(refreshStyles).toMatch(/\.redesign-home-hero\s*\{[^}]*background-image:\s*none/);
    expect(refreshStyles).toMatch(/\.redesign-home-hero\s*\{[^}]*color:\s*var\(--enhe-text\)/);
    expect(tokens).toMatch(/--enhe-page-bg:\s*#fff/i);
    expect(tokens).toMatch(/--enhe-surface-elevated:\s*#fff/i);
    expect(tokens).toMatch(/--enhe-action:\s*#(?:[0-9a-f]{3}|[0-9a-f]{6})/i);
    expect(refreshStyles).toContain(".redesign-footer");
    expect(tokens).toContain("--enhe-footer: #001512");
    expect(refreshStyles).toContain(".enhe-redesign-production :is(.glass, .evidence-card, .dossier-card, .surface-panel");
    expect(globalStyles).toContain("select {\n  color-scheme: light;");
    expect(refreshStyles).toContain("font-size: clamp(1.25rem, 3.5vw, 3.75rem);");
  });

  it("applies the new shell and light-blue visual rules to login, AI Trends, and product details", () => {
    expect(authLayout).toContain("EnheRedesignPublicHeader");
    expect(authLayout).toContain("EnheRedesignPublicFooter");
    expect(loginPage).toContain('className="login-submit-button mt-8 w-full text-base"');
    expect(registerPage).toContain('className="login-submit-button mt-8 w-full text-base"');
    expect(refreshStyles).toContain(".enhe-auth-page");
    expect(refreshStyles).toMatch(/\.enhe-redesign-production \.enhe-auth-page \.login-submit-button\s*\{[^}]*background:\s*var\(--enhe-action\)\s*!important/);
    expect(refreshStyles).toContain(".ai-trends-page");
    expect(trendPage).toContain('className="ai-trends-primary-action"');
    expect(trendPage).toContain('className="ai-trends-secondary-action"');
    expect(refreshStyles).toContain(".enhe-redesign-production .ai-trends-page .ai-trends-primary-action");
    expect(refreshStyles).toContain(".tool-detail-hero-stack");
    expect(trendPage).toContain('className="ai-trends-page"');
    expect(productPage).toContain("tool-detail-hero-stack");
  });

  it("adds restrained hover, press, focus, and reduced-motion handling", () => {
    expect(refreshStyles).toContain(":hover");
    expect(refreshStyles).toContain(":active");
    expect(refreshStyles).toContain(":focus-visible");
    expect(refreshStyles).toContain("prefers-reduced-motion: reduce");
    expect(refreshStyles).toContain(".enhe-redesign-production .customer-support-launcher-label");
    expect(refreshStyles).toMatch(/\.enhe-redesign-production \.customer-support-launcher\s*\{[^}]*transition-property:\s*border-color\s*!important/);
    expect(refreshStyles).toContain(".enhe-redesign-production .enhe-contentless-page .enhe-contentless-action-primary");
    expect(refreshStyles).toContain(".enhe-redesign-production :is(button:not(:disabled)");
    expect(refreshStyles).toMatch(/\.enhe-redesign-production :is\(button:not\(:disabled\)[\s\S]*?\.enhe-contentless-action,[\s\S]*?:hover\s*\{/);
  });
});
