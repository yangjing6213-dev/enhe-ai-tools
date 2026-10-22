interface Env {
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
}

const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_JWKS_ENDPOINT = "https://www.googleapis.com/oauth2/v3/certs";
const EXPECTED_REDIRECT_URI = "https://www.enhe-tech.com.cn/api/auth/google/callback";
const MAX_REQUEST_BYTES = 4096;

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}

async function verifyRequestSignature(signature: string, body: string, secret: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(signature)) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expectedBytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(`POST\n/exchange\n${body}`)));
  const actualBytes = Uint8Array.from(
    atob(signature.replace(/-/g, "+").replace(/_/g, "/") + "="),
    (character) => character.charCodeAt(0),
  );
  if (actualBytes.length !== expectedBytes.length) return false;
  let difference = 0;
  for (let index = 0; index < actualBytes.length; index++) {
    difference |= actualBytes[index] ^ expectedBytes[index];
  }
  return difference === 0;
}

async function readBoundedBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("missing body");
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_REQUEST_BYTES) {
        await reader.cancel();
        throw new Error("body too large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(body);
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== "/exchange" || request.method !== "POST") {
      return json({ error: "not found" }, 404);
    }
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      return json({ error: "not configured" }, 503);
    }
    const authorization = request.headers.get("authorization") ?? "";
    if (authorization.length > 64 || !authorization.startsWith("HMAC ")) {
      return json({ error: "unauthorized" }, 401);
    }
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
      return json({ error: "unsupported content type" }, 415);
    }

    let body: string;
    try {
      body = await readBoundedBody(request);
    } catch {
      return json({ error: "invalid request" }, 400);
    }
    if (!await verifyRequestSignature(authorization.slice(5), body, env.GOOGLE_CLIENT_SECRET)) {
      return json({ error: "unauthorized" }, 401);
    }

    let input: { code?: unknown; redirectUri?: unknown };
    try {
      input = JSON.parse(body);
    } catch {
      return json({ error: "invalid request" }, 400);
    }
    if (
      typeof input.code !== "string" || input.code.length < 1 || input.code.length > 2048 ||
      input.redirectUri !== EXPECTED_REDIRECT_URI
    ) {
      return json({ error: "invalid request" }, 400);
    }

    try {
      const tokenResponse = await fetch(GOOGLE_TOKEN_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: input.code,
          client_id: env.GOOGLE_CLIENT_ID,
          client_secret: env.GOOGLE_CLIENT_SECRET,
          redirect_uri: EXPECTED_REDIRECT_URI,
          grant_type: "authorization_code",
        }),
      });
      if (!tokenResponse.ok) return json({ error: "Google token exchange failed" }, 502);
      const tokens = await tokenResponse.json() as { id_token?: unknown };
      if (typeof tokens.id_token !== "string") return json({ error: "Google token response was invalid" }, 502);

      const keysResponse = await fetch(GOOGLE_JWKS_ENDPOINT, { headers: { Accept: "application/json" } });
      if (!keysResponse.ok) return json({ error: "Google key lookup failed" }, 502);
      const keySet = await keysResponse.json() as { keys?: unknown };
      if (!Array.isArray(keySet.keys) || keySet.keys.length === 0) {
        return json({ error: "Google key response was invalid" }, 502);
      }

      return json({ idToken: tokens.id_token, jwks: { keys: keySet.keys } });
    } catch {
      return json({ error: "Google verification service unavailable" }, 502);
    }
  },
};

export default worker;
