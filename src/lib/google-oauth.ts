import { createLocalJWKSet, createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { fallbackSiteBaseUrl } from "@/lib/seo";

const googleSigningKeys = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
);

export const googleOAuthStateCookieName = "enhe_google_oauth_state";

export type GoogleIdentity = {
  subject: string;
  email: string;
  name: string | null;
};

export function getGoogleRedirectUri(requestUrl: string) {
  const configured = process.env.GOOGLE_REDIRECT_URI?.trim();
  if (configured) return configured;

  const request = new URL(requestUrl);
  if (request.hostname === "localhost" || request.hostname === "127.0.0.1") {
    return new URL("/api/auth/google/callback", request.origin).toString();
  }
  return new URL("/api/auth/google/callback", fallbackSiteBaseUrl).toString();
}

export function buildGoogleAuthorizationUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
  nonce: string;
}) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", input.state);
  url.searchParams.set("nonce", input.nonce);
  url.searchParams.set("prompt", "select_account");
  return url;
}

export function validateGoogleIdentityClaims(
  payload: JWTPayload & Record<string, unknown>,
  expectedNonce: string,
): GoogleIdentity {
  const subject = z.string().min(1).safeParse(payload.sub);
  const email = z.string().email().safeParse(payload.email);
  const nonce = typeof payload.nonce === "string" ? payload.nonce : "";
  const nonceBytes = Buffer.from(nonce);
  const expectedNonceBytes = Buffer.from(expectedNonce);
  const nonceMatches = nonceBytes.length === expectedNonceBytes.length &&
    timingSafeEqual(nonceBytes, expectedNonceBytes);

  if (!subject.success || !email.success || payload.email_verified !== true || !nonceMatches) {
    throw new Error("GOOGLE_IDENTITY_INVALID");
  }

  const name = typeof payload.name === "string" ? payload.name.trim().slice(0, 40) : "";
  return {
    subject: subject.data,
    email: email.data.trim().toLowerCase(),
    name: name || null,
  };
}

export async function verifyGoogleIdToken(
  idToken: string,
  clientId: string,
  expectedNonce: string,
  jwks?: Parameters<typeof createLocalJWKSet>[0],
) {
  const keySet = jwks ? createLocalJWKSet(jwks) : googleSigningKeys;
  const { payload } = await jwtVerify(idToken, keySet, {
    audience: clientId,
    issuer: ["https://accounts.google.com", "accounts.google.com"],
  });
  return validateGoogleIdentityClaims(payload as JWTPayload & Record<string, unknown>, expectedNonce);
}
