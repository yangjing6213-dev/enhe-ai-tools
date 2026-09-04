import { describe, expect, it } from "vitest";
import {
  hashSessionToken,
  isLoginLimited,
  signSessionCookieValue,
  verifySessionCookieValue
} from "@/lib/auth-security";
import { createCsrfToken, verifyCsrfToken } from "@/lib/csrf";

describe("auth security helpers", () => {
  it("signs and verifies session cookie values", () => {
    const value = signSessionCookieValue("session-1", "token-1", "secret");

    expect(verifySessionCookieValue(value, "secret")).toEqual({ sessionId: "session-1", token: "token-1" });
    expect(verifySessionCookieValue(`${value}tampered`, "secret")).toBeNull();
    expect(hashSessionToken("token-1")).toHaveLength(64);
  });

  it("detects login throttling after repeated failures", () => {
    const now = new Date("2026-05-21T00:20:00.000Z");
    const attempts = [
      new Date("2026-05-21T00:06:00.000Z"),
      new Date("2026-05-21T00:07:00.000Z"),
      new Date("2026-05-21T00:08:00.000Z"),
      new Date("2026-05-21T00:09:00.000Z"),
      new Date("2026-05-21T00:10:00.000Z")
    ];

    expect(isLoginLimited(attempts, now)).toBe(true);
    expect(isLoginLimited(attempts.slice(1), now)).toBe(false);
  });

  it("creates signed csrf tokens and rejects mismatches", () => {
    const token = createCsrfToken("secret", "nonce");

    expect(verifyCsrfToken(token, token, "secret")).toBe(true);
    expect(verifyCsrfToken(token, createCsrfToken("secret", "other"), "secret")).toBe(false);
    expect(verifyCsrfToken(token, token, "wrong-secret")).toBe(false);
  });
});
