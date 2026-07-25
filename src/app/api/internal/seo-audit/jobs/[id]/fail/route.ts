import { z } from "zod";
import {
  failSeoAuditJob,
  SEO_AUDIT_FAILURE_CODES,
} from "@/lib/seo-audit/jobs";
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
const failSchema = z
  .object({
    leaseToken: z.string().min(24).max(512).regex(/^\S+$/),
    failureCode: z.enum(SEO_AUDIT_FAILURE_CODES),
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
    const body = failSchema.safeParse(
      await readBoundedJsonBody(request, 16 * 1024),
    );
    if (!runId.success || !body.success) {
      return workerJsonResponse({ ok: false, code: "INVALID_REQUEST" }, 400);
    }

    const result = await failSeoAuditJob({
      runId: runId.data,
      ...body.data,
    });
    return workerJsonResponse({ ok: true, ...result });
  } catch (error) {
    return handleWorkerRouteError(error);
  }
}
