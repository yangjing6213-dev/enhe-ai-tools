import { buildAdminToolPageHref, buildAdminToolWhere, parseAdminToolListParams } from "@/lib/admin-list";
import { prisma } from "@/lib/db";
import { getCurrentLocale } from "@/lib/i18n";
import { ToolAdminList } from "../tool-admin-list";

export default async function AdminOnlineToolsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const [params, locale] = await Promise.all([searchParams, getCurrentLocale()]);
  const filters = parseAdminToolListParams(params);
  const where = buildAdminToolWhere("online", filters);
  const [tools, total, categories] = await Promise.all([
    prisma.tool.findMany({
      where,
      include: { category: true, downloadFile: true, tutorials: { where: { status: "active" } }, priceSpecs: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      skip: filters.skip,
      take: filters.take
    }),
    prisma.tool.count({ where }),
    prisma.toolCategory.findMany({ where: { type: "online" }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] })
  ]);
  const pageCount = Math.max(1, Math.ceil(total / filters.pageSize));

  return (
    <ToolAdminList
      title={locale === "en" ? "AI account service management" : "AI账号服务管理"}
      type="online"
      locale={locale}
      tools={tools}
      notice={params}
      categories={categories}
      filters={filters}
      total={total}
      pageCount={pageCount}
      buildPageHref={(page) => buildAdminToolPageHref("/admin/online-tools", filters, page)}
    />
  );
}
