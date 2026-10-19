import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({ settingsUpsert: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { aiWorkflowCollectionSetting: { upsert: mocks.settingsUpsert } } }));

const token = "workflow-worker-token-1234567890";
function request(body: unknown, authorization = "Bearer " + token) {
  return new Request("https://www.enhe-tech.com.cn/api/internal/ai-workflows/worker/scheduler-status", {
    method: "POST", headers: { authorization, "content-type": "application/json" }, body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("AI_WORKFLOW_WORKER_TOKEN", token);
  mocks.settingsUpsert.mockResolvedValue({ id: "default" });
});
afterEach(() => vi.unstubAllEnvs());

describe("POST /api/internal/ai-workflows/worker/scheduler-status", () => {
  it("requires the configured worker credential and rejects inconsistent task state", async () => {
    expect((await POST(request({}, "Bearer wrong-worker-token-1234567890"))).status).toBe(401);
    expect((await POST(request({ workerId: "runner-1", registered: false, enabled: true }))).status).toBe(400);
    expect(mocks.settingsUpsert).not.toHaveBeenCalled();
  });

  it("records task registration and enablement separately from daily collection", async () => {
    const response = await POST(request({ workerId: "runner-1", registered: true, enabled: true }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, registered: true, enabled: true });
    expect(mocks.settingsUpsert).toHaveBeenCalledWith(expect.objectContaining({
      update: expect.objectContaining({ scheduledTaskRegisteredAt: expect.any(Date), scheduledTaskEnabledAt: expect.any(Date) }),
      create: expect.objectContaining({ isEnabled: false }),
    }));
  });
});
