import { describe, expect, it } from "vitest";
import { parseAdminVisualLoopbackBaseUrl } from "./admin-visual-base-url";

describe("admin visual fixture base URL", () => {
  it.each([
    ["http://localhost:3000", "http://localhost:3000"],
    ["http://localhost:3000/", "http://localhost:3000"],
    ["http://localhost:3000/admin/", "http://localhost:3000"],
    ["http://127.0.0.1:3000", "http://127.0.0.1:3000"],
    ["http://[::1]:3000", "http://[::1]:3000"],
  ])("allows loopback URL %s with normalized origin %s", (baseURL, origin) => {
    expect(parseAdminVisualLoopbackBaseUrl(baseURL).origin).toBe(origin);
  });

  it.each([
    undefined,
    "",
    "not a URL",
    "https://example.com",
    "http://localhost.example.com:3000",
    "http://user:password@localhost:3000",
  ])("rejects non-loopback URL %s", (baseURL) => {
    expect(() => parseAdminVisualLoopbackBaseUrl(baseURL)).toThrow(
      "Admin visual fixtures require an explicit loopback base URL.",
    );
  });
});
