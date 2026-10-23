import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import worker from "./index";

const secret = "fixture-secret";
const relayUrl = "https://relay.example/exchange";
const redirectUri = "https://www.enhe-tech.com.cn/api/auth/google/callback";

function requestFor(body: string, signature = createHmac("sha256", secret)
  .update(`POST\n/exchange\n${body}`)
  .digest("base64url")) {
  return new Request(relayUrl, {
    method: "POST",
    headers: { Authorization: `HMAC ${signature}`, "Content-Type": "application/json" },
    body,
  });
}

describe("Google OAuth relay Worker", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("exchanges a signed code and returns only the ID token and public keys", async () => {
    const body = JSON.stringify({ code: "one-time-code", redirectUri });
    const fetchGoogle = vi.fn()
      .mockResolvedValueOnce(Response.json({
        id_token: "verified-id-token",
        access_token: "must-not-be-returned",
        refresh_token: "must-not-be-returned",
      }))
      .mockResolvedValueOnce(Response.json({ keys: [{ kty: "RSA", kid: "google-key" }] }));
    vi.stubGlobal("fetch", fetchGoogle);

    const response = await worker.fetch(requestFor(body), {
      GOOGLE_CLIENT_ID: "fixture-client",
      GOOGLE_CLIENT_SECRET: secret,
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      idToken: "verified-id-token",
      jwks: { keys: [{ kty: "RSA", kid: "google-key" }] },
    });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(fetchGoogle).toHaveBeenNthCalledWith(1, "https://oauth2.googleapis.com/token", expect.objectContaining({
      method: "POST",
      body: expect.any(URLSearchParams),
    }));
    const tokenParams = fetchGoogle.mock.calls[0][1]?.body as URLSearchParams;
    expect(tokenParams.get("code")).toBe("one-time-code");
    expect(tokenParams.get("client_id")).toBe("fixture-client");
    expect(tokenParams.get("client_secret")).toBe(secret);
  });

  it("rejects an invalid signature before contacting Google", async () => {
    const fetchGoogle = vi.fn();
    vi.stubGlobal("fetch", fetchGoogle);
    const body = JSON.stringify({ code: "one-time-code", redirectUri });

    const response = await worker.fetch(requestFor(body, "invalid-signature"), {
      GOOGLE_CLIENT_ID: "fixture-client",
      GOOGLE_CLIENT_SECRET: secret,
    });

    expect(response.status).toBe(401);
    expect(fetchGoogle).not.toHaveBeenCalled();
  });
});
