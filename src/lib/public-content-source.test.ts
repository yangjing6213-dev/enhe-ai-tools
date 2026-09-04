import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("public content cache contract", () => {
  it("caches homepage, listing pages, and tutorials through shared unstable_cache helpers", () => {
    const source = readFileSync(new URL("./public-content.ts", import.meta.url), "utf8");
    const home = readFileSync(new URL("../app/page-shell.tsx", import.meta.url), "utf8");
    const software = readFileSync(new URL("../app/software/page-shell.tsx", import.meta.url), "utf8");
    const onlineTools = readFileSync(new URL("../app/online-tools/page-shell.tsx", import.meta.url), "utf8");
    const skillLearning = readFileSync(new URL("../app/skill-learning/page-shell.tsx", import.meta.url), "utf8");
    const tutorials = readFileSync(new URL("../app/tutorials/page-shell.tsx", import.meta.url), "utf8");

    expect(source).toContain("unstable_cache");
    expect(source).toContain("getHomeRecommendedTools");
    expect(source).toContain("getPublicToolCategories");
    expect(source).toContain("getPublicToolListing");
    expect(source).toContain("getPublicTutorials");

    expect(home).toContain("getHomeRecommendedTools");
    expect(software).toContain("getPublicToolCategories");
    expect(software).toContain("getPublicToolListing");
    expect(onlineTools).toContain("getPublicToolCategories");
    expect(onlineTools).toContain("getPublicToolListing");
    expect(skillLearning).toContain("getPublicToolCategories");
    expect(skillLearning).toContain("getPublicToolListing");
    expect(tutorials).toContain("getPublicTutorials");
    expect(software).not.toContain("prisma.toolCategory.findMany");
    expect(onlineTools).not.toContain("prisma.toolCategory.findMany");
    expect(skillLearning).not.toContain("prisma.toolCategory.findMany");
  });
});
