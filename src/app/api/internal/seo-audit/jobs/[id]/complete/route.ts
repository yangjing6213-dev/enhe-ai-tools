import { z } from "zod";
import { SEO_AUDIT_REPORT_LIMITS } from "@/lib/seo-audit/artifacts";
import { completeSeoAuditJob } from "@/lib/seo-audit/jobs";
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
const completeSchema = z
  .object({
    leaseToken: z.string().min(24).max(512).regex(/^\S+$/),
    reportGzipBase64: z
      .string()
      .min(4)
      .max(SEO_AUDIT_REPORT_LIMITS.maxBase64Chars),
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
    const body = completeSchema.safeParse(
      await readBoundedJsonBody(
        request,
        SEO_AUDIT_REPORT_LIMITS.maxBase64Chars + 4096,
      ),
    );
    if (!runId.success || !body.success) {
      return workerJsonResponse({ ok: false, code: "INVALID_REQUEST" }, 400);
    }

    const result = await completeSeoAuditJob({
      runId: runId.data,
      ...body.data,
    });
    return workerJsonResponse({ ok: true, ...result });
  } catch (error) {
    return handleWorkerRouteError(error);
  }
}
