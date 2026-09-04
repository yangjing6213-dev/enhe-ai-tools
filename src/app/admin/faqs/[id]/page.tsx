import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteToolFaqAction, upsertToolFaqAction } from "@/app/admin/actions";
import { AdminSection, DangerButton, Field, inputClass, selectClass, SubmitButton, textareaClass } from "@/app/admin/admin-ui";
import { prisma } from "@/lib/db";

type AdminFaqDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function AdminFaqDetailPage({ params, searchParams }: AdminFaqDetailPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const isNew = id === "new";
  const [faq, tools] = await Promise.all([
    isNew ? null : prisma.toolFaq.findUnique({ where: { id }, include: { tool: true } }),
    prisma.tool.findMany({ orderBy: { name: "asc" } })
  ]);
  if (!isNew && !faq) notFound();

  return (
    <AdminSection title={isNew ? "新增 FAQ" : "编辑 FAQ"} intro="维护工具详情页的常见问题。">
      <div className="mb-6">
        <Link href="/admin/faqs" className="rounded-full border border-white/15 px-4 py-2 text-sm transition hover:border-[#48F5D3]/50 hover:text-[#48F5D3]">
          返回 FAQ 清单
        </Link>
      </div>

      {query.saved ? (
        <p className="mb-5 rounded-xl border border-[#48F5D3]/30 bg-[#48F5D3]/10 px-4 py-3 text-sm text-[#48F5D3]">保存成功。</p>
      ) : null}

      <form action={upsertToolFaqAction} className="glass grid gap-4 rounded-2xl p-6 md:grid-cols-2">
        {faq ? <input type="hidden" name="id" value={faq.id} /> : null}
        <Field label="工具">
          <select name="toolId" defaultValue={faq?.toolId ?? ""} required className={selectClass}>
            <option value="">选择工具</option>
            {tools.map((tool) => <option key={tool.id} value={tool.id}>{tool.name}</option>)}
          </select>
        </Field>
        <Field label="排序"><input name="sortOrder" type="number" defaultValue={faq?.sortOrder ?? 0} className={inputClass} /></Field>
        <Field label="状态">
          <select name="status" defaultValue={faq?.status ?? "active"} className={selectClass}>
            <option value="active">启用</option>
            <option value="disabled">禁用</option>
          </select>
        </Field>
        <Field label="问题" className="md:col-span-2"><input name="question" required defaultValue={faq?.question ?? ""} className={inputClass} /></Field>
        <Field label="答案" className="md:col-span-2"><textarea name="answer" required defaultValue={faq?.answer ?? ""} className={textareaClass} /></Field>
        <div className="md:col-span-2"><SubmitButton>{faq ? "保存 FAQ" : "新增 FAQ"}</SubmitButton></div>
      </form>

      {faq ? (
        <form action={deleteToolFaqAction} className="mt-4">
          <input type="hidden" name="id" value={faq.id} />
          <DangerButton>删除 FAQ</DangerButton>
        </form>
      ) : null}
    </AdminSection>
  );
}
