import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildOrganizationSchema,
  buildPageEntityId,
  buildWebsiteSchema,
} from "@/lib/seo";

describe("GEO entity graph", () => {
  it("connects the website publisher to one canonical organization entity", () => {
    const organizationId =
      "https://www.enhe-tech.com.cn/#organization";
    const website = buildWebsiteSchema({
      id: "https://www.enhe-tech.com.cn/#website",
      name: "ENHE AI",
      url: "https://www.enhe-tech.com.cn/",
      publisherId: organizationId,
    });

    expect(website).toMatchObject({
      "@type": "WebSite",
      "@id": "https://www.enhe-tech.com.cn/#website",
      publisher: {
        "@type": "Organization",
        "@id": organizationId,
        name: "ENHE AI",
      },
    });
  });

  it("publishes aliases, expertise, and machine-readable brand resources", () => {
    const organization = buildOrganizationSchema({
      id: "https://www.enhe-tech.com.cn/#organization",
      name: "ENHE AI",
      alternateName: ["恩禾 ENHE AI", "恩禾AI"],
      knowsAbout: ["AI tools", "AI skill learning", "local AI deployment"],
      sameAs: ["https://github.com/hqwzhu/enhe-ai-tools"],
      subjectOf: [
        {
          name: "ENHE AI brand profile",
          url: "https://www.enhe-tech.com.cn/about",
          encodingFormat: "text/html",
        },
        {
          name: "ENHE AI LLM guidance",
          url: "https://www.enhe-tech.com.cn/llms.txt",
          encodingFormat: "text/plain",
        },
      ],
    });

    expect(organization).toMatchObject({
      "@id": "https://www.enhe-tech.com.cn/#organization",
      alternateName: ["恩禾 ENHE AI", "恩禾AI"],
      knowsAbout: ["AI tools", "AI skill learning", "local AI deployment"],
      sameAs: ["https://github.com/hqwzhu/enhe-ai-tools"],
    });
    expect(organization.subjectOf).toHaveLength(2);
  });

  it("connects public chrome and the homepage to the canonical entity ids", () => {
    const publicChrome = readFileSync(
      new URL("../components/public-site-chrome.tsx", import.meta.url),
      "utf8",
    );
    const brandEntity = readFileSync(
      new URL("./brand-entity.ts", import.meta.url),
      "utf8",
    );
    const home = readFileSync(
      new URL("../app/page-shell.tsx", import.meta.url),
      "utf8",
    );

    expect(publicChrome).toContain('absoluteUrl("/#organization")');
    expect(publicChrome).toContain('absoluteUrl("/#website")');
    expect(brandEntity).toContain(
      '"https://github.com/hqwzhu/enhe-ai-tools"',
    );
    expect(home).toContain('"@id": absoluteUrl("/#website")');
    expect(home).toContain("mainEntity: enheOrganizationReference");
    expect(home).not.toContain('"@type": "Organization"');
    expect(home).toContain('"@type": "CollectionPage"');
    expect(home).toContain('"@type": "ItemList"');
    expect(home).toContain("itemListElement: homeTaskOutcomes[forceLocale].map");
  });

  it("keeps the WebSite URL at the root for every locale", () => {
    const publicChrome = readFileSync(
      new URL("../components/public-site-chrome.tsx", import.meta.url),
      "utf8",
    );

    expect(publicChrome).toContain('url: absoluteUrl("/")');
    expect(publicChrome).not.toContain("url: languageAlternates[inLanguage]");
  });

  it("builds stable page-level ids for localized canonical urls", () => {
    expect(buildPageEntityId("/")).toBe(
      "https://www.enhe-tech.com.cn/#webpage",
    );
    expect(buildPageEntityId("/en", "task-list")).toBe(
      "https://www.enhe-tech.com.cn/en#task-list",
    );
  });
});
