import { describe, expect, it } from "vitest";
import { normalizeAccountIdentifier, parseAccountCredentials } from "@/lib/account-identity";

describe("account identity", () => {
  it("accepts email, alphabetic, numeric, and mixed account identifiers", () => {
    expect(normalizeAccountIdentifier("admin@enhe.ai")).toBe("admin@enhe.ai");
    expect(normalizeAccountIdentifier("Sadmin")).toBe("Sadmin");
    expect(normalizeAccountIdentifier("292055066")).toBe("292055066");
    expect(normalizeAccountIdentifier("Enhe2026")).toBe("Enhe2026");
  });

  it("rejects account identifiers with unsupported symbols", () => {
    expect(() => normalizeAccountIdentifier("admin name")).toThrow();
    expect(() => normalizeAccountIdentifier("admin_01")).toThrow();
    expect(() => normalizeAccountIdentifier("admin-name")).toThrow();
  });

  it("parses credentials with a non-email account", () => {
    expect(parseAccountCredentials({ identifier: "Sadmin", password: "Example123!" })).toEqual({
      identifier: "Sadmin",
      password: "Example123!"
    });
  });
});
