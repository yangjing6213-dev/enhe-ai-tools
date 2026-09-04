import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentLocale } from "@/lib/i18n";
import { ToolEditor } from "../../tool-admin-list";

export default async function AdminOnlineToolEditorPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [{ id }, notice, locale] = await Promise.all([params, searchParams, getCurrentLocale()]);
  const [tool, categories] = await Promise.all([
    id === "new" ? Promise.resolve(null) : prisma.tool.findFirst({ where: { id, type: "online" }, include: { category: true, downloadFile: true, priceSpecs: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } } }),
    prisma.toolCategory.findMany({ orderBy: { sortOrder: "asc" } })
  ]);

  if (id !== "new" && !tool) notFound();

  return (
    <ToolEditor
      title={id === "new"
        ? (locale === "en" ? "New AI account service" : "新增AI账号服务")
        : (locale === "en" ? "Edit AI account service" : "编辑AI账号服务")}
      type="online"
      locale={locale}
      tool={tool ?? undefined}
      categories={categories}
      notice={notice}
    />
  );
}
