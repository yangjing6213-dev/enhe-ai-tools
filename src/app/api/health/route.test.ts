import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  $queryRaw: vi.fn(),
  seoAuditRun: {
    count: vi.fn(),
    findFirst: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({ prisma: db }));

import { GET } from "./route";

const releaseRef = "a".repeat(40);
const temporaryDirectories: string[] = [];

type Heartbeat = {
  status: string;
  releaseRef?: string;
  startedAt?: string;
  checkedAt?: string;
};

async function configureRuntimeHeartbeats(
  worker: Partial<Heartbeat> = {},
  scheduler: Partial<Heartbeat> = {},
) {
  const directory = await mkdtemp(join(tmpdir(), "enhe-health-"));
  temporaryDirectories.push(directory);
  const workerPath = join(directory, "worker.json");
  const schedulerPath = join(directory, "scheduler.json");
  const now = Date.now();
  const heartbeat = {
    status: "ok",
    releaseRef,
    startedAt: new Date(now - 60_000).toISOString(),
    checkedAt: new Date(now).toISOString(),
  };
  await Promise.all([
    writeFile(workerPath, JSON.stringify({ ...heartbeat, ...worker }), "utf8"),
    writeFile(
      schedulerPath,
      JSON.stringify({ ...heartbeat, ...scheduler }),
      "utf8",
    ),
  ]);
  vi.stubEnv("SEO_AUDIT_WORKER_HEARTBEAT_FILE", workerPath);
  vi.stubEnv("SEO_AUDIT_SCHEDULER_HEARTBEAT_FILE", schedulerPath);
}

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.$queryRaw.mockResolvedValue([{ ok: 1 }]);
    db.seoAuditRun.count.mockResolvedValue(0);
    db.seoAuditRun.findFirst.mockResolvedValue(null);
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("RELEASE_REF", releaseRef);
    vi.stubEnv(
      "AUDIT_WORKER_TOKEN_CURRENT",
      "worker-token-12345678901234567890",
    );
    vi.stubEnv(
      "SEO_AUDIT_ANONYMOUS_HMAC_SECRET",
      "hmac-secret-123456789012345678901234",
    );
    vi.stubEnv("SEO_AUDIT_WORKER_HEARTBEAT_FILE", "");
    vi.stubEnv("SEO_AUDIT_SCHEDULER_HEARTBEAT_FILE", "");
    vi.stubEnv("SEO_AUDIT_QUEUE_STALE_SECONDS", "");
    vi.stubEnv("SEO_AUDIT_WORKER_STALE_SECONDS", "");
    vi.stubEnv("SEO_AUDIT_SCHEDULER_STALE_SECONDS", "");
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await Promise.all(
      temporaryDirectories.splice(0).map((directory) =>
        rm(directory, { recursive: true, force: true }),
      ),
    );
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
        releaseConfiguration: "ok",
        workerConfiguration: "ok",
        workerRuntime: { status: "not_checked", ageSeconds: null },
        schedulerRuntime: { status: "not_checked", ageSeconds: null },
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

  it("accepts fresh worker and scheduler heartbeats for the current release", async () => {
    await configureRuntimeHeartbeats();

    const response = await GET(new Request("http://localhost/api/health"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      status: "ok",
      checks: {
        releaseConfiguration: "ok",
        workerRuntime: { status: "ok" },
        schedulerRuntime: { status: "ok" },
      },
    });
    expect(payload.checks.workerRuntime.ageSeconds).toBeLessThanOrEqual(1);
    expect(payload.checks.schedulerRuntime.ageSeconds).toBeLessThanOrEqual(1);
  });

  it("rejects a heartbeat from another release without exposing either ref", async () => {
    const otherReleaseRef = "b".repeat(40);
    await configureRuntimeHeartbeats({ releaseRef: otherReleaseRef });

    const response = await GET(new Request("http://localhost/api/health"));
    const payload = await response.json();
    const serialized = JSON.stringify(payload);

    expect(response.status).toBe(503);
    expect(payload.checks.workerRuntime).toMatchObject({
      status: "version_mismatch",
    });
    expect(serialized).not.toContain(releaseRef);
    expect(serialized).not.toContain(otherReleaseRef);
  });

  it("rejects a stale historical heartbeat", async () => {
    await configureRuntimeHeartbeats({
      startedAt: new Date(Date.now() - 11 * 60_000).toISOString(),
      checkedAt: new Date(Date.now() - 10 * 60_000).toISOString(),
    });

    const response = await GET(new Request("http://localhost/api/health"));
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.checks.workerRuntime).toMatchObject({ status: "stale" });
  });

  it("rejects a future heartbeat instead of treating it as fresh", async () => {
    await configureRuntimeHeartbeats({
      checkedAt: new Date(Date.now() + 60_000).toISOString(),
    });

    const response = await GET(new Request("http://localhost/api/health"));
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.checks.workerRuntime).toMatchObject({ status: "invalid" });
  });

  it("rejects a legacy heartbeat without a process start time", async () => {
    await configureRuntimeHeartbeats({ startedAt: undefined });

    const response = await GET(new Request("http://localhost/api/health"));
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.checks.workerRuntime).toMatchObject({ status: "invalid" });
  });

  it("fails the production app health check when RELEASE_REF is missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RELEASE_REF", "");

    const response = await GET(
      new Request("http://localhost/api/health?scope=app"),
    );
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.checks.releaseConfiguration).toBe("missing");
  });

  it("degrades when ready work is older than the configured threshold", async () => {
    vi.stubEnv("SEO_AUDIT_QUEUE_STALE_SECONDS", "300");
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
