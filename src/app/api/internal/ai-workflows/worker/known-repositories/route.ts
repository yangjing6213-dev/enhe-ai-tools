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

const requestSchema = z.object({
  repositoryIds: z.array(z.string().regex(/^\d{1,32}$/)).min(1).max(100),
}).strict().superRefine((value, context) => {
  if (new Set(value.repositoryIds).size !== value.repositoryIds.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["repositoryIds"], message: "Repository IDs must be unique." });
  }
});

export async function POST(request: Request) {
  const workerToken = process.env.AI_WORKFLOW_WORKER_TOKEN?.trim();
  if (!workerToken) return workerJsonResponse({ ok: false, code: "WORKER_NOT_CONFIGURED" }, 503);
  if (!verifyWorkerAuthorization(request.headers.get("authorization"), {
    AUDIT_WORKER_TOKEN_CURRENT: workerToken,
  })) return workerUnauthorizedResponse();

  let input: z.infer<typeof requestSchema>;
  try {
    input = requestSchema.parse(await readBoundedJsonBody(request, 8 * 1024));
  } catch {
    return workerJsonResponse({ ok: false, code: "INVALID_REQUEST" }, 400);
  }

  const recheckBefore = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const registered = await prisma.aiWorkflowCandidate.findMany({
    where: {
      repositoryId: { in: input.repositoryIds },
      OR: [
        { status: { not: "published" } },
        { fileId: { not: null } },
        { updatedAt: { lte: recheckBefore } },
      ],
    },
    select: { repositoryId: true },
  });
  return workerJsonResponse({
    ok: true,
    knownRepositoryIds: registered.map(({ repositoryId }) => repositoryId),
  });
}
