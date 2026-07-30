import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  const absolutePath = join(process.cwd(), path);
  expect(existsSync(absolutePath), `${path} should exist`).toBe(true);
  return existsSync(absolutePath) ? readFileSync(absolutePath, "utf8") : "";
}

describe("AI Skill module source contracts", () => {
  it("adds AI Skill navigation directly after AI Tools", () => {
    const header = source("src/components/site-header.tsx");
    const softwareIndex = header.indexOf("label: t.nav.software");
    const aiSkillIndex = header.indexOf("label: t.nav.aiSkill");
    const newsIndex = header.indexOf("label: t.nav.aiNews");

    expect(softwareIndex).toBeGreaterThan(-1);
    expect(aiSkillIndex).toBeGreaterThan(softwareIndex);
    expect(aiSkillIndex).toBeLessThan(newsIndex);
  });

  it("renders the AI Skill showcase after the product demo section", () => {
    const home = source("src/app/page-shell.tsx");
    expect(home).toContain("home-ai-skill-shell");
    expect(home.indexOf("home-ai-skill-shell")).toBeGreaterThan(
      home.indexOf("home-product-demo-shell"),
    );
  });

  it("provides bilingual public and admin routes", () => {
    for (const path of [
      "src/app/(zh-public)/ai-skills/page.tsx",
      "src/app/(zh-public)/ai-skills/[slug]/page.tsx",
      "src/app/en/ai-skills/page.tsx",
      "src/app/en/ai-skills/[slug]/page.tsx",
      "src/app/admin/ai-skills/page.tsx",
      "src/app/admin/ai-skills/[id]/page.tsx",
    ]) {
      source(path);
    }
  });

  it("protects the ZIP upload route with admin authorization", () => {
    const uploadRoute = source("src/app/api/admin/ai-skill-upload/route.ts");
    expect(uploadRoute).toContain("await requireAdmin()");
    expect(uploadRoute).toContain("validateAiSkillPackage");
    expect(uploadRoute).toContain('folder: "ai-skills"');
    expect(uploadRoute).toContain('access: "private"');
    expect(uploadRoute).toContain('stored.storage === "local" ? null : stored.fileUrl');
    expect(uploadRoute).toContain("isZipFileSignature");

    const downloadRoute = source("src/app/api/tools/[id]/download/route.ts");
    expect(downloadRoute).toContain("resolvePrivateLocalUploadPath");
    expect(downloadRoute).toContain('"Content-Disposition"');

    const detailPage = source("src/app/tools/[slug]/page-shell.tsx");
    expect(detailPage).toMatch(/isAiSkill\s*\?\s*hasDownloadLink/);
    expect(detailPage).toMatch(/isAiSkill\s*\?\s*forceLocale === "en"/);
  });

  it("publishes the AI Skill listing routes to search discovery", () => {
    const manifest = source("src/lib/public-discovery-manifest.ts");
    expect(manifest).toContain('path: "/ai-skills"');
    expect(manifest).toContain('path: "/en/ai-skills"');

    const middleware = source("src/middleware.ts");
    expect(middleware).toContain('"/ai-skills"');
    expect(middleware).toContain('pathname.startsWith("/ai-skills/")');

    const nextConfig = source("next.config.ts");
    expect(nextConfig).toContain('{ source: "/ai-skills", headers: zhPublicCacheHeaders }');
    expect(nextConfig).toContain('{ source: "/en/ai-skills", headers: enPublicCacheHeaders }');
    expect(nextConfig).toContain('{ source: "/ai-skills/:slug*", headers: zhPublicCacheHeaders }');
    expect(nextConfig).toContain('{ source: "/en/ai-skills/:slug*", headers: enPublicCacheHeaders }');
  });
});
