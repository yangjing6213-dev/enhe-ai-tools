import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("IndexNow source wiring", () => {
  it("serves the IndexNow key file from public", () => {
    const publicUrl = new URL("../../public/", import.meta.url);
    const fileNames = readdirSync(publicUrl).filter((entry) => /^[A-Za-z0-9-]{32,128}\.txt$/.test(entry));
    const fileName = fileNames[0];
    const key = fileName ? readFileSync(new URL(`../../public/${fileName}`, import.meta.url), "utf8").trim() : "";

    expect(fileNames).toHaveLength(1);
    expect(fileName).toBe(`${key}.txt`);
    expect(key).toMatch(/^[A-Za-z0-9-]{32,128}$/);
  });

  it("submits newly published or updated public content through admin actions and import API", () => {
    const adminActions = readFileSync(new URL("../app/admin/actions.ts", import.meta.url), "utf8");
    const importRoute = readFileSync(new URL("../app/api/admin/ai-news/import/route.ts", import.meta.url), "utf8");

    expect(adminActions).toContain('import { notifyIndexNow } from "@/lib/indexnow";');
    expect(adminActions).toContain("notifyIndexNow(indexNowUrls)");
    expect(adminActions).toContain("buildCanonicalToolPath");
    expect(adminActions).toContain("buildCanonicalAiNewsPath");
    expect(adminActions).toContain("upsertTutorialAction");
    expect(importRoute).toContain('import { notifyIndexNow } from "@/lib/indexnow";');
    expect(importRoute).toContain("notifyIndexNow([result.publicUrl])");
  });
});
