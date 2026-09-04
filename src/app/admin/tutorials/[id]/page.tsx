import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteTutorialAction, upsertTutorialAction } from "@/app/admin/actions";
import { AdminSection, DangerButton, Field, inputClass, selectClass, SubmitButton, textareaClass } from "@/app/admin/admin-ui";
import { prisma } from "@/lib/db";

type AdminTutorialDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function AdminTutorialDetailPage({ params, searchParams }: AdminTutorialDetailPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const isNew = id === "new";
  const [tutorial, tools] = await Promise.all([
    isNew ? null : prisma.tutorial.findUnique({ where: { id }, include: { tool: true } }),
    prisma.tool.findMany({ orderBy: { name: "asc" } })
  ]);
  if (!isNew && !tutorial) notFound();

  return (
    <AdminSection title={isNew ? "新增教程" : "编辑教程"} intro="维护工具详情页中的独立教程、步骤说明、图片视频、注意事项和常见错误。">
      <div className="mb-6 flex flex-wrap gap-3">
        <Link href="/admin/tutorials" className="rounded-full border border-white/15 px-4 py-2 text-sm transition hover:border-[#48F5D3]/50 hover:text-[#48F5D3]">
          返回教程清单
        </Link>
      </div>

      {query.saved ? (
        <p className="mb-5 rounded-xl border border-[#48F5D3]/30 bg-[#48F5D3]/10 px-4 py-3 text-sm text-[#48F5D3]">保存成功。</p>
      ) : null}

      <form action={upsertTutorialAction} className="glass grid gap-4 rounded-2xl p-6 md:grid-cols-2">
        {tutorial ? <input type="hidden" name="id" value={tutorial.id} /> : null}
        <Field label="工具">
          <select name="toolId" defaultValue={tutorial?.toolId ?? ""} required className={selectClass}>
            <option value="">选择工具</option>
            {tools.map((tool) => <option key={tool.id} value={tool.id}>{tool.name}</option>)}
          </select>
        </Field>
        <Field label="教程标题"><input name="title" required defaultValue={tutorial?.title ?? ""} className={inputClass} /></Field>
        <Field label="图片地址"><input name="imageUrl" defaultValue={tutorial?.imageUrl ?? ""} className={inputClass} /></Field>
        <Field label="视频链接"><input name="videoUrl" defaultValue={tutorial?.videoUrl ?? ""} className={inputClass} /></Field>
        <Field label="排序"><input name="sortOrder" type="number" defaultValue={tutorial?.sortOrder ?? 0} className={inputClass} /></Field>
        <Field label="状态">
          <select name="status" defaultValue={tutorial?.status ?? "active"} className={selectClass}>
            <option value="active">启用</option>
            <option value="disabled">禁用</option>
          </select>
        </Field>
        <Field label="教程正文" className="md:col-span-2"><textarea name="content" required defaultValue={tutorial?.content ?? ""} className={textareaClass} /></Field>
        <Field label="注意事项" className="md:col-span-2"><textarea name="notes" defaultValue={tutorial?.notes ?? ""} className={textareaClass} /></Field>
        <Field label="常见错误" className="md:col-span-2"><textarea name="commonErrors" defaultValue={tutorial?.commonErrors ?? ""} className={textareaClass} /></Field>
        <div className="md:col-span-2"><SubmitButton>{tutorial ? "保存教程" : "新增教程"}</SubmitButton></div>
      </form>

      {tutorial ? (
        <form action={deleteTutorialAction} className="mt-4">
          <input type="hidden" name="id" value={tutorial.id} />
          <DangerButton>删除教程</DangerButton>
        </form>
      ) : null}
    </AdminSection>
  );
}
