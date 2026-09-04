 import { buildAdminToolPageHref, buildAdminToolWhere, parseAdminToolListParams } from "@/lib/admin-list";
 import { prisma } from "@/lib/db";
 import { getCurrentLocale } from "@/lib/i18n";
 import { ToolAdminList } from "../tool-admin-list";
 
 export default async function AdminSkillLearningPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
   const [params, locale] = await Promise.all([searchParams, getCurrentLocale()]);
   const filters = parseAdminToolListParams(params);
   const where = buildAdminToolWhere("skill_learning", filters);
   const [tools, total, categories] = await Promise.all([
     prisma.tool.findMany({
       where,
       include: { category: true, downloadFile: true, tutorials: { where: { status: "active" } }, priceSpecs: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } },
       orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
       skip: filters.skip,
       take: filters.take
     }),
     prisma.tool.count({ where }),
     prisma.toolCategory.findMany({ where: { type: "skill_learning" }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] })
   ]);
   const pageCount = Math.max(1, Math.ceil(total / filters.pageSize));
 
   return (
     <ToolAdminList
       title={locale === "en" ? "AI Skill Learning Management" : "AI\u6280\u80fd\u5b66\u4e60\u7ba1\u7406"}
       type="skill_learning"
       locale={locale}
       tools={tools}
       notice={params}
       categories={categories}
       filters={filters}
       total={total}
       pageCount={pageCount}
       buildPageHref={(page) => buildAdminToolPageHref("/admin/skill-learning", filters, page)}
     />
   );
 }
