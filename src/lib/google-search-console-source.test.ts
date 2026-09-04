import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

function trackedSourceFiles() {
  return execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" })
    .split(/\r?\n/)
    .filter((file) => /\.(cjs|css|js|json|md|mjs|prisma|sql|ts|tsx|txt|yml|yaml)$/.test(file))
    .filter((file) => existsSync(join(root, file)));
}

describe("Google Search Console SEO source contract", () => {
  it("publishes typed canonical detail routes for software, courses, and account services", () => {
    const routeFiles = [
      "src/app/(zh-public)/software/[slug]/page.tsx",
      "src/app/en/software/[slug]/page.tsx",
      "src/app/(zh-public)/skill-learning/[slug]/page.tsx",
      "src/app/en/skill-learning/[slug]/page.tsx",
      "src/app/(zh-public)/account-services/[slug]/page.tsx",
      "src/app/en/account-services/[slug]/page.tsx"
    ];

    for (const routeFile of routeFiles) {
      expect(existsSync(join(root, routeFile)), routeFile).toBe(true);
    }

    const publicSlugs = read("src/lib/public-slugs.ts");
    expect(publicSlugs).toContain('"/software"');
    expect(publicSlugs).toContain('"/skill-learning"');
    expect(publicSlugs).toContain('"/account-services"');
    expect(publicSlugs).not.toContain('`/tools/${getCanonicalToolSlug(tool)}`');
  });

  it("keeps sitemap on canonical public URLs and excludes private or legacy paths", () => {
    const sitemap = read("src/app/sitemap.ts");

    expect(sitemap).toContain("buildCanonicalToolPath");
    expect(sitemap).toContain("shouldIndexEnglishToolPage");
    expect(sitemap).toContain('"/software"');
    expect(sitemap).toContain('"/skill-learning"');
    expect(sitemap).toContain('"/account-services"');
    expect(sitemap).not.toContain('const toolDetailBasePath = "/tools";');
    expect(sitemap).not.toContain('"/online-tools"');
    expect(sitemap).not.toContain('"/en/online-tools"');
    expect(sitemap).not.toContain('"/admin"');
    expect(sitemap).not.toContain('"/dashboard"');
    expect(sitemap).not.toContain('"/user-center"');
    expect(sitemap).not.toContain('"/checkout"');
    expect(sitemap).not.toContain('"/orders"');
    expect(sitemap).not.toContain('"/payment"');
  });

  it("blocks non-public surfaces in robots while exposing the sitemap", () => {
    const robots = read("src/app/robots.ts");

    expect(robots).toContain('absoluteUrl("/sitemap.xml")');
    expect(robots).toContain('"Baiduspider"');
    for (const blockedPath of ["/admin", "/dashboard", "/user-center", "/checkout", "/orders", "/payment", "/api"]) {
      expect(robots).toContain(blockedPath);
    }

    for (const publicPath of ["/ai-news", "/software", "/skill-learning", "/account-services"]) {
      expect(robots).not.toContain(`"${publicPath}"`);
    }
  });

  it("keeps legacy public routes as permanent redirects instead of sitemap targets", () => {
    const nextConfig = read("next.config.ts");
    const zhOnline = read("src/app/(zh-public)/online-tools/page.tsx");
    const zhOnlineDetail = read("src/app/(zh-public)/online-tools/[slug]/page.tsx");
    const enOnline = read("src/app/en/online-tools/page.tsx");
    const enOnlineDetail = read("src/app/en/online-tools/[slug]/page.tsx");
    const zhToolsDetail = read("src/app/(zh-public)/tools/[slug]/route.ts");
    const enToolsDetail = read("src/app/en/tools/[slug]/route.ts");
    const legacyToolRedirect = read("src/lib/legacy-tool-redirect.ts");

    expect(nextConfig).toContain("redirects()");
    expect(nextConfig).toContain('source: "/online-tools"');
    expect(nextConfig).toContain('destination: "/account-services"');
    expect(nextConfig).toContain('source: "/online-tools/:slug*"');
    expect(nextConfig).toContain('destination: "/account-services/:slug*"');
    expect(nextConfig).toContain('source: "/en/online-tools"');
    expect(nextConfig).toContain('destination: "/en/account-services"');
    expect(nextConfig).toContain('source: "/en/online-tools/:slug*"');
    expect(nextConfig).toContain('destination: "/en/account-services/:slug*"');
    expect(nextConfig).toContain("statusCode: 301");
    expect(zhOnline).toContain("permanentRedirect");
    expect(zhOnline).toContain('"/account-services"');
    expect(zhOnlineDetail).toContain("permanentRedirect");
    expect(zhOnlineDetail).toContain("`/account-services/${slug}`");
    expect(enOnline).toContain("permanentRedirect");
    expect(enOnline).toContain('"/en/account-services"');
    expect(enOnlineDetail).toContain("permanentRedirect");
    expect(enOnlineDetail).toContain("`/en/account-services/${slug}`");
    expect(zhToolsDetail).toContain("buildLegacyToolDetailRedirectResponse");
    expect(zhToolsDetail).toContain('NextResponse.json({ error: "Not found" }, { status: 404 })');
    expect(enToolsDetail).toContain("buildLegacyToolDetailRedirectResponse");
    expect(legacyToolRedirect).toContain("absoluteUrl(buildCanonicalToolPath(tool, forceLocale))");
    expect(legacyToolRedirect).toContain("NextResponse.redirect(absoluteUrl(buildCanonicalToolPath(tool, forceLocale)), 301)");
  });

  it("does not ship hardcoded HTTP production links in tracked source files", () => {
    const productionHttpOrigin = "http://" + "www.enhe-tech.com.cn";
    const offenders = trackedSourceFiles().filter((file) => {
      if (file === "src/lib/redirect-url.test.ts") return false;
      const source = read(file);
      return source.includes(productionHttpOrigin);
    });

    expect(offenders).toEqual([]);
  });

  it("keeps webmaster verification metadata in the shared root head", () => {
    const rootLayout = read("src/app/root-layout-shared.tsx");

    expect(rootLayout).toContain("verification");
    expect(rootLayout).toContain("baidu-site-verification");
    expect(rootLayout).toContain("codeva-LZTyTXt0Fq");
  });
});
