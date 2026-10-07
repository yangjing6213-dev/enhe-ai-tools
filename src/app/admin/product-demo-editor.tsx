import type { Prisma, ProductDemoCategory, ProductDemoStatus, ToolType } from "@prisma/client";
import {
  archiveProductDemoAction,
  deleteProductDemoAction,
  upsertProductDemoAction,
} from "@/app/admin/actions";
import { DangerButton, Field, inputClass, selectClass, SubmitButton, textareaClass } from "@/app/admin/admin-ui";
import { ProductDemoVideoUploadField } from "@/app/admin/product-demo-video-upload-field";
import { buildCanonicalToolPath } from "@/lib/public-slugs";

type ProductDemoWithProduct = Prisma.ProductDemoGetPayload<{
  include: { relatedProduct: true };
}>;

type ProductDemoEditorProps = {
  demo: ProductDemoWithProduct | null;
  tools: Array<{
    id: string;
    name: string;
    englishName: string | null;
    slug: string;
    type: ToolType;
    status: "published" | "draft" | "offline";
  }>;
};

const categoryOptions: Array<{ value: ProductDemoCategory; label: string }> = [
  { value: "software", label: "AI软件应用" },
  { value: "skill_learning", label: "AI技能学习" },
  { value: "account_service", label: "AI账号服务" },
];

const statusOptions: Array<{ value: ProductDemoStatus; label: string }> = [
  { value: "draft", label: "草稿" },
  { value: "published", label: "已发布" },
  { value: "archived", label: "下架" },
];

export function ProductDemoEditor({ demo, tools }: ProductDemoEditorProps) {
  const isNew = !demo;
  const tags = demo?.tags.join(", ");
  const faqText = formatFaqText(demo?.faq);
  const uploadDate = toDatetimeLocal(demo?.uploadDate);
  const publishedAt = toDatetimeLocal(demo?.publishedAt);

  return (
    <div className="enhe-admin-product-demo-editor grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
      <form action={upsertProductDemoAction} className="enhe-admin-content-form enhe-admin-product-demo-form glass grid gap-5 rounded-2xl p-6 md:grid-cols-2">
        {demo ? <input type="hidden" name="id" value={demo.id} /> : null}
        <input type="hidden" name="returnTo" value={demo ? `/admin/product-demos/${demo.id}` : "/admin/product-demos/new"} />

        <SectionHeading title="基础内容" />
        <Field label="演示标题" className="md:col-span-2">
          <input name="title" required defaultValue={demo?.title ?? ""} className={inputClass} />
        </Field>
        <Field label="Slug（小写英文、数字、短横线）">
          <input name="slug" required defaultValue={demo?.slug ?? ""} placeholder="ai-video-workflow-demo" className={inputClass} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" />
        </Field>
        <Field label="发布状态">
          <select name="status" required defaultValue={demo?.status ?? "draft"} className={selectClass}>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="简短描述" className="md:col-span-2">
          <textarea name="description" required defaultValue={demo?.description ?? ""} className={textareaClass} />
        </Field>
        <Field label="产品类型">
          <select name="category" required defaultValue={demo?.category ?? "software"} className={selectClass}>
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="类型文案">
          <input name="productType" defaultValue={demo?.productType ?? ""} placeholder="如 AI语音 / 本地部署 / 工作流" className={inputClass} />
        </Field>
        <Field label="关键词标签（逗号或换行分隔）" className="md:col-span-2">
          <textarea name="tags" defaultValue={tags ?? ""} className={textareaClass} />
        </Field>

        <SectionHeading title="封面与视频" />
        <Field label="封面图 URL" className="md:col-span-2">
          <input name="coverImage" defaultValue={demo?.coverImage ?? ""} className={inputClass} />
        </Field>
        <Field label="上传封面图">
          <input name="coverImageFile" type="file" accept="image/*" className={inputClass} />
        </Field>
        <Field label="本地上传视频" className="md:col-span-2">
          <ProductDemoVideoUploadField currentUrl={demo?.videoUrl} inputClass={inputClass} slug={demo?.slug} />
        </Field>
        <Field label="视频时长（ISO 8601，如 PT2M30S）">
          <input name="videoDuration" defaultValue={demo?.videoDuration ?? ""} className={inputClass} />
        </Field>
        <Field label="上传/录制日期">
          <input name="uploadDate" type="datetime-local" defaultValue={uploadDate} className={inputClass} />
        </Field>
        <Field label="视频文字稿" className="md:col-span-2">
          <textarea name="transcript" defaultValue={demo?.transcript ?? ""} className={`${textareaClass} min-h-[220px]`} />
        </Field>
        <Field label="FAQ（每行：问题|答案）" className="md:col-span-2">
          <textarea name="faq" defaultValue={faqText} className={textareaClass} placeholder="这个演示适合谁？|适合想先查看真实工作流再购买的用户。" />
        </Field>

        <SectionHeading title="关联与首页展示" />
        <Field label="关联已有产品" className="md:col-span-2">
          <select name="relatedProductId" defaultValue={demo?.relatedProductId ?? ""} className={selectClass}>
            <option value="">不关联产品</option>
            {tools.map((tool) => (
              <option key={tool.id} value={tool.id}>
                {tool.name} / {tool.slug} / {tool.type}
              </option>
            ))}
          </select>
        </Field>
        <Field label="关联产品链接">
          <input name="relatedProductUrl" defaultValue={demo?.relatedProductUrl ?? ""} placeholder="未选择产品时可填写详情链接" className={inputClass} />
        </Field>
        <Field label="关联产品 Slug">
          <input name="relatedProductSlug" defaultValue={demo?.relatedProductSlug ?? ""} className={inputClass} />
        </Field>
        <Field label="演示外部链接">
          <input name="demoUrl" defaultValue={demo?.demoUrl ?? ""} className={inputClass} />
        </Field>
        <Field label="相关教程链接">
          <input name="tutorialUrl" defaultValue={demo?.tutorialUrl ?? ""} className={inputClass} />
        </Field>
        <Field label="排序值">
          <input name="sortOrder" type="number" defaultValue={demo?.sortOrder ?? 0} className={inputClass} />
        </Field>
        <Field label="发布时间">
          <input name="publishedAt" type="datetime-local" defaultValue={publishedAt} className={inputClass} />
        </Field>
        <label className="flex items-center gap-3 rounded-xl border border-white/12 bg-white/7 px-4 py-3 text-sm text-[var(--marketing-text)] md:col-span-2">
          <input name="isFeaturedOnHome" type="checkbox" defaultChecked={demo?.isFeaturedOnHome ?? false} />
          首页展示
        </label>

        <SectionHeading title="SEO / GEO" />
        <Field label="SEO 标题">
          <input name="seoTitle" defaultValue={demo?.seoTitle ?? ""} className={inputClass} />
        </Field>
        <Field label="Canonical URL">
          <input name="canonicalUrl" defaultValue={demo?.canonicalUrl ?? ""} className={inputClass} />
        </Field>
        <Field label="SEO 描述" className="md:col-span-2">
          <textarea name="seoDescription" defaultValue={demo?.seoDescription ?? ""} className={textareaClass} />
        </Field>

        <div className="md:col-span-2">
          <SubmitButton>{isNew ? "新增视频演示" : "保存视频演示"}</SubmitButton>
        </div>
      </form>

      <aside className="enhe-admin-product-demo-sidebar space-y-5">
        <div className="glass rounded-2xl p-5">
          <h2 className="text-lg font-black text-[var(--marketing-text)]">发布校验</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--marketing-muted)]">
            发布状态需要标题、slug、描述、封面、本地上传视频，并且至少配置关联产品、产品链接或演示链接。
          </p>
        </div>
        <ReferencePanel
          title="可关联产品"
          items={tools.map((tool) => `${tool.name}\n${tool.id}\n${buildCanonicalToolPath(tool, "zh")}`)}
        />
        {demo ? (
          <form action={archiveProductDemoAction} className="enhe-admin-content-form enhe-admin-product-demo-danger-form glass rounded-2xl p-5">
            <input type="hidden" name="id" value={demo.id} />
            <h2 className="text-lg font-black text-[var(--marketing-text)]">下架演示</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--marketing-muted)]">
              下架后不会在首页、聚合页、详情页和 sitemap 中展示。
            </p>
            <div className="mt-4">
              <DangerButton>下架演示</DangerButton>
            </div>
          </form>
        ) : null}
      </aside>
    </div>
  );
}

function SectionHeading({ title }: { title: string }) {
  return (
    <h2 className="border-t border-white/10 pt-5 text-xl font-black text-[var(--marketing-text)] first:border-t-0 first:pt-0 md:col-span-2">
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

function formatFaqText(value?: Prisma.JsonValue) {
  if (!Array.isArray(value)) return "";
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return "";
      const record = item as Record<string, unknown>;
      const question = String(record.question ?? "").trim();
      const answer = String(record.answer ?? "").trim();
      return question && answer ? `${question}|${answer}` : "";
    })
    .filter(Boolean)
    .join("\n");
}

export function DeleteProductDemoForm({ id }: { id: string }) {
  return (
    <form action={deleteProductDemoAction}>
      <input type="hidden" name="id" value={id} />
      <DangerButton className="px-3 py-2 text-xs" pendingLabel="删除中...">
        删除
      </DangerButton>
    </form>
  );
}
