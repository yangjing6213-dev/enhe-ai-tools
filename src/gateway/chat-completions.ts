import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { chargeUsage, checkSufficientCredit } from "@/features/enhe-api/server/wallet";
import { createUsageLog } from "@/features/enhe-api/server/usage-logs";
import { requireGatewayApiKey } from "./auth";
import { createGatewayRequestContext, sendGatewayError, type GatewayErrorCode, type GatewayRequestContext } from "./errors";
import { findGatewayModel } from "./models";
import {
  calculateUsageCharge,
  estimateMaxChargeUsd,
  type GatewayModelPricing,
  getGatewayModelOutputTokenLimit,
  getGatewayModelPricing,
  isWithinGatewayModelOutputLimit
} from "./pricing";
import { OpenAISseMetadataParser, type OpenAISseMetadata } from "./sse";
import {
  callOpenAICompatibleChatCompletion,
  callOpenAICompatibleChatCompletionStream,
  type OpenAICompatibleForwardBody,
  type OpenAICompatibleStreamForwardBody,
  type OpenAICompatibleUpstreamResult
} from "./upstream-openai";

type ChatCompletionBody = {
  model: string;
  messages: Array<Record<string, unknown>>;
  stream: boolean;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  stop?: string | string[];
};

type AuthenticatedGatewayKey = {
  userId: string;
  developerProfileId: string;
  apiKeyId: string;
  keyPrefix: string;
};

type UsageLogErrorCode = GatewayErrorCode | "client_disconnected" | "malformed_sse";

const chatCompletionsPath = "/v1/chat/completions";

export function registerChatCompletionRoutes(app: FastifyInstance) {
  app.post(chatCompletionsPath, async (request, reply) => {
    const context = createGatewayRequestContext();
    const auth = await requireGatewayApiKey(request, reply, context);
    if (!auth.ok) return auth.response;

    const parsed = parseChatCompletionBody(request.body);
    if (!parsed.ok) {
      await writeChatUsageLog(context, auth.apiKey, {
        statusCode: 400,
        model: getCandidateModel(request.body),
        isStream: false,
        errorCode: "invalid_request",
        errorMessage: "Invalid request body."
      });
      return sendGatewayError(reply, 400, "invalid_request", context);
    }

    const body = parsed.body;
    const model = findGatewayModel(body.model);
    if (!model) {
      await writeChatUsageLog(context, auth.apiKey, {
        statusCode: 404,
        model: body.model,
        isStream: body.stream,
        errorCode: "model_not_found",
        errorMessage: "Requested model is not available."
      });
      return sendGatewayError(reply, 404, "model_not_found", context);
    }

    const pricing = getGatewayModelPricing(model.id);
    const maxOutputTokens = pricing ? getGatewayModelOutputTokenLimit(pricing, body.maxTokens) : null;
    if (!pricing || maxOutputTokens === null || !isWithinGatewayModelOutputLimit(pricing, maxOutputTokens)) {
      await writeChatUsageLog(context, auth.apiKey, {
        statusCode: 400,
        model: body.model,
        isStream: body.stream,
        errorCode: "invalid_request",
        errorMessage: "Invalid request body."
      });
      return sendGatewayError(reply, 400, "invalid_request", context);
    }

    const credit = await checkSufficientCredit({
      userId: auth.apiKey.userId,
      developerProfileId: auth.apiKey.developerProfileId,
      estimatedCostUsd: estimateMaxChargeUsd({
        pricing,
        messages: body.messages,
        maxOutputTokens
      })
    });
    if (!credit.ok) {
      const statusCode = credit.reason === "developer_not_active" ? 403 : 402;
      const errorCode: GatewayErrorCode = credit.reason === "developer_not_active" ? "developer_suspended" : "insufficient_credit";
      await writeChatUsageLog(context, auth.apiKey, {
        statusCode,
        model: body.model,
        isStream: body.stream,
        errorCode,
        errorMessage: errorCode === "developer_suspended" ? "Developer account is not active." : "API credit is insufficient."
      });
      return sendGatewayError(reply, statusCode, errorCode, context);
    }

    if (body.stream) {
      return handleStreamingChatCompletion({
        request,
        reply,
        context,
        apiKey: auth.apiKey,
        body,
        modelId: model.id,
        pricing,
        maxOutputTokens
      });
    }

    const upstream = await callOpenAICompatibleChatCompletion({
      publicModelId: model.id,
      body: buildOpenAICompatibleForwardBody(body, maxOutputTokens)
    });

    if (!upstream.ok) {
      const failure = mapUpstreamFailure(upstream);
      await writeChatUsageLog(context, auth.apiKey, {
        statusCode: failure.statusCode,
        model: model.id,
        isStream: false,
        inputTokens: 0,
        outputTokens: 0,
        latencyMs: upstream.latencyMs,
        upstreamProvider: "openai-compatible",
        upstreamModel: upstream.upstreamModel,
        routeId: `openai-compatible:${model.id}`,
        errorCode: failure.errorCode,
        errorMessage: failure.errorMessage
      });
      return sendGatewayError(reply, failure.statusCode, failure.errorCode, context);
    }

    if (!upstream.hasUsage) {
      await writeChatUsageLog(context, auth.apiKey, {
        statusCode: 200,
        model: model.id,
        isStream: false,
        inputTokens: 0,
        outputTokens: 0,
        latencyMs: upstream.latencyMs,
        upstreamProvider: "openai-compatible",
        upstreamModel: upstream.upstreamModel,
        routeId: `openai-compatible:${model.id}`,
        billingStatus: "review"
      });

      reply.header("x-request-id", context.requestId);
      return upstream.body;
    }

    const usageCharge = calculateUsageCharge({
      pricing,
      inputTokens: upstream.inputTokens,
      outputTokens: upstream.outputTokens
    });

    const usageLog = await writeChatUsageLog(context, auth.apiKey, {
      statusCode: 200,
      model: model.id,
      isStream: false,
      inputTokens: upstream.inputTokens,
      outputTokens: upstream.outputTokens,
      latencyMs: upstream.latencyMs,
      upstreamProvider: "openai-compatible",
      upstreamModel: upstream.upstreamModel,
      routeId: `openai-compatible:${model.id}`,
      costUsd: usageCharge.costUsd,
      chargedUsd: "0",
      billingStatus: usageCharge.billable ? "review" : "not_billable"
    });

    if (!usageLog.ok) {
      return sendGatewayError(reply, 500, "internal_error", context);
    }

    if (!usageCharge.billable) {
      reply.header("x-request-id", context.requestId);
      return upstream.body;
    }

    const charge = await chargeUsage({
      userId: auth.apiKey.userId,
      developerProfileId: auth.apiKey.developerProfileId,
      usageLogId: usageLog.log.id,
      requestId: context.requestId,
      amountUsd: usageCharge.chargedUsd,
      reason: `OpenAI-compatible ${model.id} chat completion`,
      idempotencyKey: `billing:${context.requestId}:${auth.apiKey.apiKeyId}`
    });

    if (!charge.ok) {
      const statusCode = charge.reason === "insufficient_credit" ? 402 : 500;
      const errorCode: GatewayErrorCode = charge.reason === "insufficient_credit" ? "insufficient_credit" : "internal_error";
      return sendGatewayError(reply, statusCode, errorCode, context);
    }

    reply.header("x-request-id", context.requestId);
    return upstream.body;
  });
}

async function handleStreamingChatCompletion(input: {
  request: FastifyRequest;
  reply: FastifyReply;
  context: GatewayRequestContext;
  apiKey: AuthenticatedGatewayKey;
  body: ChatCompletionBody;
  modelId: string;
  pricing: GatewayModelPricing;
  maxOutputTokens: number;
}) {
  const upstreamStartedAt = Date.now();
  const upstream = await callOpenAICompatibleChatCompletionStream({
    publicModelId: input.modelId,
    body: buildOpenAICompatibleStreamForwardBody(input.body, input.maxOutputTokens)
  });

  if (!upstream.ok) {
    const failure = mapUpstreamFailure(upstream);
    await writeChatUsageLog(input.context, input.apiKey, {
      statusCode: failure.statusCode,
      model: input.modelId,
      isStream: true,
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: upstream.latencyMs,
      upstreamProvider: "openai-compatible",
      upstreamModel: upstream.upstreamModel,
      routeId: `openai-compatible:${input.modelId}`,
      errorCode: failure.errorCode,
      errorMessage: failure.errorMessage,
      streamFinishReason: "upstream_error"
    });
    return sendGatewayError(input.reply, failure.statusCode, failure.errorCode, input.context);
  }

  const parser = new OpenAISseMetadataParser();
  const reader = upstream.body.getReader();
  let clientDisconnected = false;
  let streamReadFailed = false;
  let listenerClosed = false;

  const markClientDisconnected = () => {
    if (listenerClosed) return;
    clientDisconnected = true;
    upstream.abort();
  };

  input.request.raw.once("aborted", markClientDisconnected);
  input.reply.raw.once("close", markClientDisconnected);

  input.reply.hijack();
  input.reply.raw.writeHead(200, {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
    "x-request-id": input.context.requestId
  });

  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      if (!next.value) continue;

      parser.push(next.value);
      const wrote = await writeSseChunk(input.reply, next.value);
      if (!wrote) {
        clientDisconnected = true;
        upstream.abort();
        break;
      }
    }
  } catch (error) {
    if (clientDisconnected || isAbortError(error)) {
      clientDisconnected = true;
    } else {
      streamReadFailed = true;
    }
  } finally {
    listenerClosed = true;
    input.request.raw.off("aborted", markClientDisconnected);
    input.reply.raw.off("close", markClientDisconnected);
    try {
      reader.releaseLock();
    } catch {
      // The reader can already be released after an aborted upstream stream.
    }
  }

  const metadata = parser.finish();
  await settleStreamingUsage({
    context: input.context,
    apiKey: input.apiKey,
    modelId: input.modelId,
    pricing: input.pricing,
    upstreamModel: upstream.upstreamModel,
    latencyMs: Math.max(upstream.latencyMs, Date.now() - upstreamStartedAt),
    metadata,
    clientDisconnected,
    streamReadFailed
  });

  if (!input.reply.raw.destroyed && !input.reply.raw.writableEnded) {
    input.reply.raw.end();
  }

  return input.reply;
}

async function settleStreamingUsage(input: {
  context: GatewayRequestContext;
  apiKey: AuthenticatedGatewayKey;
  modelId: string;
  pricing: GatewayModelPricing;
  upstreamModel: string;
  latencyMs: number;
  metadata: OpenAISseMetadata;
  clientDisconnected: boolean;
  streamReadFailed: boolean;
}) {
  const streamFinishReason = getStreamFinishReason(input);
  const canCharge = canChargeStreamingUsage(input);

  if (!canCharge) {
    await writeChatUsageLog(input.context, input.apiKey, {
      statusCode: 200,
      model: input.modelId,
      isStream: true,
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: input.latencyMs,
      upstreamProvider: "openai-compatible",
      upstreamModel: input.upstreamModel,
      routeId: `openai-compatible:${input.modelId}`,
      billingStatus: "review",
      errorCode: getStreamReviewErrorCode(streamFinishReason),
      errorMessage: getStreamReviewErrorMessage(streamFinishReason),
      streamFinishReason
    });
    return;
  }

  const usageCharge = calculateUsageCharge({
    pricing: input.pricing,
    inputTokens: input.metadata.inputTokens,
    outputTokens: input.metadata.outputTokens
  });

  const usageLog = await writeChatUsageLog(input.context, input.apiKey, {
    statusCode: 200,
    model: input.modelId,
    isStream: true,
    inputTokens: input.metadata.inputTokens,
    outputTokens: input.metadata.outputTokens,
    latencyMs: input.latencyMs,
    upstreamProvider: "openai-compatible",
    upstreamModel: input.upstreamModel,
    routeId: `openai-compatible:${input.modelId}`,
    costUsd: usageCharge.costUsd,
    chargedUsd: "0",
    billingStatus: usageCharge.billable ? "review" : "not_billable",
    streamFinishReason
  });

  if (!usageLog.ok || !usageCharge.billable) return;

  await chargeUsage({
    userId: input.apiKey.userId,
    developerProfileId: input.apiKey.developerProfileId,
    usageLogId: usageLog.log.id,
    requestId: input.context.requestId,
    amountUsd: usageCharge.chargedUsd,
    reason: `OpenAI-compatible ${input.modelId} streaming chat completion`,
    idempotencyKey: `billing:${input.context.requestId}:${input.apiKey.apiKeyId}`
  });
}

function parseChatCompletionBody(value: unknown):
  | { ok: true; body: ChatCompletionBody }
  | { ok: false } {
  if (!isRecord(value)) return { ok: false };

  const model = typeof value.model === "string" ? value.model.trim() : "";
  const stream = value.stream === undefined ? false : value.stream;
  const maxTokens = value.max_tokens;
  const normalizedMaxTokens = typeof maxTokens === "number" ? maxTokens : undefined;
  const optionalNumbers = parseOptionalNumberFields(value);
  const stop = parseStop(value.stop);

  if (!model) return { ok: false };
  if (!Array.isArray(value.messages) || value.messages.length === 0) return { ok: false };
  if (!value.messages.every(isValidMessageShape)) return { ok: false };
  if (typeof stream !== "boolean") return { ok: false };
  if (maxTokens !== undefined && typeof maxTokens !== "number") return { ok: false };
  if (!optionalNumbers.ok || !stop.ok) return { ok: false };
  if (normalizedMaxTokens !== undefined && (!Number.isInteger(normalizedMaxTokens) || normalizedMaxTokens < 1 || normalizedMaxTokens > 4096)) {
    return { ok: false };
  }

  return {
    ok: true,
    body: {
      model,
      messages: value.messages,
      stream,
      maxTokens: normalizedMaxTokens,
      temperature: optionalNumbers.values.temperature,
      topP: optionalNumbers.values.topP,
      presencePenalty: optionalNumbers.values.presencePenalty,
      frequencyPenalty: optionalNumbers.values.frequencyPenalty,
      stop: stop.value
    }
  };
}

function isValidMessageShape(value: unknown) {
  return isRecord(value) && typeof value.role === "string" && value.role.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getCandidateModel(value: unknown) {
  if (!isRecord(value) || typeof value.model !== "string") return null;
  return value.model.trim().slice(0, 128) || null;
}

function parseOptionalNumberFields(value: Record<string, unknown>):
  | {
      ok: true;
      values: Pick<ChatCompletionBody, "temperature" | "topP" | "presencePenalty" | "frequencyPenalty">;
    }
  | { ok: false } {
  const temperature = parseOptionalFiniteNumber(value.temperature);
  const topP = parseOptionalFiniteNumber(value.top_p);
  const presencePenalty = parseOptionalFiniteNumber(value.presence_penalty);
  const frequencyPenalty = parseOptionalFiniteNumber(value.frequency_penalty);

  if (!temperature.ok || !topP.ok || !presencePenalty.ok || !frequencyPenalty.ok) {
    return { ok: false };
  }

  return {
    ok: true,
    values: {
      temperature: temperature.value,
      topP: topP.value,
      presencePenalty: presencePenalty.value,
      frequencyPenalty: frequencyPenalty.value
    }
  };
}

function parseOptionalFiniteNumber(value: unknown):
  | { ok: true; value?: number }
  | { ok: false } {
  if (value === undefined) return { ok: true };
  if (typeof value !== "number" || !Number.isFinite(value)) return { ok: false };
  return { ok: true, value };
}

function parseStop(value: unknown):
  | { ok: true; value?: string | string[] }
  | { ok: false } {
  if (value === undefined) return { ok: true };
  if (typeof value === "string") return { ok: true, value };
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
    return { ok: true, value };
  }
  return { ok: false };
}

function isAbortError(error: unknown) {
  return isRecord(error) && error.name === "AbortError";
}

function buildOpenAICompatibleForwardBody(body: ChatCompletionBody, maxOutputTokens: number): Omit<OpenAICompatibleForwardBody, "model"> {
  const forwardBody: Omit<OpenAICompatibleForwardBody, "model"> = {
    messages: body.messages,
    stream: false,
    max_tokens: maxOutputTokens
  };

  if (body.temperature !== undefined) forwardBody.temperature = body.temperature;
  if (body.topP !== undefined) forwardBody.top_p = body.topP;
  if (body.presencePenalty !== undefined) forwardBody.presence_penalty = body.presencePenalty;
  if (body.frequencyPenalty !== undefined) forwardBody.frequency_penalty = body.frequencyPenalty;
  if (body.stop !== undefined) forwardBody.stop = body.stop;

  return forwardBody;
}

function buildOpenAICompatibleStreamForwardBody(body: ChatCompletionBody, maxOutputTokens: number): Omit<OpenAICompatibleStreamForwardBody, "model"> {
  const forwardBody: Omit<OpenAICompatibleStreamForwardBody, "model"> = {
    messages: body.messages,
    stream: true,
    max_tokens: maxOutputTokens,
    stream_options: { include_usage: true }
  };

  if (body.temperature !== undefined) forwardBody.temperature = body.temperature;
  if (body.topP !== undefined) forwardBody.top_p = body.topP;
  if (body.presencePenalty !== undefined) forwardBody.presence_penalty = body.presencePenalty;
  if (body.frequencyPenalty !== undefined) forwardBody.frequency_penalty = body.frequencyPenalty;
  if (body.stop !== undefined) forwardBody.stop = body.stop;

  return forwardBody;
}

function canChargeStreamingUsage(input: {
  metadata: OpenAISseMetadata;
  clientDisconnected: boolean;
  streamReadFailed: boolean;
}) {
  return !input.clientDisconnected && !input.streamReadFailed && input.metadata.sawDone && !input.metadata.malformed && input.metadata.hasUsage;
}

function getStreamFinishReason(input: {
  metadata: OpenAISseMetadata;
  clientDisconnected: boolean;
  streamReadFailed: boolean;
}) {
  if (input.clientDisconnected) return "client_disconnected";
  if (input.streamReadFailed) return "upstream_error";
  if (input.metadata.malformed) return "malformed_sse";
  if (!input.metadata.sawDone) return "upstream_error";
  if (!input.metadata.hasUsage) return "no_usage";
  return input.metadata.finishReason ?? "stop";
}

function getStreamReviewErrorCode(streamFinishReason: string): UsageLogErrorCode | undefined {
  if (streamFinishReason === "client_disconnected") return "client_disconnected";
  if (streamFinishReason === "malformed_sse") return "malformed_sse";
  if (streamFinishReason === "upstream_error") return "upstream_error";
  return undefined;
}

function getStreamReviewErrorMessage(streamFinishReason: string) {
  if (streamFinishReason === "client_disconnected") return "Client disconnected before stream completion.";
  if (streamFinishReason === "malformed_sse") return "Upstream stream was malformed.";
  if (streamFinishReason === "upstream_error") return "Upstream stream ended before confirmed usage.";
  return undefined;
}

async function writeSseChunk(reply: FastifyReply, chunk: Uint8Array) {
  if (reply.raw.destroyed || reply.raw.writableEnded) return false;
  if (reply.raw.write(chunk)) return true;

  return new Promise<boolean>((resolve) => {
    const done = (ok: boolean) => {
      reply.raw.off("drain", onDrain);
      reply.raw.off("close", onClose);
      resolve(ok && !reply.raw.destroyed && !reply.raw.writableEnded);
    };
    const onDrain = () => done(true);
    const onClose = () => done(false);

    reply.raw.once("drain", onDrain);
    reply.raw.once("close", onClose);
  });
}

function mapUpstreamFailure(upstream: Extract<OpenAICompatibleUpstreamResult, { ok: false }>): {
  statusCode: number;
  errorCode: GatewayErrorCode;
  errorMessage: string;
} {
  if (upstream.reason === "not_configured") {
    return {
      statusCode: 500,
      errorCode: "internal_error",
      errorMessage: "Upstream provider is not configured."
    };
  }

  if (upstream.reason === "timeout") {
    return {
      statusCode: 502,
      errorCode: "upstream_error",
      errorMessage: "Upstream request timed out."
    };
  }

  if (upstream.reason === "invalid_response") {
    return {
      statusCode: 502,
      errorCode: "upstream_error",
      errorMessage: "Upstream response was invalid."
    };
  }

  return {
    statusCode: 502,
    errorCode: "upstream_error",
    errorMessage: "Upstream request failed."
  };
}

async function writeChatUsageLog(
  context: GatewayRequestContext,
  apiKey: AuthenticatedGatewayKey,
  input: {
    statusCode: number;
    model: string | null;
    isStream: boolean;
    inputTokens?: number;
    outputTokens?: number;
    latencyMs?: number | null;
    upstreamProvider?: string | null;
    upstreamModel?: string | null;
    routeId?: string | null;
    costUsd?: string;
    chargedUsd?: string;
    billingStatus?: "not_billable" | "pending" | "billed" | "review";
    errorCode?: UsageLogErrorCode;
    errorMessage?: string;
    streamFinishReason?: string | null;
  }
) {
  return createUsageLog({
    requestId: context.requestId,
    userId: apiKey.userId,
    developerProfileId: apiKey.developerProfileId,
    apiKeyId: apiKey.apiKeyId,
    keyPrefix: apiKey.keyPrefix,
    method: "POST",
    path: chatCompletionsPath,
    model: input.model,
    publicModelName: input.model,
    upstreamProvider: input.upstreamProvider ?? null,
    upstreamModel: input.upstreamModel ?? null,
    statusCode: input.statusCode,
    inputTokens: input.inputTokens ?? 0,
    outputTokens: input.outputTokens ?? 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    costUsd: input.costUsd ?? "0",
    chargedUsd: input.chargedUsd ?? "0",
    billingStatus: input.billingStatus ?? "not_billable",
    latencyMs: input.latencyMs,
    isStream: input.isStream,
    errorCode: input.errorCode,
    errorMessage: input.errorMessage,
    streamFinishReason: input.streamFinishReason,
    routeId: input.routeId ?? null
  });
}
