import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RuntimeHeartbeat = {
  status?: unknown;
  checkedAt?: unknown;
};

function positiveSeconds(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function workerConfigurationStatus() {
  const token = process.env.AUDIT_WORKER_TOKEN_CURRENT?.trim() ?? "";
  const hmac = process.env.SEO_AUDIT_ANONYMOUS_HMAC_SECRET?.trim() ?? "";
  return token.length >= 24 && token.length <= 512 && !/\s/.test(token) && hmac.length >= 32
    ? "ok"
    : "error";
}

async function readRuntimeHeartbeat(
  path: string | undefined,
  staleAfterSeconds: number,
) {
  if (!path?.trim()) {
    return { status: "not_configured", ageSeconds: null } as const;
  }
  try {
    const parsed = JSON.parse(await readFile(path, "utf8")) as RuntimeHeartbeat;
    const checkedAt =
      typeof parsed.checkedAt === "string" ? new Date(parsed.checkedAt) : null;
    const ageSeconds = checkedAt && Number.isFinite(checkedAt.getTime())
      ? Math.max(0, Math.floor((Date.now() - checkedAt.getTime()) / 1000))
      : null;
    if (parsed.status === "blocked") {
      return { status: "blocked", ageSeconds } as const;
    }
    return {
      status:
        ageSeconds !== null && ageSeconds <= staleAfterSeconds ? "ok" : "stale",
      ageSeconds,
    } as const;
  } catch {
    return { status: "missing", ageSeconds: null } as const;
  }
}

export async function GET(request: Request) {
  const checkedAt = new Date();
  const scope = new URL(request.url).searchParams.get("scope");
  const queueStaleSeconds = positiveSeconds(
    process.env.SEO_AUDIT_QUEUE_STALE_SECONDS,
    300,
  );
  const workerStaleSeconds = positiveSeconds(
    process.env.SEO_AUDIT_WORKER_STALE_SECONDS,
    120,
  );
  const schedulerStaleSeconds = positiveSeconds(
    process.env.SEO_AUDIT_SCHEDULER_STALE_SECONDS,
    180,
  );
  const workerConfiguration = workerConfigurationStatus();

  let database: "ok" | "error" = "ok";
  let readyCount = 0;
  let oldestReadyAgeSeconds: number | null = null;
  try {
    await prisma.$queryRaw`SELECT 1`;
    const [count, oldest] = await Promise.all([
      prisma.seoAuditRun.count({
        where: { status: "queued", availableAt: { lte: checkedAt } },
      }),
      prisma.seoAuditRun.findFirst({
        where: { status: "queued", availableAt: { lte: checkedAt } },
        orderBy: [{ availableAt: "asc" }, { createdAt: "asc" }],
        select: { availableAt: true },
      }),
    ]);
    readyCount = count;
    oldestReadyAgeSeconds = oldest
      ? Math.max(
          0,
          Math.floor((checkedAt.getTime() - oldest.availableAt.getTime()) / 1000),
        )
      : null;
  } catch {
    database = "error";
  }

  const queueStatus = database === "error"
    ? "unknown"
    : oldestReadyAgeSeconds !== null && oldestReadyAgeSeconds > queueStaleSeconds
      ? "stale"
      : "ok";
  const [workerRuntime, schedulerRuntime] = scope === "app"
    ? [
        { status: "not_checked", ageSeconds: null } as const,
        { status: "not_checked", ageSeconds: null } as const,
      ]
    : await Promise.all([
        readRuntimeHeartbeat(
          process.env.SEO_AUDIT_WORKER_HEARTBEAT_FILE,
          workerStaleSeconds,
        ),
        readRuntimeHeartbeat(
          process.env.SEO_AUDIT_SCHEDULER_HEARTBEAT_FILE,
          schedulerStaleSeconds,
        ),
      ]);

  const appHealthy = database === "ok" && workerConfiguration === "ok";
  const runtimeHealthy =
    queueStatus === "ok" &&
    workerRuntime.status === "ok" &&
    schedulerRuntime.status === "ok";
  const status = appHealthy && (scope === "app" || runtimeHealthy)
    ? "ok"
    : "degraded";
  const payload = {
    app: "enhe-ai-tools",
    status,
    checks: {
      app: appHealthy ? "ok" : "degraded",
      database,
      workerConfiguration,
      workerRuntime,
      schedulerRuntime,
      queue: {
        status: queueStatus,
        readyCount,
        oldestReadyAgeSeconds,
        staleAfterSeconds: queueStaleSeconds,
      },
    },
    checkedAt: checkedAt.toISOString(),
  };

  return NextResponse.json(payload, {
    status: status === "ok" ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
