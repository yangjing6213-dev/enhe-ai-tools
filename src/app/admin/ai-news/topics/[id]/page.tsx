import Link from "next/link";
import { notFound } from "next/navigation";
import { upsertNewsTopicAction } from "@/app/admin/actions";
import {
  AdminContentShell,
  AdminSection,
  Field,
  inputClass,
  selectClass,
  SubmitButton,
  textareaClass,
} from "@/app/admin/admin-ui";
import { formatTopicDelimitedRows } from "@/lib/ai-news-topic-config";
import { prisma } from "@/lib/db";

type AdminAiNewsTopicDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function AdminAiNewsTopicDetailPage({
  params,
  searchParams,
}: AdminAiNewsTopicDetailPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const isNew = id === "new";
  const topic = isNew ? null : await prisma.newsTopic.findUnique({ where: { id } });
  if (!isNew && !topic) notFound();

  return (
    <AdminSection
      title={isNew ? "新增 AI 资讯专题" : "编辑 AI 资讯专题"}
      intro="配置专题内容、关键词规则、FAQ、来源和推荐内链。前台专题页、AI 资讯列表侧栏与 sitemap 会优先读取这里的配置。"
    >
      <AdminContentShell className="enhe-admin-content-management">
      <div className="mb-6 flex flex-wrap gap-3">
        <Link
          href="/admin/ai-news/topics"
          className="rounded-full border border-white/15 px-4 py-2 text-sm transition hover:border-[#48F5D3]/50 hover:text-[#48F5D3]"
        >
          返回专题列表
        </Link>
      </div>

      {query.saved ? (
        <p className="mb-5 rounded-xl border border-[#48F5D3]/30 bg-[#48F5D3]/10 px-4 py-3 text-sm text-[#48F5D3]">
          保存成功。
        </p>
      ) : null}
      {query.error ? (
        <p className="mb-5 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-100">
          {query.error}
        </p>
      ) : null}

      <form action={upsertNewsTopicAction} className="enhe-admin-content-form enhe-admin-topic-editor-form grid gap-6">
        {topic ? <input type="hidden" name="id" value={topic.id} /> : null}
        <input type="hidden" name="returnTo" value={`/admin/ai-news/topics/${id}`} />

        <section className="glass grid gap-4 rounded-2xl p-6 md:grid-cols-2">
          <h2 className="md:col-span-2 text-xl font-black text-[var(--marketing-text)]">
            基础信息
          </h2>
          <Field label="中文专题标题">
            <input name="title" required defaultValue={topic?.title ?? ""} className={inputClass} />
          </Field>
          <Field label="Slug">
            <input
              name="slug"
              defaultValue={topic?.slug ?? ""}
              placeholder="例如 ai-agent"
              className={inputClass}
            />
          </Field>
          <Field label="状态">
            <select name="status" defaultValue={topic?.status ?? "active"} className={selectClass}>
              <option value="active">启用</option>
              <option value="disabled">停用</option>
            </select>
          </Field>
          <Field label="排序">
            <input
              name="sortOrder"
              type="number"
              defaultValue={topic?.sortOrder ?? 0}
              className={inputClass}
            />
          </Field>
          <Field label="中文描述" className="md:col-span-2">
            <textarea
              name="description"
              required
              defaultValue={topic?.description ?? ""}
              className={textareaClass}
            />
          </Field>
          <Field label="中文介绍" className="md:col-span-2">
            <textarea name="intro" required defaultValue={topic?.intro ?? ""} className={textareaClass} />
          </Field>
          <Field label="可摘录答案段" className="md:col-span-2">
            <textarea name="answer" required defaultValue={topic?.answer ?? ""} className={textareaClass} />
          </Field>
        </section>

        <section className="glass grid gap-4 rounded-2xl p-6 md:grid-cols-2">
          <h2 className="md:col-span-2 text-xl font-black text-[var(--marketing-text)]">
            自动归类规则
          </h2>
          <Field label="搜索查询规则">
            <input
              name="searchQuery"
              required
              defaultValue={topic?.searchQuery ?? ""}
              placeholder="例如 AI智能体 AI Agent Agentic AI"
              className={inputClass}
            />
          </Field>
          <Field label="英文搜索查询规则">
            <input
              name="englishSearchQuery"
              defaultValue={topic?.englishSearchQuery ?? ""}
              placeholder="AI Agent workflow automation"
              className={inputClass}
            />
          </Field>
          <Field label="中文关键词，每行一个">
            <textarea
              name="keywords"
              defaultValue={(topic?.keywords ?? []).join("\n")}
              className={textareaClass}
            />
          </Field>
          <Field label="英文关键词，每行一个">
            <textarea
              name="englishKeywords"
              defaultValue={(topic?.englishKeywords ?? []).join("\n")}
              className={textareaClass}
            />
          </Field>
        </section>

        <section className="glass grid gap-4 rounded-2xl p-6 md:grid-cols-2">
          <h2 className="md:col-span-2 text-xl font-black text-[var(--marketing-text)]">
            推荐内链、FAQ 与来源
          </h2>
          <Field label="为什么值得关注，每行一个">
            <textarea
              name="whyItMatters"
              defaultValue={(topic?.whyItMatters ?? []).join("\n")}
              className={textareaClass}
            />
          </Field>
          <Field label="英文关注理由，每行一个">
            <textarea
              name="englishWhyItMatters"
              defaultValue={(topic?.englishWhyItMatters ?? []).join("\n")}
              className={textareaClass}
            />
          </Field>
          <Field label="推荐内链：按钮文案|链接">
            <textarea
              name="actionLinks"
              defaultValue={formatTopicDelimitedRows(topic?.actionLinks ?? [], "action")}
              placeholder={"查看AI软件应用|/software\n学习AI技能课程|/skill-learning"}
              className={textareaClass}
            />
          </Field>
          <Field label="英文推荐内链：label|href">
            <textarea
              name="englishActionLinks"
              defaultValue={formatTopicDelimitedRows(topic?.englishActionLinks ?? [], "action")}
              placeholder={"Explore AI software|/software\nLearn AI courses|/skill-learning"}
              className={textareaClass}
            />
          </Field>
          <Field label="FAQ：问题|答案">
            <textarea
              name="faqs"
              defaultValue={formatTopicDelimitedRows(topic?.faqs ?? [], "faq")}
              placeholder={"AI智能体适合谁？|适合想减少重复流程的人。\n如何开始？|先选择一个高频任务做小范围验证。"}
              className={textareaClass}
            />
          </Field>
          <Field label="英文 FAQ：question|answer">
            <textarea
              name="englishFaqs"
              defaultValue={formatTopicDelimitedRows(topic?.englishFaqs ?? [], "faq")}
              placeholder={"Who is this topic for?|Users who want repeatable AI workflows."}
              className={textareaClass}
            />
          </Field>
          <Field label="来源引用：标题|URL" className="md:col-span-2">
            <textarea
              name="sourceLinks"
              defaultValue={formatTopicDelimitedRows(topic?.sourceLinks ?? [], "source")}
              placeholder={"OpenAI Docs|https://platform.openai.com/docs/\nGoogle AI|https://ai.google/"}
              className={textareaClass}
            />
          </Field>
        </section>

        <section className="glass grid gap-4 rounded-2xl p-6 md:grid-cols-2">
          <h2 className="md:col-span-2 text-xl font-black text-[var(--marketing-text)]">
            英文内容
          </h2>
          <Field label="English title">
            <input name="englishTitle" defaultValue={topic?.englishTitle ?? ""} className={inputClass} />
          </Field>
          <Field label="English description">
            <input
              name="englishDescription"
              defaultValue={topic?.englishDescription ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="English intro" className="md:col-span-2">
            <textarea
              name="englishIntro"
              defaultValue={topic?.englishIntro ?? ""}
              className={textareaClass}
            />
          </Field>
          <Field label="English answer" className="md:col-span-2">
            <textarea
              name="englishAnswer"
              defaultValue={topic?.englishAnswer ?? ""}
              className={textareaClass}
            />
          </Field>
        </section>

        <div className="flex justify-end">
          <SubmitButton pendingLabel="保存中...">保存专题配置</SubmitButton>
        </div>
      </form>
      </AdminContentShell>
    </AdminSection>
  );
}
