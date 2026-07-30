import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { middleware } from "@/middleware";

describe("naked domain redirect", () => {
  it("redirects the exact naked host to www while preserving path and query", () => {
    const response = middleware(new NextRequest(
      "https://enhe-tech.com.cn/online-tools/seo-geo-audit?utm_source=direct",
    ));

    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe(
      "https://www.enhe-tech.com.cn/online-tools/seo-geo-audit?utm_source=direct",
    );
  });
});
