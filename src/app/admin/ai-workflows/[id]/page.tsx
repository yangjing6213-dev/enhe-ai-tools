import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentLocale } from "@/lib/i18n";
import { ToolEditor } from "@/app/admin/tool-admin-list";

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
        priceSpecs: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      },
    }),
    prisma.toolCategory.findMany({ where: { type: "ai_workflow" }, orderBy: { sortOrder: "asc" } }),
  ]);
  if (id !== "new" && !tool) notFound();
  return <ToolEditor
    title={id === "new" ? (locale === "en" ? "New AI Workflow draft" : "新增 AI 工作流草稿") : (locale === "en" ? "Edit AI Workflow" : "编辑 AI 工作流")}
    type="ai_workflow"
    locale={locale}
    tool={tool ?? undefined}
    categories={categories}
    notice={notice}
  />;
}
