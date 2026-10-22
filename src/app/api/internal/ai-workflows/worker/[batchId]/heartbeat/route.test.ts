import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hashAiWorkflowLeaseToken } from "@/lib/ai-workflows/worker";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({
  batchesFindUnique: vi.fn(),
  batchesUpdateMany: vi.fn(),
  settingsUpsert: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    aiWorkflowBatch: {
      findUnique: mocks.batchesFindUnique,
      updateMany: mocks.batchesUpdateMany,
    },
    aiWorkflowCollectionSetting: { upsert: mocks.settingsUpsert },
  },
}));

const workerToken = "workflow-worker-token-1234567890";
const leaseToken = "batch-lease-token-1234567890";

function request(body: unknown, authorization = "Bearer " + workerToken) {
  return new Request("https://www.enhe-tech.com.cn/api/internal/ai-workflows/worker/batch-1/heartbeat", {
    method: "POST",
    headers: { authorization, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("AI_WORKFLOW_WORKER_TOKEN", workerToken);
  mocks.batchesFindUnique.mockResolvedValue({
    id: "batch-1",
    status: "running",
    leaseOwnerId: "runner-1",
    leaseTokenHash: hashAiWorkflowLeaseToken(leaseToken),
    leaseExpiresAt: new Date(Date.now() + 60_000),
  });
  mocks.batchesUpdateMany.mockResolvedValue({ count: 1 });
  mocks.settingsUpsert.mockResolvedValue({ isPaused: false });
});

afterEach(() => vi.unstubAllEnvs());

describe("POST /api/internal/ai-workflows/worker/[batchId]/heartbeat", () => {
  it("rejects a missing or mismatched lease before changing progress", async () => {
    const missingLease = await POST(request({ workerId: "runner-1", stage: "search", checkpoint: {} }), { params: Promise.resolve({ batchId: "batch-1" }) });
    expect(missingLease.status).toBe(400);

    mocks.batchesFindUnique.mockResolvedValue(null);
    const wrongLease = await POST(request({
      workerId: "runner-1",
      leaseToken,
      stage: "search",
      checkpoint: {},
    }), { params: Promise.resolve({ batchId: "batch-1" }) });
    expect(wrongLease.status).toBe(409);
    expect(mocks.batchesUpdateMany).not.toHaveBeenCalled();
  });

  it("extends a valid lease and stores only bounded checkpoint data", async () => {
    const response = await POST(request({
      workerId: "runner-1",
      leaseToken,
      stage: "license_review",
      checkpoint: { candidateIndex: 2, completedRepositoryIds: ["123456", "789012"], searchedTopicIds: ["topic-1", "topic-2"] },
    }), { params: Promise.resolve({ batchId: "batch-1" }) });

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(mocks.batchesUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: "batch-1", status: "running", leaseOwnerId: "runner-1" }),
      data: expect.objectContaining({
        lastWorkerStage: "license_review",
        checkpoint: { candidateIndex: 2, completedRepositoryIds: ["123456", "789012"], searchedTopicIds: ["topic-1", "topic-2"] },
      }),
    }));
    expect(JSON.stringify(await response.json())).not.toContain(leaseToken);
  });

  it("pauses at the reported stage boundary when the administrator requests a pause", async () => {
    mocks.settingsUpsert.mockResolvedValue({ isPaused: true });

    const response = await POST(request({
      workerId: "runner-1",
      leaseToken,
      stage: "sandbox_test",
      checkpoint: { candidateIndex: 1, completedRepositoryIds: [] },
    }), { params: Promise.resolve({ batchId: "batch-1" }) });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, state: "paused" });
    expect(mocks.batchesUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: "paused",
        leaseTokenHash: null,
        leaseExpiresAt: null,
      }),
    }));
  });
});
