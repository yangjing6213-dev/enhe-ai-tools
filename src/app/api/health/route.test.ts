import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  $queryRaw: vi.fn(),
  seoAuditRun: {
    count: vi.fn(),
    findFirst: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({ prisma: db }));

import { GET } from "./route";

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.$queryRaw.mockResolvedValue([{ ok: 1 }]);
    db.seoAuditRun.count.mockResolvedValue(0);
    db.seoAuditRun.findFirst.mockResolvedValue(null);
    process.env.AUDIT_WORKER_TOKEN_CURRENT = "worker-token-12345678901234567890";
    process.env.SEO_AUDIT_ANONYMOUS_HMAC_SECRET = "hmac-secret-123456789012345678901234";
    process.env.SEO_AUDIT_WORKER_HEARTBEAT_FILE = "";
    process.env.SEO_AUDIT_SCHEDULER_HEARTBEAT_FILE = "";
  });

  it("reports app, database, worker configuration, and queue staleness without secrets", async () => {
    const response = await GET(
      new Request("http://localhost/api/health?scope=app"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      app: "enhe-ai-tools",
      status: "ok",
      checks: {
        app: "ok",
        database: "ok",
        workerConfiguration: "ok",
        queue: {
          status: "ok",
          readyCount: 0,
          oldestReadyAgeSeconds: null,
        },
      },
    });
    expect(JSON.stringify(payload)).not.toContain(
      process.env.AUDIT_WORKER_TOKEN_CURRENT,
    );
    expect(JSON.stringify(payload)).not.toContain(
      process.env.SEO_AUDIT_ANONYMOUS_HMAC_SECRET,
    );
  });

  it("degrades when ready work is older than the configured threshold", async () => {
    process.env.SEO_AUDIT_QUEUE_STALE_SECONDS = "300";
    db.seoAuditRun.count.mockResolvedValue(2);
    db.seoAuditRun.findFirst.mockResolvedValue({
      availableAt: new Date(Date.now() - 10 * 60 * 1000),
    });

    const response = await GET(new Request("http://localhost/api/health"));
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.checks.queue).toMatchObject({
      status: "stale",
      readyCount: 2,
    });
    expect(payload.checks.queue.oldestReadyAgeSeconds).toBeGreaterThanOrEqual(599);
  });
});
