import { describe, expect, it } from "vitest";
import { getPageViewEventName } from "@/lib/analytics-client";
import { isSeoAuditLandingPath } from "./analytics-tracker";

describe("analytics tracker", () => {
  it("recognizes the live SEO audit landing routes", () => {
    expect(isSeoAuditLandingPath("/online-tools/seo-geo-audit")).toBe(true);
    expect(isSeoAuditLandingPath("/en/online-tools/seo-geo-audit")).toBe(true);
  });

  it("classifies English and Chinese public routes through one helper", () => {
    for (const path of ["/", "/en"]) {
      expect(getPageViewEventName(path)).toBe("visit_home");
    }
    for (const path of ["/pricing", "/en/pricing"]) {
      expect(getPageViewEventName(path)).toBe("view_pricing");
    }
    for (const path of [
      "/software/example",
      "/en/software/example",
      "/tools/example",
      "/en/tools/example",
    ]) {
      expect(getPageViewEventName(path)).toBe("view_tool");
    }
  });
});
