import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteToolChangelogAction, upsertToolChangelogAction } from "@/app/admin/actions";
import { AdminSection, DangerButton, Field, inputClass, selectClass, SubmitButton, textareaClass } from "@/app/admin/admin-ui";
import { prisma } from "@/lib/db";

type AdminChangelogDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function AdminChangelogDetailPage({ params, searchParams }: AdminChangelogDetailPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const isNew = id === "new";
  const [changelog, tools] = await Promise.all([
    isNew ? null : prisma.toolChangelog.findUnique({ where: { id }, include: { tool: true } }),
    prisma.tool.findMany({ orderBy: { name: "asc" } })
  ]);
  if (!isNew && !changelog) notFound();

  return (
    <AdminSection title={isNew ? "新增工具版本记录" : "编辑工具版本记录"} intro="维护单个工具详情页中的版本更新记录。">
      <div className="mb-6">
        <Link href="/admin/changelogs" className="rounded-full border border-white/15 px-4 py-2 text-sm transition hover:border-[#48F5D3]/50 hover:text-[#48F5D3]">
          返回版本清单
        </Link>
      </div>

      {query.saved ? (
        <p className="mb-5 rounded-xl border border-[#48F5D3]/30 bg-[#48F5D3]/10 px-4 py-3 text-sm text-[#48F5D3]">保存成功。</p>
      ) : null}

      <form action={upsertToolChangelogAction} className="glass grid gap-4 rounded-2xl p-6 md:grid-cols-2">
        {changelog ? <input type="hidden" name="id" value={changelog.id} /> : null}
        <Field label="工具">
          <select name="toolId" defaultValue={changelog?.toolId ?? ""} required className={selectClass}>
            <option value="">选择工具</option>
            {tools.map((tool) => <option key={tool.id} value={tool.id}>{tool.name}</option>)}
          </select>
        </Field>
        <Field label="版本"><input name="version" required defaultValue={changelog?.version ?? ""} className={inputClass} /></Field>
        <Field label="标题"><input name="title" required defaultValue={changelog?.title ?? ""} className={inputClass} /></Field>
        <Field label="发布日期"><input name="releaseDate" type="date" defaultValue={changelog?.releaseDate?.toISOString().slice(0, 10) ?? ""} className={inputClass} /></Field>
        <Field label="排序"><input name="sortOrder" type="number" defaultValue={changelog?.sortOrder ?? 0} className={inputClass} /></Field>
        <Field label="状态">
          <select name="status" defaultValue={changelog?.status ?? "active"} className={selectClass}>
            <option value="active">启用</option>
            <option value="disabled">禁用</option>
          </select>
        </Field>
        <Field label="更新内容" className="md:col-span-2"><textarea name="content" required defaultValue={changelog?.content ?? ""} className={textareaClass} /></Field>
        <div className="md:col-span-2"><SubmitButton>{changelog ? "保存版本记录" : "新增版本记录"}</SubmitButton></div>
      </form>

      {changelog ? (
        <form action={deleteToolChangelogAction} className="mt-4">
          <input type="hidden" name="id" value={changelog.id} />
          <DangerButton>删除版本记录</DangerButton>
        </form>
      ) : null}
    </AdminSection>
  );
}
