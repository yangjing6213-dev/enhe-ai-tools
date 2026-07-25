import { z } from "zod";
import { claimSeoAuditJob } from "@/lib/seo-audit/jobs";
import {
  handleWorkerRouteError,
  readBoundedJsonBody,
  verifyWorkerAuthorization,
  workerJsonResponse,
  workerUnauthorizedResponse,
} from "@/lib/seo-audit/worker-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const claimSchema = z
  .object({
    workerId: z.string().min(1).max(80).regex(/^[A-Za-z0-9._:-]+$/),
    engineVersion: z.string().min(1).max(64).regex(/^[A-Za-z0-9._+-]+$/),
  })
  .strict();

export async function POST(request: Request) {
  if (
    !verifyWorkerAuthorization(request.headers.get("authorization"), process.env)
  ) {
    return workerUnauthorizedResponse();
  }

  try {
    const parsed = claimSchema.safeParse(
      await readBoundedJsonBody(request, 16 * 1024),
    );
    if (!parsed.success) {
      return workerJsonResponse({ ok: false, code: "INVALID_REQUEST" }, 400);
    }

    const job = await claimSeoAuditJob(parsed.data);
    return workerJsonResponse({ ok: true, job });
  } catch (error) {
    return handleWorkerRouteError(error);
  }
}
