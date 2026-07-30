import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  publicDiscoveryRoutes,
  renderLlmsImportantPages,
  renderLlmsMachineReadableResources,
  renderOkfCanonicalSections,
  renderOkfFiles,
} from "@/lib/public-discovery-manifest";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8").replace(/\r\n/g, "\n");
}

function generatedBlock(source: string, marker: string) {
  const start = `<!-- ${marker}:START -->`;
  const end = `<!-- ${marker}:END -->`;
  return source.slice(source.indexOf(start) + start.length, source.indexOf(end)).trim();
}

describe("public discovery manifest", () => {
  it("keeps public canonical routes unique and excludes operational surfaces", () => {
    const paths = publicDiscoveryRoutes.map((route) => route.path);

    expect(new Set(paths).size).toBe(paths.length);
    for (const required of ["/", "/en", "/ai-news", "/ai-trends", "/software", "/ai-skills", "/en/ai-skills", "/skill-learning"]) {
      expect(paths).toContain(required);
    }
    for (const forbidden of ["/admin", "/user", "/checkout", "/orders", "/api"]) {
      expect(paths.some((path) => path === forbidden || path.startsWith(`${forbidden}/`))).toBe(false);
    }
    for (const auditedIndexableRoute of [
      "/build-your-own-x",
      "/en/build-your-own-x",
      "/ai-topics",
      "/en/ai-topics",
      "/ai-topics/ai-content-creation-tools",
      "/en/ai-topics/ai-content-creation-tools",
      "/ai-topics/local-ai-deployment",
      "/en/ai-topics/local-ai-deployment",
      "/ai-topics/ai-account-service-compliance",
      "/en/ai-topics/ai-account-service-compliance",
      "/ai-topics/ai-skill-learning-path",
      "/en/ai-topics/ai-skill-learning-path",
      "/product-paths/work-efficiency",
      "/en/product-paths/work-efficiency",
      "/product-paths/media-generation",
      "/en/product-paths/media-generation",
      "/product-demos",
      "/en/product-demos",
      "/product-demos/windows-ai-video-studio",
      "/en/product-demos/windows-ai-video-studio",
      "/product-demos/ai-video",
      "/en/product-demos/ai-video",
      "/product-demos/windows-ai-lumi",
      "/en/product-demos/windows-ai-lumi",
    ]) {
      expect(paths).toContain(auditedIndexableRoute);
    }

    expect(
      publicDiscoveryRoutes.find(
        (route) => route.path === "/product-paths/future-ai",
      )?.indexable,
    ).toBe(false);
  });

  it("does not add supporting sitemap pages to llms or OKF recommendations", () => {
    const renderedSignals = [
      renderLlmsImportantPages(),
      renderLlmsMachineReadableResources(),
      renderOkfFiles(),
      renderOkfCanonicalSections(),
    ].join("\n");

    expect(renderedSignals).not.toMatch(/build-your-own-x|ai-topics|product-demos/);
  });

  it("retains code-level contextual inbound links without claiming production crawl state", () => {
    const home = read("src/app/page-shell.tsx");
    const header = read("src/components/site-header.tsx");

    expect(home).toContain('href: "/ai-topics"');
    expect(home).toContain('buildLocalePath("/product-demos", forceLocale)');
    expect(header).toContain('buildLocalePath("/build-your-own-x", locale)');
  });

  it("keeps llms and OKF generated blocks synchronized with the manifest", () => {
    const llms = read("public/llms.txt");
    const okf = read("public/okf/index.md");

    expect(generatedBlock(llms, "PUBLIC_DISCOVERY_PAGES")).toBe(renderLlmsImportantPages());
    expect(generatedBlock(llms, "PUBLIC_DISCOVERY_RESOURCES")).toBe(
      renderLlmsMachineReadableResources(),
    );
    expect(generatedBlock(okf, "PUBLIC_DISCOVERY_OKF_FILES")).toBe(renderOkfFiles());
    expect(generatedBlock(okf, "PUBLIC_DISCOVERY_OKF_SECTIONS")).toBe(renderOkfCanonicalSections());
  });

  it("uses the manifest in sitemap and runs discovery generation before builds", () => {
    const sitemap = read("src/app/sitemap.ts");
    const packageJson = read("package.json");
    const generator = read("scripts/generate-public-discovery.ts");

    expect(sitemap).toContain('import { publicDiscoveryRoutes } from "@/lib/public-discovery-manifest"');
    expect(sitemap).toContain("publicDiscoveryRoutes.filter");
    expect(sitemap).toContain("sitemapExcludedPaths");
    expect(sitemap).not.toContain("const staticRoutes =");
    expect(packageJson).toContain("tsx scripts/generate-public-discovery.ts &&");
    expect(generator).toContain("renderLlmsImportantPages");
    expect(generator).toContain("renderOkfCanonicalSections");
  });
});
