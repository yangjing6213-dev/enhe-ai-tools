import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { buildGoogleAuthorizationUrl, getGoogleRedirectUri, googleOAuthStateCookieName } from "@/lib/google-oauth";
import { localeCookieName } from "@/lib/locale-routing";
import { normalizeLocale } from "@/lib/dictionaries";
import { buildLocalePath } from "@/lib/seo";
import { resolveSafeReturnPath } from "@/lib/safe-return-path";

export const runtime = "nodejs";

type GoogleOAuthState = {
  state: string;
  nonce: string;
  returnTo: string;
  locale: "zh" | "en";
};

function redirectToRegister(request: NextRequest, locale: "zh" | "en", message: string, returnTo: string) {
  const destination = new URL(
    buildLocalePath("/register", locale),
    new URL(getGoogleRedirectUri(request.url)).origin,
  );
  destination.searchParams.set("message", message);
  destination.searchParams.set("returnTo", returnTo);
  return NextResponse.redirect(destination);
}

export async function GET(request: NextRequest) {
  const locale = normalizeLocale(request.cookies.get(localeCookieName)?.value);
  const returnTo = resolveSafeReturnPath(
    request.nextUrl.searchParams.get("returnTo"),
    buildLocalePath("/user", locale),
  );
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    return redirectToRegister(request, locale, "google-not-configured", returnTo);
  }

  const state: GoogleOAuthState = {
    state: randomBytes(32).toString("base64url"),
    nonce: randomBytes(32).toString("base64url"),
    returnTo,
    locale,
  };
  const authorizationUrl = buildGoogleAuthorizationUrl({
    clientId,
    redirectUri: getGoogleRedirectUri(request.url),
    state: state.state,
    nonce: state.nonce,
  });
  const response = NextResponse.redirect(authorizationUrl);
  response.cookies.set(googleOAuthStateCookieName, JSON.stringify(state), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth/google",
    maxAge: 10 * 60,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
