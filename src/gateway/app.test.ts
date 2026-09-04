import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import { buildGatewayApp } from "./app";
import { createApiKeySecret, formatApiKeyPrefix, hashApiKey } from "@/features/enhe-api/server/api-key-crypto";
import { chargeUsage } from "@/features/enhe-api/server/wallet";

const prisma = new PrismaClient();
const testPepper = "phase-nine-gateway-test-pepper-32chars";
const testUpstreamBaseUrl = "https://upstream.example.test/openai";
const testUpstreamApiKey = "test-upstream-api-key-32chars";
const testUpstreamModel = "test-upstream-chat-model";

type TestAccount = {
  userId: string;
  developerProfileId: string;
  activeKey: string;
  revokedKey: string;
  suspendedKey: string;
  disabledUserKey: string;
  zeroWalletKey: string;
};

describe("ENHE API Gateway", () => {
  let account: TestAccount;
  const previousPepper = process.env.ENHE_API_KEY_PEPPER;
  const previousUpstreamBaseUrl = process.env.ENHE_UPSTREAM_OPENAI_BASE_URL;
  const previousUpstreamApiKey = process.env.ENHE_UPSTREAM_OPENAI_API_KEY;
  const previousUpstreamDefaultModel = process.env.ENHE_UPSTREAM_OPENAI_DEFAULT_MODEL;
  const originalFetch = globalThis.fetch;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    process.env.ENHE_API_KEY_PEPPER = testPepper;
    account = await createTestAccount("active", "active");
    await createWalletForAccount(account.userId, account.developerProfileId, "0.01000000");
    const revoked = await createApiKeyForAccount(account.userId, account.developerProfileId, "revoked");
    const suspended = await createTestAccount("suspended", "active");
    const disabled = await createTestAccount("active", "disabled");
    const zeroWallet = await createTestAccount("active", "active");
    await createWalletForAccount(zeroWallet.userId, zeroWallet.developerProfileId, "0");
    account.revokedKey = revoked;
    account.suspendedKey = suspended.activeKey;
    account.disabledUserKey = disabled.activeKey;
    account.zeroWalletKey = zeroWallet.activeKey;
  });

  afterAll(async () => {
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    if (previousPepper === undefined) {
      delete process.env.ENHE_API_KEY_PEPPER;
    } else {
      process.env.ENHE_API_KEY_PEPPER = previousPepper;
    }
    await prisma.$disconnect();
  });

  afterEach(() => {
    restoreEnv("ENHE_UPSTREAM_OPENAI_BASE_URL", previousUpstreamBaseUrl);
    restoreEnv("ENHE_UPSTREAM_OPENAI_API_KEY", previousUpstreamApiKey);
    restoreEnv("ENHE_UPSTREAM_OPENAI_DEFAULT_MODEL", previousUpstreamDefaultModel);
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  test("GET /health returns liveness without database details", async () => {
    const app = buildGatewayApp();
    const response = await app.inject({ method: "GET", url: "/health" });
    await app.close();

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: "ok",
      service: "enhe-api-gateway"
    });
  });

  test("GET /v1/models without API key returns 401", async () => {
    const app = buildGatewayApp();
    const response = await app.inject({ method: "GET", url: "/v1/models" });
    await app.close();

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe("invalid_api_key");
  });

  test("GET /v1/models with malformed API key returns 401", async () => {
    const app = buildGatewayApp();
    const response = await app.inject({
      method: "GET",
      url: "/v1/models",
      headers: { authorization: "Bearer not-an-enhe-key" }
    });
    await app.close();

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe("invalid_api_key");
  });

  test("GET /v1/models with unknown API key returns 401", async () => {
    const app = buildGatewayApp();
    const unknownKey = createApiKeySecret();
    const response = await app.inject({
      method: "GET",
      url: "/v1/models",
      headers: { authorization: `Bearer ${unknownKey}` }
    });
    await app.close();

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe("invalid_api_key");
  });

  test("GET /v1/models with revoked API key returns 401", async () => {
    const app = buildGatewayApp();
    const response = await app.inject({
      method: "GET",
      url: "/v1/models",
      headers: { authorization: `Bearer ${account.revokedKey}` }
    });
    await app.close();

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe("invalid_api_key");
  });

  test("GET /v1/models with active API key returns OpenAI-compatible model list", async () => {
    const app = buildGatewayApp();
    const response = await app.inject({
      method: "GET",
      url: "/v1/models",
      headers: { authorization: `Bearer ${account.activeKey}` }
    });
    await app.close();

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      object: "list",
      data: [
        { id: "enhe-chat-lite", object: "model", created: 1760000000, owned_by: "enhe" },
        { id: "enhe-coder-lite", object: "model", created: 1760000000, owned_by: "enhe" },
        { id: "enhe-claude-compatible", object: "model", created: 1760000000, owned_by: "enhe" }
      ]
    });
  });

  test("GET /v1/models with suspended developer returns 403", async () => {
    const app = buildGatewayApp();
    const response = await app.inject({
      method: "GET",
      url: "/v1/models",
      headers: { authorization: `Bearer ${account.suspendedKey}` }
    });
    await app.close();

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe("developer_suspended");
  });

  test("GET /v1/models with disabled user returns 403", async () => {
    const app = buildGatewayApp();
    const response = await app.inject({
      method: "GET",
      url: "/v1/models",
      headers: { authorization: `Bearer ${account.disabledUserKey}` }
    });
    await app.close();

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe("developer_suspended");
  });

  test("POST /v1/chat/completions without API key returns 401", async () => {
    const app = buildGatewayApp();
    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      payload: validChatPayload()
    });
    await app.close();

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe("invalid_api_key");
  });

  test("POST /v1/chat/completions with revoked API key returns 401", async () => {
    const app = buildGatewayApp();
    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      headers: { authorization: `Bearer ${account.revokedKey}` },
      payload: validChatPayload()
    });
    await app.close();

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe("invalid_api_key");
  });

  test("POST /v1/chat/completions with suspended developer returns 403", async () => {
    const app = buildGatewayApp();
    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      headers: { authorization: `Bearer ${account.suspendedKey}` },
      payload: validChatPayload()
    });
    await app.close();

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe("developer_suspended");
  });

  test("POST /v1/chat/completions with invalid body returns 400 and writes usage log", async () => {
    const app = buildGatewayApp();
    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      headers: { authorization: `Bearer ${account.activeKey}` },
      payload: { model: "enhe-chat-lite", messages: [] }
    });
    await app.close();

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("invalid_request");
    const log = await expectUsageLog(response.headers["x-request-id"], 400);
    expect(log.errorCode).toBe("invalid_request");
    expect(log.errorMessage ?? "").not.toContain("messages");
  });

  test("POST /v1/chat/completions with unknown model returns 404 and writes usage log", async () => {
    const app = buildGatewayApp();
    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      headers: { authorization: `Bearer ${account.activeKey}` },
      payload: validChatPayload({ model: "unknown-model" })
    });
    await app.close();

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe("model_not_found");
    const log = await expectUsageLog(response.headers["x-request-id"], 404);
    expect(log.model).toBe("unknown-model");
    expect(log.errorCode).toBe("model_not_found");
  });

  test("POST /v1/chat/completions proxies stream=true request and bills confirmed usage", async () => {
    configureUpstream();
    const fetchMock = mockUpstreamStreamFetch([
      sseData({
        id: "chatcmpl-stream-test",
        object: "chat.completion.chunk",
        choices: [{ index: 0, delta: { role: "assistant", content: "streamed response should not be logged" }, finish_reason: null }]
      }),
      sseData({
        id: "chatcmpl-stream-test",
        object: "chat.completion.chunk",
        choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
        usage: { prompt_tokens: 7, completion_tokens: 9, total_tokens: 16 }
      }),
      "data: [DONE]\n\n"
    ]);
    const creditTransactionsBefore = await countCreditTransactionsForUser(account.userId);
    const walletBefore = await expectWallet(account.userId);
    const app = buildGatewayApp();
    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      headers: { authorization: `Bearer ${account.activeKey}` },
      payload: validChatPayload({
        stream: true,
        messages: [{ role: "user", content: "secret streaming prompt should not be logged" }],
        metadata: { should_not_forward: true },
        authorization: "Bearer should-not-forward"
      })
    });
    await app.close();

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/event-stream");
    expect(response.body).toContain("data:");
    expect(response.body).toContain("[DONE]");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${testUpstreamBaseUrl}/v1/chat/completions`);
    expect(init.headers).toEqual({
      Authorization: `Bearer ${testUpstreamApiKey}`,
      "Content-Type": "application/json"
    });
    const forwardedBody = JSON.parse(String(init.body));
    expect(forwardedBody).toEqual({
      model: testUpstreamModel,
      messages: [{ role: "user", content: "secret streaming prompt should not be logged" }],
      stream: true,
      max_tokens: 1024,
      stream_options: { include_usage: true }
    });
    expect(forwardedBody).not.toHaveProperty("metadata");
    expect(forwardedBody).not.toHaveProperty("authorization");

    const log = await expectUsageLog(response.headers["x-request-id"], 200);
    expect(log.isStream).toBe(true);
    expect(log.billingStatus).toBe("billed");
    expect(log.inputTokens).toBe(7);
    expect(log.outputTokens).toBe(9);
    expect(log.costUsd.toNumber()).toBeGreaterThan(0);
    expect(log.chargedUsd.toNumber()).toBeGreaterThan(0);
    expect(log.walletTransactionId).toEqual(expect.any(String));
    expect(log.streamFinishReason).toBe("stop");
    expect(JSON.stringify(log)).not.toContain(account.activeKey);
    expect(JSON.stringify(log)).not.toContain(testUpstreamApiKey);
    expect(JSON.stringify(log)).not.toContain("secret streaming prompt should not be logged");
    expect(JSON.stringify(log)).not.toContain("streamed response should not be logged");
    expect(JSON.stringify(log)).not.toContain("Authorization");
    expect(await countCreditTransactionsForUser(account.userId)).toBe(creditTransactionsBefore + 1);

    const transaction = await prisma.apiCreditTransaction.findUnique({
      where: { id: log.walletTransactionId ?? "" }
    });
    expect(transaction).not.toBeNull();
    expect(transaction?.transactionType).toBe("api_charge");
    expect(transaction?.usageLogId).toBe(log.id);
    expect(transaction?.amountUsd.isNegative()).toBe(true);
    expect(transaction?.amountUsd.abs().toFixed(8)).toBe(log.chargedUsd.toFixed(8));

    const walletAfter = await expectWallet(account.userId);
    expect(walletAfter.planBalanceUsd.toFixed(8)).toBe(walletBefore.planBalanceUsd.minus(log.chargedUsd).toFixed(8));
  });

  test("POST /v1/chat/completions with stream=true and no usage enters review without billing", async () => {
    configureUpstream();
    mockUpstreamStreamFetch([
      sseData({
        id: "chatcmpl-stream-no-usage",
        object: "chat.completion.chunk",
        choices: [{ index: 0, delta: { content: "no usage response should not be logged" }, finish_reason: "stop" }]
      }),
      "data: [DONE]\n\n"
    ]);
    const creditTransactionsBefore = await countCreditTransactionsForUser(account.userId);
    const app = buildGatewayApp();
    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      headers: { authorization: `Bearer ${account.activeKey}` },
      payload: validChatPayload({ stream: true })
    });
    await app.close();

    expect(response.statusCode).toBe(200);
    const log = await expectUsageLog(response.headers["x-request-id"], 200);
    expect(log.isStream).toBe(true);
    expect(log.billingStatus).toBe("review");
    expect(log.inputTokens).toBe(0);
    expect(log.outputTokens).toBe(0);
    expect(log.costUsd.toFixed()).toBe("0");
    expect(log.chargedUsd.toFixed()).toBe("0");
    expect(log.streamFinishReason).toBe("no_usage");
    expect(JSON.stringify(log)).not.toContain("no usage response should not be logged");
    expect(await countCreditTransactionsForUser(account.userId)).toBe(creditTransactionsBefore);
  });

  test("POST /v1/chat/completions with stream=true and zero wallet returns 402 before upstream", async () => {
    const fetchMock = mockUpstreamStreamFetch([streamUsageSse()]);
    const creditTransactionsBefore = await prisma.apiCreditTransaction.count();
    const app = buildGatewayApp();
    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      headers: { authorization: `Bearer ${account.zeroWalletKey}` },
      payload: validChatPayload({ stream: true })
    });
    await app.close();

    expect(response.statusCode).toBe(402);
    expect(response.json().error.code).toBe("insufficient_credit");
    const log = await expectUsageLog(response.headers["x-request-id"], 402);
    expect(log.isStream).toBe(true);
    expect(log.errorCode).toBe("insufficient_credit");
    expect(log.chargedUsd.toFixed()).toBe("0");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await prisma.apiCreditTransaction.count()).toBe(creditTransactionsBefore);
  });

  test("POST /v1/chat/completions with stream=true maps upstream 500 to 502", async () => {
    configureUpstream();
    mockUpstreamStreamFetch([streamUsageSse()], 500);
    const creditTransactionsBefore = await countCreditTransactionsForUser(account.userId);
    const app = buildGatewayApp();
    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      headers: { authorization: `Bearer ${account.activeKey}` },
      payload: validChatPayload({ stream: true })
    });
    await app.close();

    expect(response.statusCode).toBe(502);
    expect(response.json().error.code).toBe("upstream_error");
    const log = await expectUsageLog(response.headers["x-request-id"], 502);
    expect(log.isStream).toBe(true);
    expect(log.errorCode).toBe("upstream_error");
    expect(log.billingStatus).toBe("not_billable");
    expect(await countCreditTransactionsForUser(account.userId)).toBe(creditTransactionsBefore);
  });

  test("POST /v1/chat/completions with stream=true maps upstream timeout to 502", async () => {
    configureUpstream();
    const fetchMock = vi.fn().mockRejectedValue(Object.assign(new Error("aborted"), { name: "AbortError" }));
    globalThis.fetch = fetchMock as typeof fetch;
    const creditTransactionsBefore = await countCreditTransactionsForUser(account.userId);
    const app = buildGatewayApp();
    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      headers: { authorization: `Bearer ${account.activeKey}` },
      payload: validChatPayload({ stream: true })
    });
    await app.close();

    expect(response.statusCode).toBe(502);
    expect(response.json().error.code).toBe("upstream_error");
    const log = await expectUsageLog(response.headers["x-request-id"], 502);
    expect(log.isStream).toBe(true);
    expect(log.errorMessage).toBe("Upstream request timed out.");
    expect(await countCreditTransactionsForUser(account.userId)).toBe(creditTransactionsBefore);
  });

  test("POST /v1/chat/completions with stream=true malformed SSE enters review", async () => {
    configureUpstream();
    mockUpstreamStreamFetch([
      "data: {not-json}\n\n",
      "data: [DONE]\n\n"
    ]);
    const creditTransactionsBefore = await countCreditTransactionsForUser(account.userId);
    const app = buildGatewayApp();
    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      headers: { authorization: `Bearer ${account.activeKey}` },
      payload: validChatPayload({ stream: true })
    });
    await app.close();

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain("{not-json}");
    const log = await expectUsageLog(response.headers["x-request-id"], 200);
    expect(log.isStream).toBe(true);
    expect(log.billingStatus).toBe("review");
    expect(log.streamFinishReason).toBe("malformed_sse");
    expect(log.errorCode).toBe("malformed_sse");
    expect(log.chargedUsd.toFixed()).toBe("0");
    expect(await countCreditTransactionsForUser(account.userId)).toBe(creditTransactionsBefore);
  });

  test("POST /v1/chat/completions with stream=true premature EOF enters review", async () => {
    configureUpstream();
    mockUpstreamStreamFetch([
      sseData({
        id: "chatcmpl-stream-premature",
        object: "chat.completion.chunk",
        choices: [{ index: 0, delta: { content: "premature response should not be logged" }, finish_reason: "stop" }]
      })
    ]);
    const creditTransactionsBefore = await countCreditTransactionsForUser(account.userId);
    const app = buildGatewayApp();
    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      headers: { authorization: `Bearer ${account.activeKey}` },
      payload: validChatPayload({ stream: true })
    });
    await app.close();

    expect(response.statusCode).toBe(200);
    const log = await expectUsageLog(response.headers["x-request-id"], 200);
    expect(log.isStream).toBe(true);
    expect(log.billingStatus).toBe("review");
    expect(log.streamFinishReason).toBe("upstream_error");
    expect(log.errorCode).toBe("upstream_error");
    expect(log.chargedUsd.toFixed()).toBe("0");
    expect(JSON.stringify(log)).not.toContain("premature response should not be logged");
    expect(await countCreditTransactionsForUser(account.userId)).toBe(creditTransactionsBefore);
  });

  test("POST /v1/chat/completions with zero wallet returns 402 and writes usage log", async () => {
    const fetchMock = mockUpstreamFetch(upstreamSuccessBody());
    const creditTransactionsBefore = await prisma.apiCreditTransaction.count();
    const app = buildGatewayApp();
    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      headers: { authorization: `Bearer ${account.zeroWalletKey}` },
      payload: validChatPayload()
    });
    await app.close();

    expect(response.statusCode).toBe(402);
    expect(response.json().error.code).toBe("insufficient_credit");
    const log = await expectUsageLog(response.headers["x-request-id"], 402);
    expect(log.errorCode).toBe("insufficient_credit");
    expect(log.chargedUsd.toFixed()).toBe("0");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await prisma.apiCreditTransaction.count()).toBe(creditTransactionsBefore);
  });

  test("POST /v1/chat/completions with missing upstream configuration returns 500 and writes safe usage log", async () => {
    const fetchMock = mockUpstreamFetch(upstreamSuccessBody());
    clearUpstreamConfiguration();
    const app = buildGatewayApp();
    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      headers: { authorization: `Bearer ${account.activeKey}` },
      payload: validChatPayload()
    });
    await app.close();

    expect(response.statusCode).toBe(500);
    expect(response.json().error.code).toBe("internal_error");
    expect(fetchMock).not.toHaveBeenCalled();
    const log = await expectUsageLog(response.headers["x-request-id"], 500);
    expect(log.errorCode).toBe("internal_error");
    expect(log.errorMessage).toBe("Upstream provider is not configured.");
  });

  test("POST /v1/chat/completions forwards stream=false request to OpenAI-compatible upstream", async () => {
    configureUpstream();
    const upstreamBody = upstreamSuccessBody();
    const fetchMock = mockUpstreamFetch(upstreamBody);
    const creditTransactionsBefore = await countCreditTransactionsForUser(account.userId);
    const walletBefore = await expectWallet(account.userId);
    const app = buildGatewayApp();
    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      headers: { authorization: `Bearer ${account.activeKey}` },
      payload: validChatPayload({
        messages: [{ role: "user", content: "secret prompt should not be logged" }],
        temperature: 0.2,
        top_p: 0.9,
        metadata: { should_not_forward: true },
        authorization: "Bearer should-not-forward"
      })
    });
    await app.close();

    expect(response.statusCode).toBe(200);
    expect(response.headers["x-request-id"]).toEqual(expect.any(String));
    expect(response.json()).toEqual(upstreamBody);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${testUpstreamBaseUrl}/v1/chat/completions`);
    expect(init.headers).toEqual({
      Authorization: `Bearer ${testUpstreamApiKey}`,
      "Content-Type": "application/json"
    });
    const forwardedBody = JSON.parse(String(init.body));
    expect(forwardedBody).toEqual({
      model: testUpstreamModel,
      messages: [{ role: "user", content: "secret prompt should not be logged" }],
      stream: false,
      max_tokens: 1024,
      temperature: 0.2,
      top_p: 0.9
    });
    expect(forwardedBody).not.toHaveProperty("metadata");
    expect(forwardedBody).not.toHaveProperty("authorization");

    const log = await expectUsageLog(response.headers["x-request-id"], 200);
    expect(log.model).toBe("enhe-chat-lite");
    expect(log.publicModelName).toBe("enhe-chat-lite");
    expect(log.inputTokens).toBe(11);
    expect(log.outputTokens).toBe(13);
    expect(log.latencyMs).toEqual(expect.any(Number));
    expect(log.billingStatus).toBe("billed");
    expect(log.costUsd.toNumber()).toBeGreaterThan(0);
    expect(log.chargedUsd.toNumber()).toBeGreaterThan(0);
    expect(log.walletTransactionId).toEqual(expect.any(String));
    expect(log.upstreamProvider).toBe("openai-compatible");
    expect(log.upstreamModel).toBe(testUpstreamModel);
    expect(log.routeId).toBe("openai-compatible:enhe-chat-lite");
    expect(JSON.stringify(log)).not.toContain(account.activeKey);
    expect(JSON.stringify(log)).not.toContain(testUpstreamApiKey);
    expect(JSON.stringify(log)).not.toContain("secret prompt should not be logged");
    expect(JSON.stringify(log)).not.toContain("upstream response should not be logged");
    expect(JSON.stringify(log)).not.toContain("Authorization");
    expect(await countCreditTransactionsForUser(account.userId)).toBe(creditTransactionsBefore + 1);

    const transaction = await prisma.apiCreditTransaction.findUnique({
      where: { id: log.walletTransactionId ?? "" }
    });
    expect(transaction).not.toBeNull();
    expect(transaction?.transactionType).toBe("api_charge");
    expect(transaction?.usageLogId).toBe(log.id);
    expect(transaction?.amountUsd.isNegative()).toBe(true);
    expect(transaction?.amountUsd.abs().toFixed(8)).toBe(log.chargedUsd.toFixed(8));

    const walletAfter = await expectWallet(account.userId);
    expect(walletAfter.planBalanceUsd.toFixed(8)).toBe(walletBefore.planBalanceUsd.minus(log.chargedUsd).toFixed(8));

    const repeatedCharge = await chargeUsage({
      userId: account.userId,
      developerProfileId: account.developerProfileId,
      requestId: log.requestId,
      amountUsd: log.chargedUsd,
      idempotencyKey: `billing:${log.requestId}:${log.apiKeyId}`
    });
    expect(repeatedCharge.ok).toBe(true);
    if (repeatedCharge.ok) {
      expect(repeatedCharge.idempotent).toBe(true);
      expect(repeatedCharge.transactionId).toBe(log.walletTransactionId);
    }
    expect(await countCreditTransactionsForUser(account.userId)).toBe(creditTransactionsBefore + 1);
    const walletAfterRepeatedCharge = await expectWallet(account.userId);
    expect(walletAfterRepeatedCharge.planBalanceUsd.toFixed(8)).toBe(walletAfter.planBalanceUsd.toFixed(8));
  });

  test("POST /v1/chat/completions records zero tokens when upstream omits usage", async () => {
    configureUpstream();
    mockUpstreamFetch({
      id: "chatcmpl-no-usage",
      object: "chat.completion",
      created: 1760000002,
      model: testUpstreamModel,
      choices: [{ index: 0, message: { role: "assistant", content: "No usage." }, finish_reason: "stop" }]
    });
    const creditTransactionsBefore = await countCreditTransactionsForUser(account.userId);
    const app = buildGatewayApp();
    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      headers: { authorization: `Bearer ${account.activeKey}` },
      payload: validChatPayload()
    });
    await app.close();

    expect(response.statusCode).toBe(200);
    const log = await expectUsageLog(response.headers["x-request-id"], 200);
    expect(log.inputTokens).toBe(0);
    expect(log.outputTokens).toBe(0);
    expect(log.billingStatus).toBe("review");
    expect(log.costUsd.toFixed()).toBe("0");
    expect(log.chargedUsd.toFixed()).toBe("0");
    expect(await countCreditTransactionsForUser(account.userId)).toBe(creditTransactionsBefore);
  });

  test("POST /v1/chat/completions maps upstream 401 to 502 upstream_error", async () => {
    configureUpstream();
    mockUpstreamFetch({ error: { message: `provider denied ${testUpstreamApiKey}` } }, 401);
    const creditTransactionsBefore = await countCreditTransactionsForUser(account.userId);
    const app = buildGatewayApp();
    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      headers: { authorization: `Bearer ${account.activeKey}` },
      payload: validChatPayload()
    });
    await app.close();

    expect(response.statusCode).toBe(502);
    expect(response.json().error.code).toBe("upstream_error");
    const log = await expectUsageLog(response.headers["x-request-id"], 502);
    expect(log.errorCode).toBe("upstream_error");
    expect(log.errorMessage).toBe("Upstream request failed.");
    expect(JSON.stringify(log)).not.toContain(testUpstreamApiKey);
    expect(await countCreditTransactionsForUser(account.userId)).toBe(creditTransactionsBefore);
  });

  test("POST /v1/chat/completions maps upstream 500 to 502 upstream_error", async () => {
    configureUpstream();
    mockUpstreamFetch({ error: { message: "provider unavailable" } }, 500);
    const creditTransactionsBefore = await countCreditTransactionsForUser(account.userId);
    const app = buildGatewayApp();
    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      headers: { authorization: `Bearer ${account.activeKey}` },
      payload: validChatPayload()
    });
    await app.close();

    expect(response.statusCode).toBe(502);
    expect(response.json().error.code).toBe("upstream_error");
    const log = await expectUsageLog(response.headers["x-request-id"], 502);
    expect(log.errorMessage).toBe("Upstream request failed.");
    expect(await countCreditTransactionsForUser(account.userId)).toBe(creditTransactionsBefore);
  });

  test("POST /v1/chat/completions maps upstream timeout to 502 upstream_error", async () => {
    configureUpstream();
    const fetchMock = vi.fn().mockRejectedValue(Object.assign(new Error("aborted"), { name: "AbortError" }));
    globalThis.fetch = fetchMock as typeof fetch;
    const creditTransactionsBefore = await countCreditTransactionsForUser(account.userId);
    const app = buildGatewayApp();
    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      headers: { authorization: `Bearer ${account.activeKey}` },
      payload: validChatPayload()
    });
    await app.close();

    expect(response.statusCode).toBe(502);
    expect(response.json().error.code).toBe("upstream_error");
    const log = await expectUsageLog(response.headers["x-request-id"], 502);
    expect(log.errorMessage).toBe("Upstream request timed out.");
    expect(await countCreditTransactionsForUser(account.userId)).toBe(creditTransactionsBefore);
  });

  test("POST /v1/chat/completions maps invalid upstream JSON to 502 upstream_error", async () => {
    configureUpstream();
    const fetchMock = vi.fn().mockResolvedValue(new Response("not-json", { status: 200 }));
    globalThis.fetch = fetchMock as typeof fetch;
    const creditTransactionsBefore = await countCreditTransactionsForUser(account.userId);
    const app = buildGatewayApp();
    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      headers: { authorization: `Bearer ${account.activeKey}` },
      payload: validChatPayload()
    });
    await app.close();

    expect(response.statusCode).toBe(502);
    expect(response.json().error.code).toBe("upstream_error");
    const log = await expectUsageLog(response.headers["x-request-id"], 502);
    expect(log.errorMessage).toBe("Upstream response was invalid.");
    expect(await countCreditTransactionsForUser(account.userId)).toBe(creditTransactionsBefore);
  });

  async function createTestAccount(
    developerStatus: "active" | "suspended" | "closed",
    userStatus: "active" | "disabled"
  ): Promise<TestAccount> {
    const suffix = `${Date.now()}-${randomBytes(6).toString("hex")}`;
    const user = await prisma.user.create({
      data: {
        email: `gateway-test-${suffix}@example.test`,
        passwordHash: "gateway-test-password-hash",
        nickname: "Gateway Test",
        status: userStatus
      },
      select: { id: true }
    });
    createdUserIds.push(user.id);

    const profile = await prisma.apiDeveloperProfile.create({
      data: {
        userId: user.id,
        developerId: `enhe_dev_${randomBytes(4).toString("hex")}`,
        displayName: "Gateway Test",
        status: developerStatus
      },
      select: { id: true }
    });

    const activeKey = await createApiKeyForAccount(user.id, profile.id, "active");
    return {
      userId: user.id,
      developerProfileId: profile.id,
      activeKey,
      revokedKey: "",
      suspendedKey: "",
      disabledUserKey: "",
      zeroWalletKey: ""
    };
  }

  async function createApiKeyForAccount(
    userId: string,
    developerProfileId: string,
    status: "active" | "revoked"
  ) {
    const plainKey = createApiKeySecret();
    const hash = hashApiKey(plainKey);
    if (!hash.ok) throw new Error("Test API key hash failed.");

    await prisma.apiKey.create({
      data: {
        userId,
        developerProfileId,
        name: `Gateway ${status} key`,
        keyPrefix: formatApiKeyPrefix(plainKey),
        keyHash: hash.hash,
        keyHashVersion: hash.hashVersion,
        status,
        revokedAt: status === "revoked" ? new Date() : null
      }
    });

    return plainKey;
  }

  async function createWalletForAccount(userId: string, developerProfileId: string, planBalanceUsd: string) {
    await prisma.apiWallet.create({
      data: {
        userId,
        developerProfileId,
        planBalanceUsd
      }
    });
  }

  function validChatPayload(overrides: Record<string, unknown> = {}) {
    return {
      model: "enhe-chat-lite",
      messages: [{ role: "user", content: "hello" }],
      stream: false,
      ...overrides
    };
  }

  async function expectUsageLog(requestIdHeader: unknown, statusCode: number) {
    expect(requestIdHeader).toEqual(expect.any(String));
    const requestId = String(requestIdHeader);
    const log = await prisma.apiUsageLog.findUnique({
      where: { requestId }
    });
    expect(log).not.toBeNull();
    expect(log?.statusCode).toBe(statusCode);
    expect(log?.path).toBe("/v1/chat/completions");
    return log!;
  }

  async function expectWallet(userId: string) {
    const wallet = await prisma.apiWallet.findUnique({
      where: { userId }
    });
    expect(wallet).not.toBeNull();
    return wallet!;
  }

  async function countCreditTransactionsForUser(userId: string) {
    return prisma.apiCreditTransaction.count({
      where: { userId }
    });
  }

  function configureUpstream() {
    process.env.ENHE_UPSTREAM_OPENAI_BASE_URL = testUpstreamBaseUrl;
    process.env.ENHE_UPSTREAM_OPENAI_API_KEY = testUpstreamApiKey;
    process.env.ENHE_UPSTREAM_OPENAI_DEFAULT_MODEL = testUpstreamModel;
  }

  function clearUpstreamConfiguration() {
    delete process.env.ENHE_UPSTREAM_OPENAI_BASE_URL;
    delete process.env.ENHE_UPSTREAM_OPENAI_API_KEY;
    delete process.env.ENHE_UPSTREAM_OPENAI_DEFAULT_MODEL;
  }

  function mockUpstreamFetch(body: unknown, status = 200) {
    configureUpstream();
    const fetchMock = vi.fn().mockResolvedValue(Response.json(body, { status }));
    globalThis.fetch = fetchMock as typeof fetch;
    return fetchMock;
  }

  function mockUpstreamStreamFetch(chunks: string[], status = 200) {
    configureUpstream();
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      }
    });
    const fetchMock = vi.fn().mockResolvedValue(new Response(body, {
      status,
      headers: { "content-type": "text/event-stream" }
    }));
    globalThis.fetch = fetchMock as typeof fetch;
    return fetchMock;
  }

  function sseData(value: unknown) {
    return `data: ${JSON.stringify(value)}\n\n`;
  }

  function streamUsageSse() {
    return sseData({
      id: "chatcmpl-stream-usage",
      object: "chat.completion.chunk",
      choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
      usage: { prompt_tokens: 7, completion_tokens: 9, total_tokens: 16 }
    }) + "data: [DONE]\n\n";
  }

  function upstreamSuccessBody() {
    return {
      id: "chatcmpl-upstream-test",
      object: "chat.completion",
      created: 1760000001,
      model: testUpstreamModel,
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: "upstream response should not be logged" },
          finish_reason: "stop"
        }
      ],
      usage: {
        prompt_tokens: 11,
        completion_tokens: 13,
        total_tokens: 24
      }
    };
  }

  function restoreEnv(key: string, value: string | undefined) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});
