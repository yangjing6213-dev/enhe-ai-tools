import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentLocale } from "@/lib/i18n";
import { ToolEditor } from "@/app/admin/tool-admin-list";
import { AdminContentShell } from "@/app/admin/admin-ui";
import { AiWorkflowReviewPreview } from "../review-preview";
import { publishAiWorkflowIntroductionAction } from "../actions";

export default async function AdminAiWorkflowEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [{ id }, notice, locale] = await Promise.all([params, searchParams, getCurrentLocale()]);
  const [tool, categories] = await Promise.all([
    id === "new" ? Promise.resolve(null) : prisma.tool.findFirst({
      where: { id, type: "ai_workflow" },
      include: {
        category: true,
        downloadFile: true,
        aiWorkflowCandidate: true,
        priceSpecs: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      },
    }),
    prisma.toolCategory.findMany({ where: { type: "ai_workflow" }, orderBy: { sortOrder: "asc" } }),
  ]);
  if (id !== "new" && !tool) notFound();
  const candidate = tool?.aiWorkflowCandidate;
  const english = locale === "en";
  return <>
  {tool && candidate ? <AdminContentShell>
    <h1 className="text-2xl font-semibold text-white">{english ? "Review introduction and cover" : "审核介绍与封面"}</h1>
    <p className="mt-3 text-sm leading-6 text-[#D7E0EB]">{english ? "New collection results stay as drafts. Review both languages, cover, source and limitations before publishing. Save any edits below, then review the refreshed preview." : "新采集内容先保存为草稿。请核对中英文介绍、封面、来源和使用限制；如需修改，请在下方保存后再审核更新后的预览。"}</p>
    <p className="mt-3 text-sm text-[#9CAABD]">{english ? "Source" : "来源"}: <a className="text-sky-300 underline" href={candidate.repositoryUrl} target="_blank" rel="noreferrer">{candidate.repositoryOwner}/{candidate.repositoryName}</a> · {english ? "License" : "许可证"}: {candidate.licenseSpdx || "—"}</p>
    <AiWorkflowReviewPreview tool={tool} repository={`${candidate.repositoryOwner}/${candidate.repositoryName}`} pendingReport={candidate.status === "pending_pricing" && tool.status === "published" ? candidate.validationReport : undefined} />
    {candidate.status === "reviewing" && tool.status === "draft" ? <form action={publishAiWorkflowIntroductionAction} className="mt-5 space-y-4">
      <input type="hidden" name="candidateId" value={candidate.id} />
      <input type="hidden" name="candidateUpdatedAt" value={candidate.updatedAt.toISOString()} />
      <input type="hidden" name="toolUpdatedAt" value={tool.updatedAt.toISOString()} />
      <label className="flex gap-2 text-sm leading-6 text-[#D7E0EB]"><input required type="checkbox" name="contentReviewed" />{english ? "I reviewed the Chinese and English introduction, cover, source and usage limitations." : "我已人工核对中英文介绍、封面、来源和使用限制。"}</label>
      <button className="rounded-lg bg-[#1769C2] px-4 py-2 text-sm font-semibold text-white">{english ? "Publish reviewed introduction" : "已审核，发布仓库介绍"}</button>
    </form> : candidate.status === "pending_pricing" ? <p className="mt-5 text-sm text-amber-200"><Link className="underline" href="/admin/ai-workflows#pricing">{english ? "Review the download package and price before publishing." : "此项目有下载包，请前往价格审核，确认内容和价格后发布。"}</Link></p> : null}
  </AdminContentShell> : null}
  <ToolEditor
    title={id === "new" ? (locale === "en" ? "New AI Workflow draft" : "新增 AI 工作流草稿") : (locale === "en" ? "Edit AI Workflow" : "编辑 AI 工作流")}
    type="ai_workflow"
    locale={locale}
    tool={tool ?? undefined}
    categories={categories}
    notice={notice}
  />
  </>;
}
