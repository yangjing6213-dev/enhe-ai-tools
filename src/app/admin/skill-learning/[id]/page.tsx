 import { notFound } from "next/navigation";
 import { prisma } from "@/lib/db";
 import { getCurrentLocale } from "@/lib/i18n";
 import { ToolEditor } from "../../tool-admin-list";
 
 export default async function AdminSkillLearningEditorPage({
   params,
   searchParams
 }: {
   params: Promise<{ id: string }>;
   searchParams: Promise<Record<string, string | undefined>>;
 }) {
   const [{ id }, notice, locale] = await Promise.all([params, searchParams, getCurrentLocale()]);
   const [tool, categories] = await Promise.all([
     id === "new" ? Promise.resolve(null) : prisma.tool.findFirst({ where: { id, type: "skill_learning" }, include: { category: true, downloadFile: true, priceSpecs: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } } }),
     prisma.toolCategory.findMany({ orderBy: { sortOrder: "asc" } })
   ]);
 
   if (id !== "new" && !tool) notFound();
 
   return (
     <ToolEditor
       title={id === "new"
         ? (locale === "en" ? "New AI Skill Learning Course" : "\u65b0\u589eAI\u6280\u80fd\u5b66\u4e60\u8bfe\u7a0b")
         : (locale === "en" ? "Edit AI Skill Learning Course" : "\u7f16\u8f91AI\u6280\u80fd\u5b66\u4e60\u8bfe\u7a0b")}
       type="skill_learning"
       locale={locale}
       tool={tool ?? undefined}
       categories={categories}
       notice={notice}
     />
   );
 }
