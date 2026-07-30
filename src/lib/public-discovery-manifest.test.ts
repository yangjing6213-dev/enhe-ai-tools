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
    for (const required of ["/", "/en", "/ai-news", "/ai-trends", "/software", "/skill-learning", "/online-tools/seo-geo-audit", "/en/online-tools/seo-geo-audit"]) {
      expect(paths).toContain(required);
    }
    for (const forbidden of ["/admin", "/user", "/checkout", "/orders", "/api"]) {
      expect(paths.some((path) => path === forbidden || path.startsWith(`${forbidden}/`))).toBe(false);
    }
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
    expect(sitemap).toContain("publicDiscoveryRoutes.map");
    expect(sitemap).not.toContain("const staticRoutes =");
    expect(packageJson).toContain("tsx scripts/generate-public-discovery.ts &&");
    expect(generator).toContain("renderLlmsImportantPages");
    expect(generator).toContain("renderOkfCanonicalSections");
  });
});
