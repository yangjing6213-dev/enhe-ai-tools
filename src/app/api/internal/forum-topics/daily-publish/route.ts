import { z } from "zod";
import { publishDueDailyAiTipForumTopic } from "@/lib/forum-daily-topic";
import {
  handleWorkerRouteError,
  readBoundedJsonBody,
  verifyWorkerAuthorization,
  workerJsonResponse,
  workerUnauthorizedResponse,
} from "@/lib/seo-audit/worker-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const scheduleSchema = z.object({
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
}).strict();

export async function POST(request: Request) {
  if (
    !verifyWorkerAuthorization(
      request.headers.get("authorization"),
      process.env,
    )
  ) {
    return workerUnauthorizedResponse();
  }

  try {
    const parsed = scheduleSchema.safeParse(
      await readBoundedJsonBody(request, 1_024),
    );
    if (!parsed.success) {
      return workerJsonResponse({ ok: false, code: "INVALID_REQUEST" }, 400);
    }
    const result = await publishDueDailyAiTipForumTopic(parsed.data.localDate);
    return workerJsonResponse({ ok: true, ...result });
  } catch (error) {
    return handleWorkerRouteError(error);
  }
}
