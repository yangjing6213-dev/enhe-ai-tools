import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("IndexNow source wiring", () => {
  it("serves the IndexNow key file from public", () => {
    const key = readFileSync(new URL("../../public/b689ebc55640682df41b6721a64881dae8f81beecc0b5591525747a6d9a01751.txt", import.meta.url), "utf8").trim();

    expect(key).toBe("b689ebc55640682df41b6721a64881dae8f81beecc0b5591525747a6d9a01751");
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
