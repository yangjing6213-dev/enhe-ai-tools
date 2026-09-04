import type { FastifyInstance } from "fastify";
import { requireGatewayApiKey } from "./auth";
import { createGatewayRequestContext } from "./errors";

const modelCreatedAt = 1760000000;

export const gatewayModels = [
  { id: "enhe-chat-lite", object: "model", created: modelCreatedAt, owned_by: "enhe" },
  { id: "enhe-coder-lite", object: "model", created: modelCreatedAt, owned_by: "enhe" },
  { id: "enhe-claude-compatible", object: "model", created: modelCreatedAt, owned_by: "enhe" }
] as const;

export function findGatewayModel(modelId: string) {
  return gatewayModels.find((model) => model.id === modelId) ?? null;
}

export function getOpenAICompatibleUpstreamModel(publicModelId: string) {
  if (!findGatewayModel(publicModelId)) return null;

  const upstreamModel = process.env.ENHE_UPSTREAM_OPENAI_DEFAULT_MODEL?.trim();
  return upstreamModel || null;
}

export function registerModelRoutes(app: FastifyInstance) {
  app.get("/v1/models", async (request, reply) => {
    const context = createGatewayRequestContext();
    const auth = await requireGatewayApiKey(request, reply, context);
    if (!auth.ok) return auth.response;

    reply.header("x-request-id", context.requestId);
    return {
      object: "list",
      data: gatewayModels
    };
  });
}
