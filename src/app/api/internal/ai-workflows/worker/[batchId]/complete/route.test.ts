import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hashAiWorkflowLeaseToken } from "@/lib/ai-workflows/worker";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({
  batchesFindUnique: vi.fn(),
  candidatesCount: vi.fn(),
  batchesUpdateMany: vi.fn(),
  settingsUpsert: vi.fn(),
  settingsUpdateMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    aiWorkflowBatch: {
      findUnique: mocks.batchesFindUnique,
      updateMany: mocks.batchesUpdateMany,
    },
    aiWorkflowCandidate: { count: mocks.candidatesCount },
    aiWorkflowCollectionSetting: { upsert: mocks.settingsUpsert, updateMany: mocks.settingsUpdateMany },
  },
}));

const workerToken = "workflow-worker-token-1234567890";
const leaseToken = "batch-lease-token-1234567890";

function request(body: unknown) {
  return new Request("https://www.enhe-tech.com.cn/api/internal/ai-workflows/worker/batch-1/complete", {
    method: "POST",
    headers: { authorization: "Bearer " + workerToken, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const context = { params: Promise.resolve({ batchId: "batch-1" }) };

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("AI_WORKFLOW_WORKER_TOKEN", workerToken);
  mocks.batchesFindUnique.mockResolvedValue({
    status: "running",
    triggerType: "scheduled",
    leaseOwnerId: "runner-1",
    leaseTokenHash: hashAiWorkflowLeaseToken(leaseToken),
    leaseExpiresAt: new Date(Date.now() + 60_000),
  });
  mocks.candidatesCount.mockResolvedValue(3);
  mocks.batchesUpdateMany.mockResolvedValue({ count: 1 });
  mocks.settingsUpsert.mockResolvedValue({ id: "default" });
  mocks.settingsUpdateMany.mockResolvedValue({ count: 1 });
});

afterEach(() => vi.unstubAllEnvs());

describe("POST /api/internal/ai-workflows/worker/[batchId]/complete", () => {
  it("does not mark an undersized batch complete", async () => {
    mocks.candidatesCount.mockResolvedValue(2);

    const response = await POST(request({
      workerId: "runner-1",
      leaseToken,
      state: "completed",
    }), context);

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ ok: false, code: "THREE_VALID_CANDIDATES_REQUIRED" });
    expect(mocks.batchesUpdateMany).not.toHaveBeenCalled();
  });

  it("finishes only a valid leased batch and records unattended success", async () => {
    const response = await POST(request({
      workerId: "runner-1",
      leaseToken,
      state: "completed",
    }), context);

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(await response.json()).toMatchObject({ ok: true, state: "completed", readyCandidateCount: 3 });
    expect(mocks.batchesUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: "batch-1", status: "running", leaseOwnerId: "runner-1" }),
      data: expect.objectContaining({
        status: "completed",
        leaseOwnerId: null,
        leaseTokenHash: null,
        leaseExpiresAt: null,
      }),
    }));
    expect(mocks.settingsUpsert).toHaveBeenCalledWith(expect.objectContaining({
      update: expect.objectContaining({ lastSuccessfulRunAt: expect.any(Date) }),
    }));
    expect(mocks.settingsUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "default", firstUnattendedSuccessAt: null, scheduledTaskEnabledAt: { not: null } },
      data: { firstUnattendedSuccessAt: expect.any(Date) },
    }));
  });

  it("records a bounded partial or failed result without accepting arbitrary failure text", async () => {
    mocks.candidatesCount.mockResolvedValue(1);
    const response = await POST(request({
      workerId: "runner-1",
      leaseToken,
      state: "partial",
      failureCode: "GITHUB_RATE_LIMIT",
    }), context);

    expect(response.status).toBe(200);
    expect(mocks.batchesUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "partial", failureReason: "GITHUB_RATE_LIMIT" }),
    }));
  });
});
