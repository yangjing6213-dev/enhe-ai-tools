import { describe, expect, it } from "vitest";
import { resolveSafeReturnPath } from "@/lib/safe-return-path";

describe("safe return paths", () => {
  it("keeps an internal product path with its query string", () => {
    expect(
      resolveSafeReturnPath(
        "/online-tools/seo-geo-audit?run=run-1&offer=professional",
        "/user",
      ),
    ).toBe("/online-tools/seo-geo-audit?run=run-1&offer=professional");
  });

  it.each([
    "https://evil.example/steal",
    "//evil.example/steal",
    "/\\evil.example/steal",
    "javascript:alert(1)",
    "/safe\nSet-Cookie: bad=1",
  ])("rejects an unsafe return target: %s", (value) => {
    expect(resolveSafeReturnPath(value, "/user")).toBe("/user");
  });

  it("uses the fallback for missing values", () => {
    expect(resolveSafeReturnPath(null, "/en/user")).toBe("/en/user");
  });
});
