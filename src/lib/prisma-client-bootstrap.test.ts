import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Prisma Client bootstrap scripts", () => {
  it("keeps Client generation pure and preserves the existing Seed generator", async () => {
    const packageJson = JSON.parse(
      await readFile(resolve(process.cwd(), "package.json"), "utf8"),
    ) as { scripts: Record<string, string> };
    const scripts = packageJson.scripts;

    expect(scripts["prisma:client"]).toBe("prisma generate");
    expect(scripts.pretypecheck).toBe("npm run prisma:client");
    expect(scripts["prisma:client"]).not.toContain("build-ai-news-topic-seed");
    expect(scripts["prisma:client"]).not.toContain("seed");
    expect(scripts["prisma:client"]).not.toContain("migrate");
    expect(scripts["prisma:client"]).not.toContain("db push");
    expect(scripts["prisma:generate"]).toBeDefined();
    expect(scripts["prisma:generate"]).toBe(
      "node --import tsx scripts/build-ai-news-topic-seed.mjs && prisma generate",
    );
  });
});
