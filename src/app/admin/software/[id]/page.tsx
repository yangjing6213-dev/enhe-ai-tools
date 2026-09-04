import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentLocale } from "@/lib/i18n";
import { ToolEditor } from "../../tool-admin-list";

export default async function AdminSoftwareToolEditorPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [{ id }, notice, locale] = await Promise.all([params, searchParams, getCurrentLocale()]);
  const [tool, categories] = await Promise.all([
    id === "new" ? Promise.resolve(null) : prisma.tool.findFirst({ where: { id, type: "software" }, include: { category: true, downloadFile: true, priceSpecs: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } } }),
    prisma.toolCategory.findMany({ orderBy: { sortOrder: "asc" } })
  ]);

  if (id !== "new" && !tool) notFound();

  return (
    <ToolEditor
      title={id === "new"
        ? (locale === "en" ? "New AI software app" : "新增AI软件应用")
        : (locale === "en" ? "Edit AI software app" : "编辑AI软件应用")}
      type="software"
      locale={locale}
      tool={tool ?? undefined}
      categories={categories}
      notice={notice}
    />
  );
}
