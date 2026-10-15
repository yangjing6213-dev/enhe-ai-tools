import { describe, expect, it } from "vitest";
import robots from "./robots";

describe("public image crawler access", () => {
  it("allows only the tool image endpoint while preserving API and private route restrictions for every crawler", () => {
    const rules = robots().rules;
    for (const rule of Array.isArray(rules) ? rules : [rules]) {
      expect(rule.allow).toContain("/api/tool-images$");
      expect(rule.allow).toContain("/api/tool-images?");
      expect(rule.allow).not.toContain("/api");
      expect(rule.allow).not.toContain("/api/tool-images");
      expect(rule.allow).toContain("/api/uploads/");
      expect(rule.disallow).toEqual(expect.arrayContaining(["/api", "/admin", "/payment", "/orders"]));
    }
  });
});
