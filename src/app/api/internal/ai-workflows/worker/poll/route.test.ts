import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({
  settingUpsert: vi.fn(),
  settingFindUnique: vi.fn(),
  transaction: vi.fn(),
  queryRaw: vi.fn(),
  topicsFindMany: vi.fn(),
  batchesFindFirst: vi.fn(),
  batchesFindUnique: vi.fn(),
  batchesCount: vi.fn(),
  batchesCreate: vi.fn(),
  batchesUpdateMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    $transaction: mocks.transaction,
    aiWorkflowCollectionSetting: { upsert: mocks.settingUpsert },
    aiWorkflowTopic: { findMany: mocks.topicsFindMany },
    aiWorkflowBatch: {
      findFirst: mocks.batchesFindFirst,
      findUnique: mocks.batchesFindUnique,
      count: mocks.batchesCount,
      create: mocks.batchesCreate,
      updateMany: mocks.batchesUpdateMany,
    },
  },
}));

const token = "workflow-worker-token-1234567890";

function request(auth = "Bearer " + token) {
  return new Request("https://www.enhe-tech.com.cn/api/internal/ai-workflows/worker/poll", {
    method: "POST",
    headers: { authorization: auth, "content-type": "application/json" },
    body: JSON.stringify({ workerId: "enhe-windows-runner" }),
  });
}

async function body(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("AI_WORKFLOW_WORKER_TOKEN", token);
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-20T01:00:00.000Z"));
  mocks.settingUpsert.mockResolvedValue({
    id: "default",
    isEnabled: true,
    isPaused: false,
    scheduleTime: "09:00",
    topicListVersion: 4,
    topicListConfirmedAt: new Date("2026-10-19T00:00:00.000Z"),
  });
  mocks.settingFindUnique.mockImplementation(async () => await mocks.settingUpsert.mock.results.at(-1)?.value);
  mocks.transaction.mockImplementation((callback: (tx: unknown) => unknown) => callback({
    $queryRaw: mocks.queryRaw,
    aiWorkflowCollectionSetting: { findUnique: mocks.settingFindUnique },
    aiWorkflowTopic: { findMany: mocks.topicsFindMany },
    aiWorkflowBatch: {
      findFirst: mocks.batchesFindFirst,
      findUnique: mocks.batchesFindUnique,
      count: mocks.batchesCount,
      create: mocks.batchesCreate,
      updateMany: mocks.batchesUpdateMany,
    },
  }));
  mocks.topicsFindMany.mockResolvedValue([{ id: "topic-1", name: "工作效率", englishName: null, searchDirections: "搜索趋势 / SaaS 产品发布 / 企业预算" }]);
  mocks.batchesFindFirst.mockResolvedValue(null);
  mocks.batchesFindUnique.mockImplementation(({ where }: { where: { batchDate?: Date; id?: string } }) =>
    where.id ? {
      id: where.id,
      batchDate: new Date("2026-10-20T00:00:00.000Z"),
      topicId: "topic-1",
      topicNameSnapshot: "工作效率",
      topicSearchDirectionsSnapshot: "搜索趋势 / SaaS 产品发布 / 企业预算",
      topicOrderVersion: 4,
      attemptCount: 1,
      checkpoint: {},
      candidates: [],
    } : null,
  );
  mocks.batchesCount.mockResolvedValue(0);
  mocks.batchesCreate.mockResolvedValue({ id: "batch-1", startedAt: null });
  mocks.batchesUpdateMany.mockResolvedValue({ count: 1 });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("POST /api/internal/ai-workflows/worker/poll", () => {
  it("rejects an unconfigured or invalid worker credential without touching the queue", async () => {
    vi.stubEnv("AI_WORKFLOW_WORKER_TOKEN", "");
    expect((await POST(request())).status).toBe(503);

    vi.stubEnv("AI_WORKFLOW_WORKER_TOKEN", token);
    expect((await POST(request("Bearer wrong-worker-token-1234567890"))).status).toBe(401);
    expect(mocks.settingUpsert).not.toHaveBeenCalled();
  });

  it("does not create a scheduled batch while the ordered topic list is missing", async () => {
    mocks.topicsFindMany.mockResolvedValue([]);

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(await body(response)).toMatchObject({ ok: true, state: "idle", reason: "topic_list_missing" });
    expect(mocks.batchesCreate).not.toHaveBeenCalled();
  });

  it("does not inspect or claim queued work until the ordered topic list is confirmed", async () => {
    mocks.settingUpsert.mockResolvedValue({
      id: "default",
      isEnabled: true,
      isPaused: false,
      scheduleTime: "09:00",
      topicListVersion: 4,
      topicListConfirmedAt: null,
    });

    const result = await body(await POST(request()));

    expect(result).toMatchObject({ ok: true, state: "idle", reason: "topic_list_unconfirmed" });
    expect(mocks.topicsFindMany).not.toHaveBeenCalled();
    expect(mocks.batchesFindFirst).not.toHaveBeenCalled();
    expect(mocks.batchesUpdateMany).not.toHaveBeenCalled();
  });

  it("rechecks collection settings under the lock before reading or claiming topics", async () => {
    mocks.settingUpsert.mockResolvedValue({
      id: "default",
      isEnabled: true,
      isPaused: false,
      scheduleTime: "09:00",
      topicListVersion: 4,
      topicListConfirmedAt: new Date("2026-10-19T00:00:00.000Z"),
    });
    mocks.settingFindUnique.mockResolvedValue({
      id: "default",
      isEnabled: false,
      isPaused: false,
      scheduleTime: "09:00",
      topicListVersion: 5,
      topicListConfirmedAt: null,
    });

    const result = await body(await POST(request()));

    expect(result).toMatchObject({ ok: true, state: "idle", reason: "topic_list_unconfirmed" });
    expect(mocks.queryRaw).toHaveBeenCalledOnce();
    expect(mocks.queryRaw.mock.invocationCallOrder[0]).toBeLessThan(mocks.settingFindUnique.mock.invocationCallOrder[0]);
    expect(mocks.topicsFindMany).not.toHaveBeenCalled();
    expect(mocks.batchesFindFirst).not.toHaveBeenCalled();
    expect(mocks.batchesUpdateMany).not.toHaveBeenCalled();
  });

  it("does not claim an old scheduled batch while daily collection is disabled", async () => {
    mocks.settingUpsert.mockResolvedValue({
      id: "default",
      isEnabled: false,
      isPaused: false,
      scheduleTime: "09:00",
      topicListVersion: 4,
      topicListConfirmedAt: new Date("2026-10-19T00:00:00.000Z"),
    });

    const result = await body(await POST(request()));

    expect(result).toMatchObject({ ok: true, state: "idle", reason: "collection_disabled" });
    expect(mocks.batchesFindFirst).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: expect.objectContaining({ triggerType: "manual" }),
    }));
    expect(mocks.batchesUpdateMany).not.toHaveBeenCalled();
    expect(mocks.batchesCreate).not.toHaveBeenCalled();
  });

  it("can claim an explicit manual batch while the daily schedule is disabled", async () => {
    mocks.settingUpsert.mockResolvedValue({
      id: "default",
      isEnabled: false,
      isPaused: false,
      scheduleTime: "09:00",
      topicListVersion: 4,
      topicListConfirmedAt: new Date("2026-10-19T00:00:00.000Z"),
    });
    mocks.batchesFindFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: "manual-batch",
      status: "queued",
      startedAt: null,
    });

    const result = await body(await POST(request()));

    expect(result).toMatchObject({ ok: true, state: "claimed", batch: { id: "manual-batch" } });
    expect(mocks.batchesFindFirst).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: expect.objectContaining({ triggerType: "manual", topicOrderVersion: 4, topicId: { in: ["topic-1"] } }),
    }));
  });

  it("locks the due topic snapshot and returns a short lease without storing its raw token", async () => {
    const response = await POST(request());
    const result = await body(response);

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(result).toMatchObject({
      ok: true,
      state: "claimed",
      batch: { id: "batch-1", topicNameSnapshot: "工作效率", topicSearchDirectionsSnapshot: "搜索趋势 / SaaS 产品发布 / 企业预算", topicOrderVersion: 4 },
    });
    expect(typeof result.leaseToken).toBe("string");
    const claim = mocks.batchesUpdateMany.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(claim.data.leaseTokenHash).not.toBe(result.leaseToken);
    expect(claim.data.leaseOwnerId).toBe("enhe-windows-runner");
    expect(mocks.batchesCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        batchDate: new Date("2026-10-20T00:00:00.000Z"),
        topicId: "topic-1",
        topicNameSnapshot: "工作效率",
        topicSearchDirectionsSnapshot: "搜索趋势 / SaaS 产品发布 / 企业预算",
        topicOrderVersion: 4,
      }),
    }));
    expect(mocks.batchesFindFirst).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: expect.objectContaining({ topicOrderVersion: 4, topicId: { in: ["topic-1"] } }),
    }));
  });

  it("returns enabled fallback topics in order after the selected daily topic", async () => {
    mocks.topicsFindMany.mockResolvedValue([
      { id: "topic-1", name: "工作效率", englishName: null, searchDirections: "开发者工具" },
      { id: "topic-2", name: "视频生成", englishName: null, searchDirections: "视频创作" },
      { id: "topic-3", name: "内容创作", englishName: null, searchDirections: "创作工具" },
    ]);
    mocks.batchesCount.mockResolvedValue(1);
    mocks.batchesFindUnique.mockImplementation(({ where }: { where: { batchDate?: Date; id?: string } }) =>
      where.id ? {
        id: where.id,
        batchDate: new Date("2026-10-20T00:00:00.000Z"),
        topicId: "topic-2",
        topicNameSnapshot: "视频生成",
        topicSearchDirectionsSnapshot: "视频创作",
        topicOrderVersion: 4,
        attemptCount: 1,
        checkpoint: {},
        candidates: [],
      } : null,
    );

    const result = await body(await POST(request()));

    expect(result).toMatchObject({
      state: "claimed",
      batch: {
        topicId: "topic-2",
        topicFallbacks: [
          { id: "topic-2", name: "视频生成", searchDirections: "视频创作" },
          { id: "topic-3", name: "内容创作", searchDirections: "创作工具" },
          { id: "topic-1", name: "工作效率", searchDirections: "开发者工具" },
        ],
      },
    });
  });

  it("leaves the date's batch limit intact when today's batch already exists", async () => {
    mocks.batchesFindUnique.mockImplementation(({ where }: { where: { batchDate?: Date; id?: string } }) =>
      where.batchDate ? { id: "existing-today" } : null,
    );

    const result = await body(await POST(request()));

    expect(result).toMatchObject({ ok: true, state: "idle", reason: "daily_batch_already_exists" });
    expect(mocks.batchesCreate).not.toHaveBeenCalled();
  });

  it("returns idle after a unique-date race rolls back the claim transaction", async () => {
    mocks.batchesCreate.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError("duplicate batch date", {
      code: "P2002",
      clientVersion: "6.19.3",
    }));

    const result = await body(await POST(request()));

    expect(result).toMatchObject({ ok: true, state: "idle", reason: "daily_batch_already_exists" });
    expect(mocks.batchesUpdateMany).not.toHaveBeenCalled();
  });

  it("does not start a second topic batch on the same Shanghai calendar day after recovering an older batch", async () => {
    mocks.batchesFindFirst
      .mockResolvedValueOnce({ id: "already-ran-today" })
      .mockResolvedValueOnce(null);

    const result = await body(await POST(request()));

    expect(result).toMatchObject({ ok: true, state: "idle", reason: "daily_batch_quota_used" });
    expect(mocks.batchesCreate).not.toHaveBeenCalled();
    expect(mocks.batchesFindFirst).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: expect.objectContaining({ id: "already-ran-today" }),
    }));
  });

  it("resumes an older rate-limited batch before creating a new daily batch", async () => {
    const retryBatch = { id: "retry-batch", status: "partial", startedAt: new Date("2026-10-19T08:00:00.000Z"), leaseExpiresAt: null };
    mocks.batchesFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(retryBatch)
      .mockResolvedValueOnce(retryBatch);

    const result = await body(await POST(request()));

    expect(result).toMatchObject({ ok: true, state: "claimed", batch: { id: "retry-batch" } });
    expect(mocks.batchesCreate).not.toHaveBeenCalled();
    expect(mocks.batchesUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: "retry-batch", status: "partial", failureReason: { in: expect.arrayContaining(["GITHUB_RATE_LIMIT"]) } }),
    }));
  });

  it("reclaims today's rate-limited partial batch without creating a duplicate", async () => {
    const partialBatch = {
      id: "today-partial",
      status: "partial",
      failureReason: "GITHUB_RATE_LIMIT",
      startedAt: new Date("2026-10-20T00:30:00.000Z"),
      leaseExpiresAt: null,
    };
    mocks.batchesFindFirst.mockImplementation(({ where }: { where: Record<string, unknown> }) =>
      "lastRunDate" in where ? { id: "today-partial" } : partialBatch,
    );

    const result = await body(await POST(request()));

    expect(result).toMatchObject({ ok: true, state: "claimed", batch: { id: "today-partial" } });
    expect(mocks.batchesCreate).not.toHaveBeenCalled();
    expect(mocks.batchesUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: "today-partial", status: "partial", failureReason: { in: expect.arrayContaining(["GITHUB_RATE_LIMIT"]) } }),
      data: expect.objectContaining({ completedAt: null }),
    }));
  });

  it("reclaims today's network-interrupted partial batch without creating a duplicate", async () => {
    const partialBatch = {
      id: "today-network-partial",
      status: "partial",
      failureReason: "NETWORK_UNAVAILABLE",
      attemptCount: 1,
      startedAt: new Date("2026-10-20T00:30:00.000Z"),
      leaseExpiresAt: new Date("2026-10-20T00:59:59.000Z"),
    };
    mocks.batchesFindFirst.mockImplementation(({ where }: { where: Record<string, unknown> }) =>
      "lastRunDate" in where ? { id: "today-network-partial" } : partialBatch,
    );

    const result = await body(await POST(request()));

    expect(result).toMatchObject({ ok: true, state: "claimed", batch: { id: "today-network-partial" } });
    expect(mocks.batchesCreate).not.toHaveBeenCalled();
    expect(mocks.batchesUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: "today-network-partial", status: "partial", failureReason: { in: expect.arrayContaining(["NETWORK_UNAVAILABLE"]) } }),
      data: expect.objectContaining({ completedAt: null }),
    }));
  });

  it("waits for a rate-limit retry window instead of starting another topic", async () => {
    mocks.batchesFindFirst.mockImplementation(({ where }: { where: Record<string, unknown> }) =>
      "lastRunDate" in where ? null : {
        id: "retry-batch",
        status: "paused",
        failureReason: "GITHUB_RATE_LIMIT",
        startedAt: new Date("2026-10-19T08:00:00.000Z"),
        leaseExpiresAt: new Date("2026-10-20T01:05:00.000Z"),
      },
    );

    const result = await body(await POST(request()));

    expect(result).toMatchObject({ ok: true, state: "idle", reason: "github_rate_limit_backoff" });
    expect(mocks.batchesCreate).not.toHaveBeenCalled();
    expect(mocks.batchesUpdateMany).not.toHaveBeenCalled();
  });

  it("waits for a network retry window instead of starting another topic", async () => {
    mocks.batchesFindFirst.mockImplementation(({ where }: { where: Record<string, unknown> }) =>
      "lastRunDate" in where ? null : {
        id: "retry-batch",
        status: "paused",
        failureReason: "NETWORK_UNAVAILABLE",
        startedAt: new Date("2026-10-19T08:00:00.000Z"),
        leaseExpiresAt: new Date("2026-10-20T01:05:00.000Z"),
      },
    );

    const result = await body(await POST(request()));

    expect(result).toMatchObject({ ok: true, state: "idle", reason: "network_unavailable_backoff" });
    expect(mocks.batchesCreate).not.toHaveBeenCalled();
    expect(mocks.batchesUpdateMany).not.toHaveBeenCalled();
  });
});
