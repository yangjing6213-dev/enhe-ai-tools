import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StructuredData } from "@/components/structured-data";
import { Container, SectionTitle } from "@/components/ui";
import type { Locale } from "@/lib/dictionaries";
import {
  aiTopicClusters,
  aiTopicClusterSlugs,
  buildAiTopicBreadcrumbSchema,
  buildAiTopicCollectionSchema,
  getAiTopicCluster,
  getAiTopicHubPath,
  getAiTopicPath,
} from "@/lib/ai-topic-clusters";
import {
  absoluteUrl,
  buildFaqSchema,
  buildLocalePath,
  buildMetadataTitle,
  buildPageMetadata,
  buildTopicMetaDescription,
} from "@/lib/seo";

const hubText = {
  zh: {
    title: "AI 主题增长路径",
    intro:
      "按真实目标选择 AI 工具、课程、项目和账号服务，快速找到适合创作者与年轻 AI 用户的下一步。",
    metaDescription:
      "ENHE AI 主题路径聚合内容创作、视频图像、本地部署、AI Agent、技能学习和账号合规指南，帮助创作者按目标选择工具、课程与服务。",
    answerTitle: "先按目标选路径，再进入工具和教程",
    answer:
      "AI 用户常见问题不是缺少工具，而是不知道该先选软件、课程、项目还是服务。ENHE AI 主题路径把高频意图拆成六类，帮助你比较选项、查看常见问题，并沿着站内链接决定先学什么、试什么、继续查看什么。",
    updatedLabel: "最后更新",
  },
  en: {
    title: "AI Topic Growth Paths",
    intro:
      "Choose AI tools, courses, projects, and account-service guidance by real creator goals.",
    metaDescription:
      "ENHE AI topic paths organize content creation, video and image workflows, local AI, agents, skill learning, and account compliance for creators.",
    answerTitle: "Choose a goal path before choosing a tool",
    answer:
      "Most AI users do not lack tools. They lack a clear path from goal to software, course, project, or service. ENHE AI topic paths split high-intent needs into six pages to help people compare options, answer common questions, and decide what to learn, try, or explore next.",
    updatedLabel: "Last updated",
  },
} as const;

const labels = {
  zh: {
    directAnswer: "核心结论",
    intents: "适合哪些需求",
    comparison: "决策对比",
    dimension: "比较维度",
    optionA: "路径 A",
    optionB: "路径 B",
    nextStep: "下一步",
    faq: "常见问题",
    related: "继续探索",
    hub: "AI 主题路径",
  },
  en: {
    directAnswer: "Key takeaway",
    intents: "Best-fit needs",
    comparison: "Decision comparison",
    dimension: "Dimension",
    optionA: "Path A",
    optionB: "Path B",
    nextStep: "Next step",
    faq: "FAQ",
    related: "Continue with",
    hub: "AI Topic Hub",
  },
} as const;

export function generateAiTopicStaticParams() {
  return aiTopicClusterSlugs.map((slug) => ({ slug }));
}

export async function generateAiTopicsHubMetadata(
  forceLocale: Locale,
): Promise<Metadata> {
  const text = hubText[forceLocale];
  return buildPageMetadata({
    title: buildMetadataTitle({ pageTitle: text.title }),
    description: buildTopicMetaDescription({
      title: text.title,
      description: text.metaDescription,
      locale: forceLocale,
      kind: "ai-topic",
    }),
    path: "/ai-topics",
    locale: forceLocale === "en" ? "en_US" : "zh_CN",
    localeKey: forceLocale,
  });
}

export async function generateAiTopicDetailMetadata({
  slug,
  forceLocale,
}: {
  slug: string;
  forceLocale: Locale;
}): Promise<Metadata> {
  const topic = getAiTopicCluster(slug);
  if (!topic) return {};

  const content = topic.content[forceLocale];
  const description = content.metaDescription ?? content.description;
  return buildPageMetadata({
    title: buildMetadataTitle({ pageTitle: content.title }),
    description: buildTopicMetaDescription({
      title: content.title,
      description,
      locale: forceLocale,
      kind: "ai-topic",
    }),
    path: `/ai-topics/${topic.slug}`,
    locale: forceLocale === "en" ? "en_US" : "zh_CN",
    localeKey: forceLocale,
  });
}

export function AiTopicsHubPageShell({ forceLocale }: { forceLocale: Locale }) {
  const text = hubText[forceLocale];
  const breadcrumbSchema = buildAiTopicBreadcrumbSchema(null, forceLocale);
  const hubSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: text.title,
    description: text.metaDescription,
    url: absoluteUrl(getAiTopicHubPath(forceLocale)),
    inLanguage: forceLocale === "en" ? "en-US" : "zh-CN",
    dateModified: "2026-06-28",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: aiTopicClusters.map((topic, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: topic.content[forceLocale].title,
        url: absoluteUrl(getAiTopicPath(topic.slug, forceLocale)),
      })),
    },
  };

  return (
    <main>
      <Container className="py-14">
        <StructuredData data={[breadcrumbSchema, hubSchema]} />
        <SectionTitle as="h1" title={text.title} intro={text.intro} />

        <section className="surface-panel p-6">
          <h2 className="text-2xl font-black text-[var(--marketing-text)]">
            {text.answerTitle}
          </h2>
          <p className="mt-3 max-w-4xl text-sm font-semibold leading-7 text-[var(--marketing-muted)] md:text-base md:leading-8">
            {text.answer}
          </p>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {aiTopicClusters.map((topic) => {
            const content = topic.content[forceLocale];
            return (
              <Link
                key={topic.slug}
                href={getAiTopicPath(topic.slug, forceLocale)}
                    className="surface-panel-soft block p-5 transition-[border-color,transform] hover:-translate-y-0.5 hover:border-[var(--marketing-accent)]"
              >
                <span className="text-sm font-black text-[var(--marketing-accent)]">
                  {content.shortTitle}
                </span>
                <h2 className="mt-3 text-xl font-black leading-snug text-[var(--marketing-text)]">
                  {content.title}
                </h2>
                <p className="mt-3 text-sm leading-7 text-[var(--marketing-muted)]">
                  {content.description}
                </p>
              </Link>
            );
          })}
        </section>

        <p className="mt-8 text-xs font-bold text-[var(--marketing-muted)]">
          {text.updatedLabel}: <time dateTime="2026-06-28">2026-06-28</time>
        </p>
      </Container>
    </main>
  );
}

export function AiTopicDetailPageShell({
  slug,
  forceLocale,
}: {
  slug: string;
  forceLocale: Locale;
}) {
  const topic = getAiTopicCluster(slug);
  if (!topic) notFound();

  const content = topic.content[forceLocale];
  const text = labels[forceLocale];
  const breadcrumbSchema = buildAiTopicBreadcrumbSchema(topic, forceLocale);
  const collectionSchema = buildAiTopicCollectionSchema(topic, forceLocale);
  const faqSchema = buildFaqSchema({ items: content.faqs });

  return (
    <main>
      <Container className="py-14">
        <StructuredData data={[breadcrumbSchema, collectionSchema, faqSchema]} />
        <div className="mb-6">
          <Link
            href={getAiTopicHubPath(forceLocale)}
            className="text-sm font-bold text-[var(--marketing-accent)] hover:text-[var(--marketing-text)]"
          >
            {text.hub}
          </Link>
        </div>
        <SectionTitle as="h1" title={content.title} intro={content.description} />

        <section className="surface-panel p-6">
          <h2 className="text-2xl font-black text-[var(--marketing-text)]">
            {text.directAnswer}
          </h2>
          <p className="mt-4 max-w-4xl text-base font-semibold leading-8 text-[var(--marketing-text)]">
            {content.answer}
          </p>
        </section>

        <TopicContentFold title={text.intents}>
          <div className="ai-topic-intent-grid mt-5 grid gap-4 md:grid-cols-3">
            {content.intents.map((intent) => (
              <Link
                key={intent.title}
                href={buildLocalePath(intent.href, forceLocale)}
                    className="surface-panel-soft block p-5 transition-[border-color,transform] hover:-translate-y-0.5 hover:border-[var(--marketing-accent)]"
              >
                <h3 className="text-lg font-black leading-snug text-[var(--marketing-text)]">
                  {intent.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-[var(--marketing-muted)]">
                  {intent.body}
                </p>
              </Link>
            ))}
          </div>
        </TopicContentFold>

        <TopicContentFold title={text.comparison} className="ai-topic-comparison-fold">
          <div className="mt-5 hidden overflow-x-auto md:block">
            <table className="w-full min-w-[760px] border-separate border-spacing-0 overflow-hidden rounded-2xl border border-white/10 text-left text-sm">
              <thead>
                <tr className="bg-white/10 text-[var(--marketing-text)]">
                  <th className="border-b border-white/10 px-4 py-3 font-black">
                    {text.dimension}
                  </th>
                  <th className="border-b border-white/10 px-4 py-3 font-black">
                    {text.optionA}
                  </th>
                  <th className="border-b border-white/10 px-4 py-3 font-black">
                    {text.optionB}
                  </th>
                  <th className="border-b border-white/10 px-4 py-3 font-black">
                    {text.nextStep}
                  </th>
                </tr>
              </thead>
              <tbody>
                {content.comparisonRows.map((row) => (
                  <tr key={row.dimension} className="align-top">
                    <th className="border-b border-white/10 px-4 py-4 font-black text-[var(--marketing-text)]">
                      {row.dimension}
                    </th>
                    <td className="border-b border-white/10 px-4 py-4 leading-7 text-[var(--marketing-muted)]">
                      {row.optionA}
                    </td>
                    <td className="border-b border-white/10 px-4 py-4 leading-7 text-[var(--marketing-muted)]">
                      {row.optionB}
                    </td>
                    <td className="border-b border-white/10 px-4 py-4 leading-7 text-[var(--marketing-muted)]">
                      {row.nextStep}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-5 grid gap-4 md:hidden">
            {content.comparisonRows.map((row) => (
              <article key={row.dimension} className="surface-panel-soft p-4">
                <h3 className="text-base font-black text-[var(--marketing-text)]">
                  {row.dimension}
                </h3>
                <p className="mt-3 text-sm leading-7 text-[var(--marketing-muted)]">
                  {row.optionA}
                </p>
                <p className="mt-2 text-sm leading-7 text-[var(--marketing-muted)]">
                  {row.optionB}
                </p>
                <p className="mt-2 text-sm font-bold leading-7 text-[var(--marketing-accent)]">
                  {row.nextStep}
                </p>
              </article>
            ))}
          </div>
        </TopicContentFold>

        <section className="mt-8 grid gap-5 lg:grid-cols-[1fr_0.78fr]">
          <div className="surface-panel p-6">
            <h2 className="text-2xl font-black text-[var(--marketing-text)]">
              {text.faq}
            </h2>
            <div className="mt-5 space-y-4">
              {content.faqs.map((item) => (
                <details
                  key={item.question}
                  className="content-fold"
                >
                  <summary>
                    <h3 className="text-base font-black leading-snug text-[var(--marketing-text)]">
                      {item.question}
                    </h3>
                  </summary>
                  <div className="content-fold-body">
                    <p className="text-sm leading-7 text-[var(--marketing-muted)]">
                      {item.answer}
                    </p>
                  </div>
                </details>
              ))}
            </div>
          </div>
          <aside className="surface-panel-soft p-6">
            <h2 className="text-2xl font-black text-[var(--marketing-text)]">
              {text.related}
            </h2>
            <div className="mt-5 space-y-3">
              {content.relatedLinks.map((link) => (
                <Link
                  key={link.href}
                  href={buildLocalePath(link.href, forceLocale)}
              className="block rounded-2xl border border-white/10 bg-white/7 p-4 transition-colors hover:border-[var(--marketing-accent)]"
                >
                  <strong className="text-sm font-black text-[var(--marketing-text)]">
                    {link.label}
                  </strong>
                  <span className="mt-2 block text-sm leading-6 text-[var(--marketing-muted)]">
                    {link.description}
                  </span>
                </Link>
              ))}
            </div>
            <p className="mt-5 text-xs font-bold text-[var(--marketing-muted)]">
              {hubText[forceLocale].updatedLabel}:{" "}
              <time dateTime={topic.updatedAt}>{topic.updatedAt}</time>
            </p>
          </aside>
        </section>
      </Container>
    </main>
  );
}

function TopicContentFold({
  title,
  className,
  children,
}: React.PropsWithChildren<{
  title: string;
  className?: string;
}>) {
  return (
    <details className={`content-fold mt-8 ${className ?? ""}`}>
      <summary>
        <h2 className="text-2xl font-black text-[var(--marketing-text)]">
          {title}
        </h2>
      </summary>
      <div className="content-fold-body">{children}</div>
    </details>
  );
}
