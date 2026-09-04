import { updateToolTagsAction, upsertToolTagAction } from "@/app/admin/actions";
import { AdminSection, Field, inputClass, selectClass, SubmitButton, textareaClass } from "@/app/admin/admin-ui";
import { prisma } from "@/lib/db";

export default async function AdminTagsPage() {
  const [tags, tools] = await Promise.all([
    prisma.toolTag.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] }),
    prisma.tool.findMany({ include: { tagLinks: { include: { tag: true } } }, orderBy: { name: "asc" } })
  ]);

  return (
    <AdminSection title="标签管理" intro="管理工具标签，并为每个工具维护标签列表。">
      <form action={upsertToolTagAction} className="glass mb-8 grid gap-4 rounded-2xl p-6 md:grid-cols-3">
        <Field label="标签名"><input name="name" required className={inputClass} /></Field>
        <Field label="Slug"><input name="slug" placeholder="留空自动生成" className={inputClass} /></Field>
        <Field label="颜色"><input name="color" placeholder="#48F5D3" className={inputClass} /></Field>
        <Field label="排序"><input name="sortOrder" type="number" defaultValue={0} className={inputClass} /></Field>
        <Field label="状态">
          <select name="status" className={selectClass}>
            <option value="active">启用</option>
            <option value="disabled">禁用</option>
          </select>
        </Field>
        <Field label="描述" className="md:col-span-3"><textarea name="description" className={textareaClass} /></Field>
        <div className="md:col-span-3"><SubmitButton>新增标签</SubmitButton></div>
      </form>

      <div className="grid gap-4 md:grid-cols-2">
        {tags.map((tag) => (
          <form key={tag.id} action={upsertToolTagAction} className="glass grid gap-3 rounded-2xl p-5">
            <input type="hidden" name="id" value={tag.id} />
            <Field label="标签名"><input name="name" defaultValue={tag.name} className={inputClass} /></Field>
            <Field label="Slug"><input name="slug" defaultValue={tag.slug} className={inputClass} /></Field>
            <Field label="颜色"><input name="color" defaultValue={tag.color ?? ""} className={inputClass} /></Field>
            <Field label="排序"><input name="sortOrder" type="number" defaultValue={tag.sortOrder} className={inputClass} /></Field>
            <Field label="状态">
              <select name="status" defaultValue={tag.status} className={selectClass}>
                <option value="active">启用</option>
                <option value="disabled">禁用</option>
              </select>
            </Field>
            <Field label="描述"><textarea name="description" defaultValue={tag.description ?? ""} className={textareaClass} /></Field>
            <SubmitButton>保存标签</SubmitButton>
          </form>
        ))}
      </div>

      <div className="mt-10 space-y-4">
        <h2 className="text-2xl font-semibold">工具标签绑定</h2>
        {tools.map((tool) => (
          <form key={tool.id} action={updateToolTagsAction} className="glass grid gap-3 rounded-2xl p-5">
            <input type="hidden" name="toolId" value={tool.id} />
            <p className="font-semibold">{tool.name}</p>
            <Field label="标签，逗号或换行分隔">
              <textarea name="tags" defaultValue={tool.tagLinks.map((link) => link.tag.name).join(", ")} className={textareaClass} />
            </Field>
            <SubmitButton>保存工具标签</SubmitButton>
          </form>
        ))}
      </div>
    </AdminSection>
  );
}
