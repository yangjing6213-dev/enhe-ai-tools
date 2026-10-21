import { prisma } from "@/lib/db";
import { buildAiWorkflowCoverSvg } from "@/lib/ai-workflows/generated-cover";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^ai-workflow-[a-z0-9-]{1,160}$/.test(slug)) return new Response(null, { status: 404 });
  const repositoryId = slug.match(/^ai-workflow-(\d{1,32})-/)?.[1];
  const tool = await prisma.tool.findFirst({
    where: {
      type: "ai_workflow", status: "published",
      OR: [{ slug }, ...(repositoryId ? [{ aiWorkflowCandidate: { repositoryId } }] : [])],
    },
    select: { name: true, englishName: true, shortDescription: true, aiWorkflowCandidate: { select: { repositoryOwner: true, repositoryName: true } } },
  });
  if (!tool) return new Response(null, { status: 404 });
  const candidate = tool.aiWorkflowCandidate;
  return new Response(buildAiWorkflowCoverSvg({
    name: tool.englishName || tool.name,
    description: tool.shortDescription,
    repository: candidate ? `${candidate.repositoryOwner}/${candidate.repositoryName}` : "ENHE AI Workflows",
  }), { headers: {
    "Content-Type": "image/svg+xml; charset=utf-8",
    "Cache-Control": "public, max-age=300",
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    "X-Content-Type-Options": "nosniff",
  } });
}
