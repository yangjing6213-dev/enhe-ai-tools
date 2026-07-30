import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentLocale } from "@/lib/i18n";
import { ToolEditor } from "../../tool-admin-list";

export default async function AdminAiSkillEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [{ id }, notice, locale] = await Promise.all([params, searchParams, getCurrentLocale()]);
  const [tool, categories] = await Promise.all([
    id === "new"
      ? Promise.resolve(null)
      : prisma.tool.findFirst({
          where: { id, type: "ai_skill" },
          include: {
            category: true,
            downloadFile: true,
            priceSpecs: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
          },
        }),
    prisma.toolCategory.findMany({
      where: { type: "ai_skill" },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  if (id !== "new" && !tool) notFound();

  return (
    <ToolEditor
      title={
        id === "new"
          ? locale === "en" ? "New AI Skill" : "新增 AI Skill"
          : locale === "en" ? "Edit AI Skill" : "编辑 AI Skill"
      }
      type="ai_skill"
      locale={locale}
      tool={tool ?? undefined}
      categories={categories}
      notice={notice}
    />
  );
}
