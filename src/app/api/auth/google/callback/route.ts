import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { hashPassword, signInUser } from "@/lib/auth";
import { getDefaultAvatar } from "@/lib/default-avatar";
import { prisma } from "@/lib/db";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { getGoogleRedirectUri, googleOAuthStateCookieName, verifyGoogleIdToken, type GoogleIdentity } from "@/lib/google-oauth";
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

function parseOAuthState(value?: string): GoogleOAuthState | null {
  if (!value) return null;
  try {
    const state = JSON.parse(value) as Partial<GoogleOAuthState>;
    if (
      typeof state.state !== "string" ||
      typeof state.nonce !== "string" ||
      typeof state.returnTo !== "string" ||
      (state.locale !== "zh" && state.locale !== "en")
    ) {
      return null;
    }
    return state as GoogleOAuthState;
  } catch {
    return null;
  }
}

function stateMatches(expected: string, actual: string) {
  const expectedBytes = Buffer.from(expected);
  const actualBytes = Buffer.from(actual);
  return expectedBytes.length === actualBytes.length && timingSafeEqual(expectedBytes, actualBytes);
}

function registerUrl(request: NextRequest, locale: "zh" | "en", message: string, returnTo?: string) {
  const origin = new URL(getGoogleRedirectUri(request.url)).origin;
  const destination = new URL(buildLocalePath("/register", locale), origin);
  destination.searchParams.set("message", message);
  if (returnTo) destination.searchParams.set("returnTo", returnTo);
  return destination;
}

function isUniqueConstraintError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

function isTrustedGoogleRelayUrl(value: string) {
  try {
    const relayUrl = new URL(value);
    return relayUrl.protocol === "https:" &&
      /^([a-z0-9-]+\.){2}workers\.dev$/i.test(relayUrl.hostname) &&
      relayUrl.pathname === "/exchange" &&
      !relayUrl.search && !relayUrl.hash && !relayUrl.username && !relayUrl.password;
  } catch {
    return false;
  }
}

async function findOrCreateGoogleUser(identity: GoogleIdentity, locale: "zh" | "en") {
  const existingIdentity = await prisma.user.findUnique({
    where: { googleSubject: identity.subject },
    select: { id: true, status: true },
  });
  if (existingIdentity) {
    if (existingIdentity.status !== "active") throw new Error("GOOGLE_ACCOUNT_DISABLED");
    return existingIdentity.id;
  }

  const existingEmail = await prisma.user.findUnique({
    where: { email: identity.email },
    select: { id: true, status: true, googleSubject: true },
  });
  if (existingEmail) {
    if (existingEmail.status !== "active") throw new Error("GOOGLE_ACCOUNT_DISABLED");
    // Local email addresses are unverified. Matching text is not proof of account ownership.
    throw new Error("GOOGLE_ACCOUNT_CONFLICT");
  }

  const nickname = identity.name || identity.email.split("@", 1)[0]?.slice(0, 40) || "Google user";
  const passwordHash = await hashPassword(randomBytes(32).toString("base64url"));
  try {
    const user = await prisma.user.create({
      data: {
        email: identity.email,
        nickname,
        googleSubject: identity.subject,
        avatar: getDefaultAvatar(identity.subject),
        passwordHash,
      },
      select: { id: true },
    });
    try {
      await trackAnalyticsEvent({
        eventName: "registration_completed",
        path: buildLocalePath("/register", locale),
        entityType: "user",
        entityId: user.id,
        userId: user.id,
        metadata: { locale, registrationMethod: "google" },
      });
    } catch {
      // Account creation has succeeded; analytics must not prevent sign-in.
    }
    return user.id;
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
    const racedIdentity = await prisma.user.findUnique({
      where: { googleSubject: identity.subject },
      select: { id: true, status: true },
    });
    if (racedIdentity?.status === "active") return racedIdentity.id;
    throw new Error("GOOGLE_ACCOUNT_CONFLICT");
  }
}

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const stateCookie = cookieStore.get(googleOAuthStateCookieName)?.value;
  const oauthState = parseOAuthState(stateCookie);
  const fallbackLocale = normalizeLocale(cookieStore.get(localeCookieName)?.value);
  const locale = oauthState?.locale ?? fallbackLocale;
  const returnTo = oauthState
    ? resolveSafeReturnPath(oauthState.returnTo, buildLocalePath("/user", locale))
    : buildLocalePath("/user", locale);
  const clearStateCookie = () => {
    cookieStore.set(googleOAuthStateCookieName, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/auth/google",
      maxAge: 0,
    });
  };
  const fail = (message = "google-auth-failed") => {
    clearStateCookie();
    const response = NextResponse.redirect(registerUrl(request, locale, message, returnTo));
    response.headers.set("Cache-Control", "no-store");
    return response;
  };

  const actualState = request.nextUrl.searchParams.get("state") ?? "";
  const code = request.nextUrl.searchParams.get("code");
  if (!oauthState || !stateMatches(oauthState.state, actualState) || !code) {
    return fail();
  }

  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const relayUrl = process.env.GOOGLE_OAUTH_RELAY_URL?.trim();
  if (!clientId || !clientSecret) return fail("google-not-configured");
  if (relayUrl && !isTrustedGoogleRelayUrl(relayUrl)) return fail("google-not-configured");

  try {
    let idToken: string | undefined;
    let jwks: Parameters<typeof verifyGoogleIdToken>[3];
    if (relayUrl) {
      const relayBody = JSON.stringify({ code, redirectUri: getGoogleRedirectUri(request.url) });
      const relaySignature = createHmac("sha256", clientSecret)
        .update(`POST\n/exchange\n${relayBody}`)
        .digest("base64url");
      const relayResponse = await fetch(relayUrl, {
        method: "POST",
        headers: {
          Authorization: `HMAC ${relaySignature}`,
          "Content-Type": "application/json",
        },
        body: relayBody,
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });
      if (!relayResponse.ok) return fail();
      const relayPayload = await relayResponse.json() as { idToken?: unknown; jwks?: unknown };
      if (
        typeof relayPayload.idToken !== "string" ||
        typeof relayPayload.jwks !== "object" || relayPayload.jwks === null ||
        !("keys" in relayPayload.jwks) || !Array.isArray(relayPayload.jwks.keys)
      ) return fail();
      idToken = relayPayload.idToken;
      jwks = relayPayload.jwks as Parameters<typeof verifyGoogleIdToken>[3];
    } else if (clientSecret) {
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: getGoogleRedirectUri(request.url),
          grant_type: "authorization_code",
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });
      if (!tokenResponse.ok) return fail();
      const tokenPayload = await tokenResponse.json() as { id_token?: unknown };
      if (typeof tokenPayload.id_token !== "string") return fail();
      idToken = tokenPayload.id_token;
    }

    if (!idToken) return fail();
    const identity = await verifyGoogleIdToken(idToken, clientId, oauthState.nonce, jwks);
    const userId = await findOrCreateGoogleUser(identity, locale);
    await signInUser(userId);
    clearStateCookie();

    const response = NextResponse.redirect(new URL(returnTo, new URL(getGoogleRedirectUri(request.url)).origin));
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === "GOOGLE_ACCOUNT_CONFLICT") {
      return fail("google-account-conflict");
    }
    return fail();
  }
}
