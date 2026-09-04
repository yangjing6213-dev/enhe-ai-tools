import { getOpenAICompatibleUpstreamModel } from "./models";

export type OpenAICompatibleForwardBody = {
  model: string;
  messages: Array<Record<string, unknown>>;
  stream: false;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  stop?: string | string[];
};

export type OpenAICompatibleStreamForwardBody = Omit<OpenAICompatibleForwardBody, "stream"> & {
  stream: true;
  stream_options: { include_usage: true };
};

export type OpenAICompatibleUpstreamResult =
  | {
      ok: true;
      body: unknown;
      upstreamModel: string;
      inputTokens: number;
      outputTokens: number;
      hasUsage: boolean;
      latencyMs: number;
    }
  | {
      ok: false;
      reason: "not_configured" | "upstream_failed" | "timeout" | "invalid_response";
      upstreamModel: string | null;
      latencyMs: number | null;
    };

export type OpenAICompatibleUpstreamStreamResult =
  | {
      ok: true;
      body: ReadableStream<Uint8Array>;
      upstreamModel: string;
      latencyMs: number;
      abort: () => void;
    }
  | {
      ok: false;
      reason: "not_configured" | "upstream_failed" | "timeout" | "invalid_response";
      upstreamModel: string | null;
      latencyMs: number | null;
    };

type OpenAICompatibleConfig = {
  chatCompletionsUrl: string;
  apiKey: string;
  upstreamModel: string;
};

const upstreamTimeoutMs = 30_000;

export async function callOpenAICompatibleChatCompletion(input: {
  publicModelId: string;
  body: Omit<OpenAICompatibleForwardBody, "model">;
}): Promise<OpenAICompatibleUpstreamResult> {
  const config = getOpenAICompatibleConfig(input.publicModelId);
  if (!config) {
    return {
      ok: false,
      reason: "not_configured",
      upstreamModel: null,
      latencyMs: null
    };
  }

  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), upstreamTimeoutMs);

  try {
    const response = await fetch(config.chatCompletionsUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ...input.body,
        model: config.upstreamModel
      }),
      signal: controller.signal
    });
    const latencyMs = getLatencyMs(startedAt);

    if (!response.ok) {
      return {
        ok: false,
        reason: "upstream_failed",
        upstreamModel: config.upstreamModel,
        latencyMs
      };
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      return {
        ok: false,
        reason: "invalid_response",
        upstreamModel: config.upstreamModel,
        latencyMs
      };
    }

    const usage = getUsage(body);

    return {
      ok: true,
      body,
      upstreamModel: config.upstreamModel,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      hasUsage: usage.hasUsage,
      latencyMs
    };
  } catch (error) {
    return {
      ok: false,
      reason: isAbortError(error) ? "timeout" : "upstream_failed",
      upstreamModel: config.upstreamModel,
      latencyMs: getLatencyMs(startedAt)
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function callOpenAICompatibleChatCompletionStream(input: {
  publicModelId: string;
  body: Omit<OpenAICompatibleStreamForwardBody, "model">;
}): Promise<OpenAICompatibleUpstreamStreamResult> {
  const config = getOpenAICompatibleConfig(input.publicModelId);
  if (!config) {
    return {
      ok: false,
      reason: "not_configured",
      upstreamModel: null,
      latencyMs: null
    };
  }

  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), upstreamTimeoutMs);

  try {
    const response = await fetch(config.chatCompletionsUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ...input.body,
        model: config.upstreamModel
      }),
      signal: controller.signal
    });
    const latencyMs = getLatencyMs(startedAt);
    clearTimeout(timeout);

    if (!response.ok) {
      return {
        ok: false,
        reason: "upstream_failed",
        upstreamModel: config.upstreamModel,
        latencyMs
      };
    }

    if (!response.body) {
      return {
        ok: false,
        reason: "invalid_response",
        upstreamModel: config.upstreamModel,
        latencyMs
      };
    }

    return {
      ok: true,
      body: response.body,
      upstreamModel: config.upstreamModel,
      latencyMs,
      abort: () => controller.abort()
    };
  } catch (error) {
    clearTimeout(timeout);
    return {
      ok: false,
      reason: isAbortError(error) ? "timeout" : "upstream_failed",
      upstreamModel: config.upstreamModel,
      latencyMs: getLatencyMs(startedAt)
    };
  }
}

function getOpenAICompatibleConfig(publicModelId: string): OpenAICompatibleConfig | null {
  const baseUrl = process.env.ENHE_UPSTREAM_OPENAI_BASE_URL?.trim();
  const apiKey = process.env.ENHE_UPSTREAM_OPENAI_API_KEY?.trim();
  const upstreamModel = getOpenAICompatibleUpstreamModel(publicModelId);

  if (!baseUrl || !apiKey || !upstreamModel) return null;

  const chatCompletionsUrl = getChatCompletionsUrl(baseUrl);
  if (!chatCompletionsUrl) return null;

  return {
    chatCompletionsUrl,
    apiKey,
    upstreamModel
  };
}

function getChatCompletionsUrl(baseUrl: string) {
  try {
    const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
    return new URL("v1/chat/completions", normalizedBaseUrl).toString();
  } catch {
    return null;
  }
}

function getUsage(body: unknown) {
  if (!isRecord(body) || !isRecord(body.usage)) {
    return { inputTokens: 0, outputTokens: 0, hasUsage: false };
  }

  const inputTokens = body.usage.prompt_tokens;
  const outputTokens = body.usage.completion_tokens;
  if (!isNonNegativeInteger(inputTokens) || !isNonNegativeInteger(outputTokens)) {
    return { inputTokens: 0, outputTokens: 0, hasUsage: false };
  }

  return {
    inputTokens,
    outputTokens,
    hasUsage: true
  };
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function getLatencyMs(startedAt: number) {
  return Math.max(0, Date.now() - startedAt);
}

function isAbortError(error: unknown) {
  return isRecord(error) && error.name === "AbortError";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
