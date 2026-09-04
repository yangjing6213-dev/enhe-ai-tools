import { prisma } from "@/lib/db";
import { deleteCategoryAction, upsertCategoryAction } from "@/app/admin/actions";
import { AdminSection, DangerButton, Field, inputClass, selectClass, SubmitButton, textareaClass } from "@/app/admin/admin-ui";

export default async function AdminCategoriesPage() {
  const categories = await prisma.toolCategory.findMany({ orderBy: [{ type: "asc" }, { sortOrder: "asc" }] });
  return (
    <AdminSection title="工具分类管理" intro="分类按 AI软件应用 / AI账号服务 区分，前台子分类筛选全部来自这里。">
      <form action={upsertCategoryAction} className="glass mb-8 grid gap-4 rounded-2xl p-6 md:grid-cols-2">
        <Field label="分类名称"><input name="name" required className={inputClass} /></Field>
        <Field label="类型">
          <select name="type" className={selectClass}>
            <option value="software">AI软件应用</option>
            <option value="online">AI账号服务</option>
            <option value="skill_learning">AI技能学习</option>
          </select>
        </Field>
        <Field label="排序"><input name="sortOrder" type="number" defaultValue={0} className={inputClass} /></Field>
        <Field label="状态">
          <select name="status" className={selectClass}>
            <option value="active">启用</option>
            <option value="disabled">禁用</option>
          </select>
        </Field>
        <Field label="描述" className="md:col-span-2"><textarea name="description" className={textareaClass} /></Field>
        <div className="md:col-span-2"><SubmitButton>新增分类</SubmitButton></div>
      </form>
      <div className="grid gap-4 md:grid-cols-2">
        {categories.map((category) => (
          <div key={category.id} className="glass rounded-2xl p-6">
            <form action={upsertCategoryAction} className="grid gap-3">
              <input type="hidden" name="id" value={category.id} />
              <Field label="分类名称"><input name="name" defaultValue={category.name} required className={inputClass} /></Field>
              <Field label="类型">
                <select name="type" defaultValue={category.type} className={selectClass}>
                  <option value="software">AI软件应用</option>
                  <option value="online">AI账号服务</option>
            <option value="skill_learning">AI技能学习</option>
                </select>
              </Field>
              <Field label="状态">
                <select name="status" defaultValue={category.status} className={selectClass}>
                  <option value="active">启用</option>
                  <option value="disabled">禁用</option>
                </select>
              </Field>
              <Field label="排序"><input name="sortOrder" type="number" defaultValue={category.sortOrder} className={inputClass} /></Field>
              <Field label="描述"><textarea name="description" defaultValue={category.description ?? ""} className={textareaClass} /></Field>
              <SubmitButton>保存分类</SubmitButton>
            </form>
            <form action={deleteCategoryAction} className="mt-3">
              <input type="hidden" name="id" value={category.id} />
              <DangerButton />
            </form>
          </div>
        ))}
      </div>
    </AdminSection>
  );
}
