import { afterEach, describe, expect, it, vi } from "vitest";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { buildGoogleAuthorizationUrl, getGoogleRedirectUri, validateGoogleIdentityClaims, verifyGoogleIdToken } from "@/lib/google-oauth";

describe("Google registration helpers", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("uses the configured public callback rather than trusting the incoming host", () => {
    vi.stubEnv("GOOGLE_REDIRECT_URI", "");

    expect(getGoogleRedirectUri("https://attacker.example/api/auth/google/start"))
      .toBe("https://www.enhe-tech.com.cn/api/auth/google/callback");
    expect(getGoogleRedirectUri("http://localhost:3000/api/auth/google/start"))
      .toBe("http://localhost:3000/api/auth/google/callback");
  });

  it("builds an OpenID authorization request with a callback, state, and nonce", () => {
    const url = buildGoogleAuthorizationUrl({
      clientId: "client-id",
      redirectUri: "https://www.enhe-tech.com.cn/api/auth/google/callback",
      state: "one-time-state",
      nonce: "one-time-nonce",
    });

    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("client_id")).toBe("client-id");
    expect(url.searchParams.get("redirect_uri")).toBe("https://www.enhe-tech.com.cn/api/auth/google/callback");
    expect(url.searchParams.get("scope")).toBe("openid email profile");
    expect(url.searchParams.get("state")).toBe("one-time-state");
    expect(url.searchParams.get("nonce")).toBe("one-time-nonce");
  });

  it("accepts only a verified email and the nonce stored for this registration", () => {
    expect(validateGoogleIdentityClaims({
      sub: "google-subject",
      email: "Person@Example.com",
      email_verified: true,
      name: "Google Person",
      nonce: "expected-nonce",
    }, "expected-nonce")).toEqual({
      subject: "google-subject",
      email: "person@example.com",
      name: "Google Person",
    });

    expect(() => validateGoogleIdentityClaims({
      sub: "google-subject",
      email: "person@example.com",
      email_verified: false,
      nonce: "expected-nonce",
    }, "expected-nonce")).toThrow("GOOGLE_IDENTITY_INVALID");
    expect(() => validateGoogleIdentityClaims({
      sub: "google-subject",
      email: "person@example.com",
      email_verified: true,
      nonce: "other-nonce",
    }, "expected-nonce")).toThrow("GOOGLE_IDENTITY_INVALID");
  });

  it("verifies a Google identity token with relay-provided public keys", async () => {
    const { privateKey, publicKey } = await generateKeyPair("RS256");
    const jwk = await exportJWK(publicKey);
    jwk.kid = "relay-test-key";
    jwk.alg = "RS256";
    const idToken = await new SignJWT({
      email: "Person@Example.com",
      email_verified: true,
      nonce: "expected-nonce",
      name: "Google Person",
    })
      .setProtectedHeader({ alg: "RS256", kid: jwk.kid })
      .setIssuer("https://accounts.google.com")
      .setAudience("fixture-client")
      .setSubject("google-subject")
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(privateKey);

    await expect(verifyGoogleIdToken(idToken, "fixture-client", "expected-nonce", { keys: [jwk] }))
      .resolves.toEqual({ subject: "google-subject", email: "person@example.com", name: "Google Person" });
  });
});
