import { z } from "zod";
import { enqueueDueSeoAuditSchedules } from "@/lib/seo-audit/entitlements";
import {
  handleWorkerRouteError,
  readBoundedJsonBody,
  verifyWorkerAuthorization,
  workerJsonResponse,
  workerUnauthorizedResponse,
} from "@/lib/seo-audit/worker-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const enqueueSchema = z
  .object({ limit: z.number().int().min(1).max(50).optional() })
  .strict();

export async function POST(request: Request) {
  if (
    !verifyWorkerAuthorization(request.headers.get("authorization"), process.env)
  ) {
    return workerUnauthorizedResponse();
  }

  try {
    const parsed = enqueueSchema.safeParse(
      await readBoundedJsonBody(request, 8 * 1024),
    );
    if (!parsed.success) {
      return workerJsonResponse({ ok: false, code: "INVALID_REQUEST" }, 400);
    }

    const result = await enqueueDueSeoAuditSchedules(parsed.data);
    return workerJsonResponse({ ok: true, ...result });
  } catch (error) {
    return handleWorkerRouteError(error);
  }
}
