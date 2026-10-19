import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  readBoundedJsonBody,
  verifyWorkerAuthorization,
  workerJsonResponse,
  workerUnauthorizedResponse,
} from "@/lib/seo-audit/worker-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schedulerStatusSchema = z.object({
  workerId: z.string().min(1).max(80).regex(/^[A-Za-z0-9._:-]+$/),
  registered: z.boolean(),
  enabled: z.boolean(),
}).strict().superRefine((value, context) => {
  if (value.enabled && !value.registered) context.addIssue({ code: z.ZodIssueCode.custom, path: ["registered"], message: "An enabled task must be registered." });
});

export async function POST(request: Request) {
  const workerToken = process.env.AI_WORKFLOW_WORKER_TOKEN?.trim();
  if (!workerToken) return workerJsonResponse({ ok: false, code: "WORKER_NOT_CONFIGURED" }, 503);
  if (!verifyWorkerAuthorization(request.headers.get("authorization"), {
    AUDIT_WORKER_TOKEN_CURRENT: workerToken,
  })) return workerUnauthorizedResponse();

  let input: z.infer<typeof schedulerStatusSchema>;
  try {
    input = schedulerStatusSchema.parse(await readBoundedJsonBody(request, 2 * 1024));
  } catch {
    return workerJsonResponse({ ok: false, code: "INVALID_REQUEST" }, 400);
  }

  const now = new Date();
  await prisma.aiWorkflowCollectionSetting.upsert({
    where: { id: "default" },
    update: {
      scheduledTaskRegisteredAt: input.registered ? now : null,
      scheduledTaskEnabledAt: input.enabled ? now : null,
      ...(input.enabled ? {} : { isEnabled: false }),
    },
    create: {
      id: "default",
      isEnabled: false,
      scheduledTaskRegisteredAt: input.registered ? now : null,
      scheduledTaskEnabledAt: input.enabled ? now : null,
    },
  });

  return workerJsonResponse({ ok: true, registered: input.registered, enabled: input.enabled });
}
