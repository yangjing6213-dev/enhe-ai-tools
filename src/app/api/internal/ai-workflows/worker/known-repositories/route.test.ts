import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const findMany = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db", () => ({ prisma: { aiWorkflowCandidate: { findMany } } }));

const token = "workflow-worker-token-1234567890";
const request = (body: unknown, auth = `Bearer ${token}`) => new Request(
  "https://www.enhe-tech.com.cn/api/internal/ai-workflows/worker/known-repositories",
  { method: "POST", headers: { authorization: auth, "content-type": "application/json" }, body: JSON.stringify(body) },
);

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("AI_WORKFLOW_WORKER_TOKEN", token);
  findMany.mockResolvedValue([{ repositoryId: "20" }]);
});

afterEach(() => vi.unstubAllEnvs());

describe("POST /api/internal/ai-workflows/worker/known-repositories", () => {
  it("returns the intersection with repository IDs already registered by the site", async () => {
    const response = await POST(request({ repositoryIds: ["10", "20"] }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, knownRepositoryIds: ["20"] });
    expect(findMany).toHaveBeenCalledWith({
      where: {
        repositoryId: { in: ["10", "20"] },
        OR: [
          { status: { not: "published" } },
          { fileId: { not: null } },
          { updatedAt: { lte: expect.any(Date) } },
        ],
      },
      select: { repositoryId: true },
    });
  });

  it("requires the worker credential and rejects oversized or malformed IDs", async () => {
    expect((await POST(request({ repositoryIds: ["20"] }, "Bearer wrong-worker-token"))).status).toBe(401);
    expect((await POST(request({ repositoryIds: ["../20"] }))).status).toBe(400);
    expect(findMany).not.toHaveBeenCalled();
  });
});
