import { z } from "zod";
import { SEO_AUDIT_ENGINE_VERSION } from "@/lib/seo-audit/artifacts";
import { heartbeatSeoAuditJob } from "@/lib/seo-audit/jobs";
import {
  handleWorkerRouteError,
  readBoundedJsonBody,
  verifyWorkerAuthorization,
  workerJsonResponse,
  workerUnauthorizedResponse,
} from "@/lib/seo-audit/worker-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const runIdSchema = z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/);
const heartbeatSchema = z
  .object({
    leaseToken: z.string().min(24).max(512).regex(/^\S+$/),
    workerId: z.string().min(1).max(80).regex(/^[A-Za-z0-9._:-]+$/),
    engineVersion: z.literal(SEO_AUDIT_ENGINE_VERSION),
    progress: z
      .object({
        phase: z.enum(["prepare", "crawl", "report", "upload", "cancel"]),
        pagesProcessed: z.number().int().min(0).max(5000),
        pageLimit: z.number().int().min(1).max(5000),
      })
      .strict(),
  })
  .strict();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (
    !verifyWorkerAuthorization(request.headers.get("authorization"), process.env)
  ) {
    return workerUnauthorizedResponse();
  }

  try {
    const runId = runIdSchema.safeParse((await params).id);
    const body = heartbeatSchema.safeParse(
      await readBoundedJsonBody(request, 32 * 1024),
    );
    if (!runId.success || !body.success) {
      return workerJsonResponse({ ok: false, code: "INVALID_REQUEST" }, 400);
    }

    const result = await heartbeatSeoAuditJob({
      runId: runId.data,
      ...body.data,
    });
    return workerJsonResponse({ ok: true, ...result });
  } catch (error) {
    return handleWorkerRouteError(error);
  }
}
