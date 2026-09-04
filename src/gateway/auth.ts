import type { FastifyReply, FastifyRequest } from "fastify";
import { verifyApiKey, type VerifyApiKeyResult } from "@/features/enhe-api/server/api-key-verification";
import { sendGatewayError, type GatewayRequestContext } from "./errors";

type AuthResult =
  | { ok: true; apiKey: Extract<VerifyApiKeyResult, { valid: true }> }
  | { ok: false; response: FastifyReply };

export async function requireGatewayApiKey(
  request: FastifyRequest,
  reply: FastifyReply,
  context: GatewayRequestContext
): Promise<AuthResult> {
  const apiKey = parseBearerApiKey(request.headers.authorization);
  if (!apiKey) {
    return { ok: false, response: sendGatewayError(reply, 401, "invalid_api_key", context) };
  }

  const verification = await verifyApiKey(apiKey);
  if (verification.valid) return { ok: true, apiKey: verification };

  if (verification.reason === "developer_suspended" || verification.reason === "user_disabled") {
    return { ok: false, response: sendGatewayError(reply, 403, "developer_suspended", context) };
  }
  if (verification.reason === "server_misconfigured") {
    return { ok: false, response: sendGatewayError(reply, 500, "internal_error", context) };
  }
  return { ok: false, response: sendGatewayError(reply, 401, "invalid_api_key", context) };
}

function parseBearerApiKey(value: string | undefined) {
  if (!value) return null;
  const match = value.match(/^Bearer\s+(.+)$/i);
  const apiKey = match?.[1]?.trim();
  return apiKey || null;
}
