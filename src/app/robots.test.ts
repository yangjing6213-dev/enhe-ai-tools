import { describe, expect, it } from "vitest";
import robots from "./robots";

function isAllowedByLongestRule(path: string, rule: { allow?: string | string[]; disallow?: string | string[] }) {
  const allowRules = rule.allow ? (Array.isArray(rule.allow) ? rule.allow : [rule.allow]) : [];
  const disallowRules = rule.disallow ? (Array.isArray(rule.disallow) ? rule.disallow : [rule.disallow]) : [];
  const matches = [
    ...allowRules.filter((prefix) => prefix.endsWith("/") && path.startsWith(prefix)).map((value) => ({ value, allow: true })),
    ...disallowRules.filter((prefix) => path === prefix || path.startsWith(`${prefix}/`)).map((value) => ({ value, allow: false })),
  ];
  return matches.sort((left, right) => right.value.length - left.value.length || Number(right.allow) - Number(left.allow))[0]?.allow ?? true;
}

describe("public crawler access", () => {
  it("allows only workflow cover images while preserving private API and admin restrictions for every crawler", () => {
    const rules = robots().rules;
    for (const rule of Array.isArray(rules) ? rules : [rules]) {
      expect(rule.allow).toContain("/api/tool-images$");
      expect(rule.allow).toContain("/api/tool-images?");
      expect(rule.allow).not.toContain("/api");
      expect(rule.allow).not.toContain("/api/tool-images");
      expect(rule.allow).toContain("/api/uploads/");
      expect(rule.allow).toContain("/api/ai-workflows/covers/");
      expect(rule.disallow).toEqual(expect.arrayContaining(["/api", "/admin", "/payment", "/orders"]));
      for (const path of [
        "/api/ai-workflows/covers/ai-workflow-123-demo",
      ]) expect(isAllowedByLongestRule(path, rule)).toBe(true);
      for (const path of [
        "/api/ai-workflows/demo/install",
        "/api/ai-workflows/demo/favorite",
        "/api/ai-workflows/demo/review",
        "/api/auth/callback",
        "/api/analytics",
        "/admin/ai-workflows",
      ]) expect(isAllowedByLongestRule(path, rule)).toBe(false);
    }
  });
});
