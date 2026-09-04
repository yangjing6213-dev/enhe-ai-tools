import type { Prisma } from "@prisma/client";
import { archiveNewsArticleAction, upsertNewsArticleAction, upsertNewsCategoryAction } from "@/app/admin/actions";
import { AiNewsEnglishFields } from "@/app/admin/ai-news-english-fields";
import { DangerButton, Field, inputClass, selectClass, SubmitButton, textareaClass } from "@/app/admin/admin-ui";

type NewsArticleWithRelations = Prisma.NewsArticleGetPayload<{
  include: {
    category: true;
    tagLinks: { include: { tag: true } };
    externalSources: true;
  };
}>;

type NewsArticleEditorProps = {
  article: NewsArticleWithRelations | null;
  categories: { id: string; name: string; slug: string; status: "active" | "disabled"; sortOrder: number }[];
  relatedArticles: { id: string; title: string; slug: string }[];
  tools: { id: string; name: string; slug: string }[];
  tutorials: { id: string; title: string; tool: { name: string } }[];
};

export function NewsArticleEditor({ article, categories, relatedArticles, tools, tutorials }: NewsArticleEditorProps) {
  const isNew = !article;
  const externalSources = article?.externalSources
    .map((source) => [source.title, source.url, source.sourceType, source.description ?? ""].join("|"))
    .join("\n");
  const tags = article?.tagLinks.map(({ tag }) => tag.name).join(", ");
  const relatedArticleIds = article?.relatedArticleIds.join("\n");
  const relatedToolIds = article?.relatedToolIds.join("\n");
  const relatedTutorialIds = article?.relatedTutorialIds.join("\n");

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
      <form action={upsertNewsArticleAction} className="glass grid gap-5 rounded-2xl p-6 md:grid-cols-2">
        {article ? <input type="hidden" name="id" value={article.id} /> : null}
        <input type="hidden" name="returnTo" value={article ? `/admin/ai-news/${article.id}` : "/admin/ai-news/new"} />

        <SectionHeading title="基础内容" />
        <Field label="标题" className="md:col-span-2">
          <input name="title" required defaultValue={article?.title ?? ""} className={inputClass} />
        </Field>
        <Field label="Slug">
          <input name="slug" defaultValue={article?.slug ?? ""} placeholder="留空自动生成英文地址" className={inputClass} />
        </Field>
        <Field label="分类">
          <select name="categoryId" defaultValue={article?.categoryId ?? ""} className={selectClass}>
            <option value="">未分类</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="副标题" className="md:col-span-2">
          <input name="subtitle" defaultValue={article?.subtitle ?? ""} className={inputClass} />
        </Field>
        <Field label="一句话摘要" className="md:col-span-2">
          <textarea name="summary" required defaultValue={article?.summary ?? ""} className={textareaClass} />
        </Field>
        <Field label="正文内容" className="md:col-span-2">
          <textarea
            name="content"
            required
            defaultValue={article?.content ?? ""}
            className={`${textareaClass} min-h-[360px]`}
            placeholder="支持 ## H2、### H3、列表、引用和代码块。"
          />
        </Field>
        <Field label="核心要点，每行一条" className="md:col-span-2">
          <textarea name="keyTakeaways" defaultValue={article?.keyTakeaways.join("\n") ?? ""} className={textareaClass} />
        </Field>
        <Field label="这对用户意味着什么" className="md:col-span-2">
          <textarea name="impactNotes" defaultValue={article?.impactNotes ?? ""} className={textareaClass} />
        </Field>
        <Field label="总结" className="md:col-span-2">
          <textarea name="conclusion" defaultValue={article?.conclusion ?? ""} className={textareaClass} />
        </Field>

        <SectionHeading title="发布设置" />
        <Field label="状态">
          <select name="status" defaultValue={article?.status ?? "draft"} className={selectClass}>
            <option value="draft">草稿</option>
            <option value="published">发布</option>
            <option value="archived">归档</option>
          </select>
        </Field>
        <Field label="发布时间">
          <input name="publishedAt" type="datetime-local" defaultValue={toDatetimeLocal(article?.publishedAt)} className={inputClass} />
        </Field>
        <Field label="作者">
          <input name="author" defaultValue={article?.author ?? "ENHE AI"} className={inputClass} />
        </Field>
        <Field label="阅读时间，分钟">
          <input name="readingTime" type="number" min="1" defaultValue={article?.readingTime ?? 5} className={inputClass} />
        </Field>
        <Field label="阅读量">
          <input name="viewCount" type="number" min="0" defaultValue={article?.viewCount ?? 0} className={inputClass} />
        </Field>
        <Field label="排序权重">
          <input name="sortOrder" type="number" defaultValue={article?.sortOrder ?? 0} className={inputClass} />
        </Field>
        <Field label="点赞数">
          <input name="likeCount" type="number" min="0" defaultValue={article?.likeCount ?? 0} className={inputClass} />
        </Field>
        <Field label="收藏数">
          <input name="favoriteCount" type="number" min="0" defaultValue={article?.favoriteCount ?? 0} className={inputClass} />
        </Field>
        <label className="flex items-center gap-3 rounded-xl border border-white/12 bg-white/7 px-4 py-3 text-sm text-[var(--marketing-text)]">
          <input name="isPinned" type="checkbox" defaultChecked={article?.isPinned ?? false} />
          置顶
        </label>
        <label className="flex items-center gap-3 rounded-xl border border-white/12 bg-white/7 px-4 py-3 text-sm text-[var(--marketing-text)]">
          <input name="isFeatured" type="checkbox" defaultChecked={article?.isFeatured ?? false} />
          推荐
        </label>

        <SectionHeading title="媒体与 SEO" />
        <Field label="封面图 URL" className="md:col-span-2">
          <input name="coverImage" defaultValue={article?.coverImage ?? ""} className={inputClass} />
        </Field>
        <Field label="视频 URL">
          <input name="videoUrl" defaultValue={article?.videoUrl ?? ""} className={inputClass} />
        </Field>
        <Field label="视频标题">
          <input name="videoTitle" defaultValue={article?.videoTitle ?? ""} className={inputClass} />
        </Field>
        <Field label="视频说明" className="md:col-span-2">
          <textarea name="videoDescription" defaultValue={article?.videoDescription ?? ""} className={textareaClass} />
        </Field>
        <Field label="SEO 标题">
          <input name="seoTitle" defaultValue={article?.seoTitle ?? ""} className={inputClass} />
        </Field>
        <Field label="Canonical URL">
          <input name="canonicalUrl" defaultValue={article?.canonicalUrl ?? ""} className={inputClass} />
        </Field>
        <Field label="SEO 描述" className="md:col-span-2">
          <textarea name="seoDescription" defaultValue={article?.seoDescription ?? article?.description ?? ""} className={textareaClass} />
        </Field>
        <Field label="关键词" className="md:col-span-2">
          <input name="keywords" defaultValue={article?.keywords ?? ""} className={inputClass} />
        </Field>
        <input type="hidden" name="description" value={article?.description ?? ""} />
        <input type="hidden" name="seoKeywords" value={article?.seoKeywords ?? ""} />

        <SectionHeading title="英文内容" />
        <AiNewsEnglishFields article={article} />

        <SectionHeading title="标签、内链与来源" />
        <Field label="标签，逗号或换行分隔" className="md:col-span-2">
          <textarea name="tags" defaultValue={tags ?? ""} className={textareaClass} />
        </Field>
        <Field label="相关资讯 ID，每行一个">
          <textarea name="relatedArticleIds" defaultValue={relatedArticleIds ?? ""} className={textareaClass} />
        </Field>
        <Field label="相关工具 ID，每行一个">
          <textarea name="relatedToolIds" defaultValue={relatedToolIds ?? ""} className={textareaClass} />
        </Field>
        <Field label="相关教程 ID，每行一个">
          <textarea name="relatedTutorialIds" defaultValue={relatedTutorialIds ?? ""} className={textareaClass} />
        </Field>
        <Field label="参考来源，每行：标题|URL|类型|说明" className="md:col-span-2">
          <textarea name="externalSources" defaultValue={externalSources ?? ""} className={textareaClass} />
        </Field>

        <div className="md:col-span-2">
          <SubmitButton>{isNew ? "新增资讯" : "保存资讯"}</SubmitButton>
        </div>
      </form>

      <aside className="space-y-5">
        <div className="glass rounded-2xl p-5">
          <h2 className="text-lg font-black text-[var(--marketing-text)]">快速创建分类</h2>
          <form action={upsertNewsCategoryAction} className="mt-4 grid gap-3">
            <input name="name" required placeholder="分类名称" className={inputClass} />
            <input name="slug" placeholder="slug，可留空" className={inputClass} />
            <input name="sortOrder" type="number" defaultValue={0} className={inputClass} />
            <select name="status" defaultValue="active" className={selectClass}>
              <option value="active">启用</option>
              <option value="disabled">禁用</option>
            </select>
            <textarea name="description" placeholder="分类说明" className={textareaClass} />
            <SubmitButton variant="secondary">保存分类</SubmitButton>
          </form>
        </div>

        <ReferencePanel title="可关联资讯 ID" items={relatedArticles.map((item) => `${item.title}\n${item.id}`)} />
        <ReferencePanel title="可关联工具 ID" items={tools.map((item) => `${item.name}\n${item.id}`)} />
        <ReferencePanel title="可关联教程 ID" items={tutorials.map((item) => `${item.title} / ${item.tool.name}\n${item.id}`)} />

        {article ? (
          <form action={archiveNewsArticleAction} className="glass rounded-2xl p-5">
            <input type="hidden" name="id" value={article.id} />
            <h2 className="text-lg font-black text-[var(--marketing-text)]">归档资讯</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--marketing-muted)]">归档后前台不会访问这篇资讯，但后台记录会保留。</p>
            <div className="mt-4">
              <DangerButton>归档资讯</DangerButton>
            </div>
          </form>
        ) : null}
      </aside>
    </div>
  );
}

function SectionHeading({ title }: { title: string }) {
  return (
    <h2 className="md:col-span-2 border-t border-white/10 pt-5 text-xl font-black text-[var(--marketing-text)] first:border-t-0 first:pt-0">
      {title}
    </h2>
  );
}

function ReferencePanel({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="glass rounded-2xl p-5">
      <h2 className="text-lg font-black text-[var(--marketing-text)]">{title}</h2>
      <div className="mt-4 max-h-72 space-y-3 overflow-auto pr-1">
        {items.length ? (
          items.map((item) => (
            <pre key={item} className="whitespace-pre-wrap rounded-xl border border-white/10 bg-white/7 p-3 text-xs leading-5 text-[var(--marketing-muted)]">
              {item}
            </pre>
          ))
        ) : (
          <p className="text-sm text-[var(--marketing-muted)]">暂无可关联内容。</p>
        )}
      </div>
    </div>
  );
}

function toDatetimeLocal(value?: Date | null) {
  if (!value) return "";
  const date = new Date(value);
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 16);
}
