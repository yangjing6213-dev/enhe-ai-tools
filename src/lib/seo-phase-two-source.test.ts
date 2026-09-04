import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("seo phase two source contracts", () => {
  it("keeps english public routing indexable and locale-aware", () => {
    const enLayout = read("src/app/en/layout.tsx");
    const publicChrome = read("src/components/public-site-chrome.tsx");
    const header = read("src/components/site-header.tsx");
    const footer = read("src/components/site-footer.tsx");

    expect(enLayout).toContain("RootDocument");
    expect(enLayout).toContain('lang="en-US"');
    expect(publicChrome).toContain("buildLanguageAlternates");
    expect(header).toContain('href={buildLocalePath("/user", locale)}');
    expect(header).toContain('href={buildLocalePath("/login", locale)}');
    expect(footer).toContain("buildLocalePath");
  });

  it("keeps sitemap alternates and localized urls in the generated source", () => {
    const sitemap = read("src/app/sitemap.ts");

    expect(sitemap).toContain('"/en"');
    expect(sitemap).toContain('"/en/software"');
    expect(sitemap).toContain('"/en/account-services"');
    expect(sitemap).not.toContain('"/en/online-tools"');
    expect(sitemap).toContain('"/en/skill-learning"');
    expect(sitemap).toContain('"/en/pricing"');
    expect(sitemap).toContain('"/en/tutorials"');
    expect(sitemap).toContain("alternates:");
    expect(sitemap).toContain("languages:");
  });

  it("uses locale-specific website schema language and icon assets", () => {
    const publicChrome = read("src/components/public-site-chrome.tsx");
    const layout = read("src/app/root-layout-shared.tsx");
    const seo = read("src/lib/seo.ts");

    expect(publicChrome).toContain('inLanguage: forceLocale === "en" ? "en-US" : "zh-CN"');
    expect(layout).toContain("/images/brand/enhe-icon-gradient-white-bg-cropped.png");
    expect(seo).toContain('export const defaultOgImage = "/images/brand/enhe-icon-gradient-transparent-cropped.png"');
  });

  it("keeps user-facing auth redirects locale-aware", () => {
    const actions = read("src/app/actions.ts");

    expect(actions).toContain('redirect(`${buildLocalePath("/user", locale)}?password=${encodeURIComponent("当前密码不正确")}`);');
    expect(actions).not.toContain('redirect(`/user?password=${encodeURIComponent("当前密码不正确")}`);');
  });
});
