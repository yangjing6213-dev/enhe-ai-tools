import { cleanupExpiredChatMedia } from "@/lib/group-chat/media-cleanup";
import { handleWorkerRouteError, verifyWorkerAuthorization, workerJsonResponse, workerUnauthorizedResponse } from "@/lib/seo-audit/worker-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!verifyWorkerAuthorization(request.headers.get("authorization"), process.env)) return workerUnauthorizedResponse();
  try {
    const result = await cleanupExpiredChatMedia();
    return workerJsonResponse({ ok: true, ...result });
  } catch (error) {
    return handleWorkerRouteError(error);
  }
}
