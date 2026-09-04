import { randomUUID } from "node:crypto";
import type { FastifyReply } from "fastify";

export type GatewayErrorCode =
  | "invalid_api_key"
  | "developer_suspended"
  | "invalid_request"
  | "model_not_found"
  | "insufficient_credit"
  | "unsupported_stream"
  | "upstream_error"
  | "internal_error";

export type GatewayRequestContext = {
  requestId: string;
};

const docsUrl = "https://www.enhe-tech.com.cn/ai-api/docs";

const messages: Record<GatewayErrorCode, string> = {
  invalid_api_key: "Invalid API key.",
  developer_suspended: "Developer account is not active.",
  invalid_request: "Invalid request body.",
  model_not_found: "Requested model is not available.",
  insufficient_credit: "API credit is insufficient.",
  unsupported_stream: "Streaming chat completions are not supported yet.",
  upstream_error: "Upstream provider request failed.",
  internal_error: "Internal gateway error."
};

export function createGatewayRequestContext(): GatewayRequestContext {
  return { requestId: randomUUID() };
}

export function sendGatewayError(reply: FastifyReply, statusCode: number, code: GatewayErrorCode, context: GatewayRequestContext) {
  reply.header("x-request-id", context.requestId);
  return reply.code(statusCode).send({
    error: {
      code,
      message: messages[code],
      request_id: context.requestId,
      docs_url: docsUrl
    }
  });
}
