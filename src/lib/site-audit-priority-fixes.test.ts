import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../..");

function read(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

describe("site audit priority fixes", () => {
  it("permanently redirects the retired Gemini route and duplicate news slugs", () => {
    const config = read("next.config.ts");
    const slugs = read("src/lib/public-slugs.ts");
    const publicContent = read("src/lib/public-content.ts");

    for (const route of [
      "/account-services/gemini-pro",
      "/en/account-services/gemini-pro",
      "/ai-news/github-copilot-cli-ai-2",
      "/ai-news/anolisa-ai-2",
      "/ai-news/ai-7-2",
    ]) {
      expect(config).toContain(`source: "${route}"`);
    }
    expect(config.match(/statusCode: 301/g)?.length).toBeGreaterThanOrEqual(8);
    expect(slugs).toContain('"github-copilot-cli-ai-2": "github-copilot-cli-ai"');
    expect(slugs).toContain('"anolisa-ai-2": "anolisa-ai"');
    expect(slugs).toContain('"ai-7-2": "ai-7"');
    expect(publicContent).toContain(
      "items.find((item) => item.slug === requestedSlug)",
    );
  });

  it("emits hreflang for tool details only after the english quality gate", () => {
    const toolPage = read("src/app/tools/[slug]/page-shell.tsx");

    expect(toolPage).toContain("buildAvailableLanguageAlternates");
    expect(toolPage).toContain(
      'shouldIndexEnglishToolPage(tool) ? ["zh", "en"] : ["zh"]',
    );
  });

  it("adds staged security headers with report-only CSP", () => {
    const config = read("next.config.ts");

    expect(config).toContain("Strict-Transport-Security");
    expect(config).toContain("X-Content-Type-Options");
    expect(config).toContain("Content-Security-Policy-Report-Only");
    expect(config).not.toContain('key: "Content-Security-Policy",');
  });

  it("keeps the public shell cacheable by loading session state on the client", () => {
    const header = read("src/components/site-header.tsx");
    const session = read("src/components/header-session.ts");
    const config = read("next.config.ts");

    expect(header).not.toContain("getHeaderUserSnapshot");
    expect(header).toContain("const headerUser = null");
    expect(session).toContain('fetch("/api/session", { cache: "no-store" })');
    expect(config).toContain('{ source: "/", headers: zhPublicCacheHeaders }');
  });

  it("uses markdown links for the main llms.txt entry points", () => {
    const llms = read("public/llms.txt");

    expect(llms).toContain(
      "[AI software apps](https://www.enhe-tech.com.cn/software)",
    );
    expect(llms).toContain(
      "[Open Knowledge Format index](https://www.enhe-tech.com.cn/okf/index.md)",
    );
  });
});
