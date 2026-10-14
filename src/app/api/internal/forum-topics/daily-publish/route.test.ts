import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const publishDueDailyAiTipForumTopic = vi.hoisted(() => vi.fn());

vi.mock("@/lib/forum-daily-topic", () => ({
  publishDueDailyAiTipForumTopic,
}));

import { POST, runtime } from "./route";

const workerToken = "current-worker-token-1234567890";
const previousToken = process.env.AUDIT_WORKER_TOKEN_CURRENT;

function request(body: unknown, authorization = `Bearer ${workerToken}`) {
  return new Request("http://localhost/api/internal/forum-topics/daily-publish", {
    method: "POST",
    headers: { authorization, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.AUDIT_WORKER_TOKEN_CURRENT = workerToken;
});

afterEach(() => {
  if (previousToken === undefined) delete process.env.AUDIT_WORKER_TOKEN_CURRENT;
  else process.env.AUDIT_WORKER_TOKEN_CURRENT = previousToken;
});

describe("POST /api/internal/forum-topics/daily-publish", () => {
  it("requires the internal worker token and a strict date payload", async () => {
    expect(runtime).toBe("nodejs");
    expect((await POST(request({ localDate: "2026-10-14" }, "Bearer wrong"))).status).toBe(401);
    expect((await POST(request({ localDate: "2026-10-14", adminId: "admin-1" }))).status).toBe(400);
    expect(publishDueDailyAiTipForumTopic).not.toHaveBeenCalled();
  });

  it("runs the due topic publisher for the scheduler's local date", async () => {
    publishDueDailyAiTipForumTopic.mockResolvedValueOnce({ status: "published", postId: "post-1" });
    const response = await POST(request({ localDate: "2026-10-14" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, status: "published", postId: "post-1" });
    expect(publishDueDailyAiTipForumTopic).toHaveBeenCalledWith("2026-10-14");
  });
});
