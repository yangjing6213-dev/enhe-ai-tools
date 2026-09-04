import Link from "next/link";
import { importNewsArticleHtmlAction } from "@/app/admin/actions";
import { AdminSection, Field, SubmitButton, inputClass, selectClass, textareaClass } from "@/app/admin/admin-ui";

type AdminAiNewsImportPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function AdminAiNewsImportPage({ searchParams }: AdminAiNewsImportPageProps) {
  const params = await searchParams;

  return (
    <AdminSection title="导入 AI 资讯 HTML" intro="上传或粘贴无 CSS 的 HTML 新闻文章，导入后可继续在编辑页调整。">
      <div className="mb-6 flex flex-wrap gap-3">
        <Link href="/admin/ai-news" className="rounded-full border border-white/15 px-4 py-2 text-sm transition hover:border-[#48F5D3]/50 hover:text-[#48F5D3]">
          返回资讯列表
        </Link>
      </div>

      {params.error ? <p className="mb-5 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-100">{params.error}</p> : null}

      <form action={importNewsArticleHtmlAction} className="grid gap-5 rounded-2xl border border-white/12 bg-white/6 p-5">
        <div className="grid gap-5 lg:grid-cols-2">
          <Field label="HTML 文件">
            <input name="htmlFile" type="file" accept=".html,.htm,text/html" className={inputClass} />
          </Field>
          <Field label="导入状态">
            <select name="publishMode" defaultValue="draft" className={selectClass}>
              <option value="draft">草稿</option>
              <option value="published">直接发布</option>
            </select>
          </Field>
        </div>

        <Field label="HTML 代码">
          <textarea name="html" rows={18} className={textareaClass} placeholder="<article>...</article>" />
        </Field>

        <div className="grid gap-5 lg:grid-cols-3">
          <Field label="分类名称">
            <input name="categoryName" defaultValue="AI快讯" className={inputClass} />
          </Field>
          <Field label="分类 Slug">
            <input name="categorySlug" defaultValue="ai-news-flash" className={inputClass} />
          </Field>
          <Field label="导入批次">
            <input name="importBatchId" placeholder="enhe-ai-news-2026-06-18" className={inputClass} />
          </Field>
        </div>

        <Field label="附加标签">
          <input name="tags" defaultValue="AI资讯, 自动发布" className={inputClass} />
        </Field>

        <div className="flex justify-end">
          <SubmitButton pendingLabel="导入中...">导入</SubmitButton>
        </div>
      </form>
    </AdminSection>
  );
}
