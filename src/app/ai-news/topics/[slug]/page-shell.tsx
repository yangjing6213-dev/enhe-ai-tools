import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StructuredData } from "@/components/structured-data";
import { ContentlessState } from "@/components/redesign/contentless-state";
import { Badge, ButtonLink, Container, SectionTitle } from "@/components/ui";
import {
  aiNewsTopicSlugs,
  getAiNewsTopic,
  getAiNewsTopicCopy,
  getAiNewsTopicPath,
  type AiNewsTopic,
} from "@/lib/ai-news-topics";
import {
  buildLocalizedNewsSummary,
  buildLocalizedNewsTitle,
  resolveLocalizedNewsCategoryName,
} from "@/lib/ai-news-localization";
import { getDictionary, type Locale } from "@/lib/dictionaries";
import { buildCanonicalAiNewsPath } from "@/lib/public-slugs";
import {
  absoluteUrl,
  buildAvailableLanguageAlternates,
  buildBreadcrumbSchema,
  buildFaqSchema,
  buildLocalePath,
  buildMetadataTitle,
  buildPageMetadata,
  buildTopicMetaDescription,
} from "@/lib/seo";

export const aiNewsTopicPageRevalidate = 300;

export async function generateAiNewsTopicStaticParams() {
  if (!process.env.DATABASE_URL?.trim()) {
    return aiNewsTopicSlugs.map((slug) => ({ slug }));
  }

  const { getPublicAiNewsTopicSlugs } = await import("@/lib/public-content");
  const slugs = await getPublicAiNewsTopicSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateAiNewsTopicMetadata(
  forceLocale: Locale,
  slug: string,
): Promise<Metadata> {
  const isDbFreePreview = !process.env.DATABASE_URL?.trim();
  let topic;
  if (isDbFreePreview) {
    topic = getAiNewsTopic(slug);
  } else {
    const { getPublicAiNewsTopic } = await import("@/lib/public-content");
    topic = await getPublicAiNewsTopic(slug);
  }
  const t = getDictionary(forceLocale);

  if (isDbFreePreview) {
    const metadata = buildPageMetadata({
      title: t.aiNews.title,
      description: t.aiNews.dbFreeTopicMetaDescription,
      path: `/ai-news/topics/${slug}`,
      locale: forceLocale === "en" ? "en_US" : "zh_CN",
      localeKey: forceLocale,
      languageAlternates: buildAvailableLanguageAlternates(
        `/ai-news/topics/${slug}`,
        ["zh", "en"],
      ),
    });
    metadata.robots = { index: false, follow: true };
    return metadata;
  }

  if (!topic) {
    return buildPageMetadata({
      title: buildMetadataTitle({ pageTitle: t.aiNews.title, brand: t.brand }),
      description: t.aiNews.intro,
      path: `/ai-news/topics/${slug}`,
      locale: forceLocale === "en" ? "en_US" : "zh_CN",
      localeKey: forceLocale,
    });
  }

  const copy = getAiNewsTopicCopy(topic, forceLocale);
  return buildPageMetadata({
    title: buildMetadataTitle({
      pageTitle: copy.title,
      brand: t.brand,
      maxLength: forceLocale === "en" ? 58 : 60,
    }),
    description: buildTopicMetaDescription({
      title: copy.title,
      description: copy.description,
      locale: forceLocale,
      kind: "ai-news-topic",
    }),
    path: `/ai-news/topics/${topic.slug}`,
    locale: forceLocale === "en" ? "en_US" : "zh_CN",
    localeKey: forceLocale,
    languageAlternates: buildAvailableLanguageAlternates(
      `/ai-news/topics/${topic.slug}`,
      ["zh", "en"],
    ),
  });
}

export async function AiNewsTopicPageShell({
  slug,
  forceLocale,
}: {
  slug: string;
  forceLocale: Locale;
}) {
  const isDbFreePreview = !process.env.DATABASE_URL?.trim();
  let topic;
  if (isDbFreePreview) {
    topic = getAiNewsTopic(slug);
  } else {
    const { getPublicAiNewsTopic } = await import("@/lib/public-content");
    topic = await getPublicAiNewsTopic(slug);
  }
  if (!topic) notFound();

  const t = getDictionary(forceLocale);
  const copy = getAiNewsTopicCopy(topic, forceLocale);

  if (isDbFreePreview) {
    return (
      <ContentlessState
        locale={forceLocale}
        className="ai-news-page ai-news-workspace enhe-reference-workspace ai-news-topic-page"
        eyebrow={t.aiNews.title}
        title={copy.title}
        intro={
          forceLocale === "en"
            ? "The topic shell is ready while verified content is prepared."
            : "专题页面结构和导航已就绪，内容核验后再展示。"
        }
        statusLabel={forceLocale === "en" ? "Unverified" : "待核验"}
        railStatusText={
          forceLocale === "en"
            ? "Verified topic content is pending."
            : "专题内容等待核验。"
        }
        stateTitle={t.aiNews.dbFreeTopicPreviewLabel}
        statusText={t.aiNews.dbFreeTopicPreviewText}
        primaryAction={{
          href: buildLocalePath("/ai-news", forceLocale),
          label: t.aiNews.latestTitle,
        }}
      />
    );
  }

  const { filterAiNewsTopicArticles, getPublicNewsListing } = await import(
    "@/lib/public-content"
  );
  const relatedCandidates = await getPublicNewsListing({
    q: copy.searchQuery,
    sort: "latest",
    take: 24,
    locale: forceLocale,
  });
  const relatedArticles = filterAiNewsTopicArticles(
    relatedCandidates.articles,
    topic,
    forceLocale,
    6,
  );
  const breadcrumbSchema = buildBreadcrumbSchema({
    items: [
      { name: t.nav.home, path: buildLocalePath("/", forceLocale) },
      { name: t.aiNews.title, path: buildLocalePath("/ai-news", forceLocale) },
      {
        name: copy.title,
        path: getAiNewsTopicPath(topic.slug, forceLocale),
      },
    ],
  });
  const faqSchema = buildFaqSchema({ items: copy.faqs });
  const topicSchema = buildTopicCollectionSchema(topic, forceLocale);

  return (
    <main className="ai-news-page ai-news-workspace enhe-reference-workspace ai-news-topic-page">
      <Container className="ai-news-workspace-container py-14">
        <StructuredData data={[breadcrumbSchema, topicSchema, faqSchema]} />

        <section className="glass relative overflow-hidden rounded-[2rem] p-7 md:p-10">
          <div className="relative max-w-4xl">
            <Badge className="text-[var(--marketing-accent)]">
              AI News Topic
            </Badge>
            <h1 className="mt-6 text-4xl font-black leading-tight text-[var(--marketing-text)] md:text-6xl">
              {copy.title}
            </h1>
            <p className="mt-5 max-w-3xl text-base font-medium leading-8 text-[var(--marketing-muted)] md:text-lg">
              {copy.intro}
            </p>
          </div>
        </section>

        <section className="glass mt-8 rounded-2xl p-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--marketing-accent)]">
            {forceLocale === "en" ? "Key takeaway" : "核心结论"}
          </p>
          <h2 className="mt-4 text-2xl font-black text-[var(--marketing-text)]">
            {forceLocale === "en"
              ? "What this topic means"
              : "这个专题对你有什么用"}
          </h2>
          <p className="mt-4 max-w-4xl text-base leading-8 text-[var(--marketing-muted)]">
            {copy.answer}
          </p>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-8">
            <section>
              <SectionTitle
                title={
                  forceLocale === "en"
                    ? "Why it matters"
                    : "为什么值得关注"
                }
              />
              <div className="grid gap-4 md:grid-cols-3">
                {copy.whyItMatters.map((item) => (
                  <article
                    key={item}
                    className="surface-panel-soft p-5 text-sm leading-7 text-[var(--marketing-muted)]"
                  >
                    {item}
                  </article>
                ))}
              </div>
            </section>

            <section className="glass rounded-2xl p-6">
              <h2 className="text-2xl font-black text-[var(--marketing-text)]">
                {forceLocale === "en"
                  ? "Related ENHE AI paths"
                  : "站内下一步行动"}
              </h2>
              <div className="mt-5 flex flex-wrap gap-3">
                {copy.actionLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={buildLocalePath(item.href, forceLocale)}
              className="min-h-11 rounded-full border border-[var(--marketing-border)] bg-[var(--marketing-card-soft)] px-4 py-2 text-sm font-bold text-[var(--marketing-text)] transition-[border-color,color] hover:border-[var(--marketing-accent)] hover:text-[var(--marketing-accent)]"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </section>

            <section className="glass rounded-2xl p-6">
              <h2 className="text-2xl font-black text-[var(--marketing-text)]">
                FAQ
              </h2>
              <div className="mt-5 grid gap-4">
                {copy.faqs.map((item) => (
                  <article
                    key={item.question}
                    className="rounded-2xl border border-[var(--marketing-border)] bg-[var(--marketing-card-soft)] p-5"
                  >
                    <h3 className="text-base font-black text-[var(--marketing-text)]">
                      {item.question}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-[var(--marketing-muted)]">
                      {item.answer}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            <section>
              <SectionTitle
                title={
                  forceLocale === "en" ? "Related AI news" : "相关AI资讯"
                }
              />
              {relatedArticles.length ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {relatedArticles.map((article) => (
                    <Link
                      key={article.id}
                      href={buildCanonicalAiNewsPath(article, forceLocale)}
              className="surface-panel-soft block p-5 transition-colors hover:border-[var(--marketing-accent)]/45"
                    >
                      {article.category ? (
                        <Badge>
                          {resolveLocalizedNewsCategoryName(
                            article.category.name,
                            forceLocale,
                          )}
                        </Badge>
                      ) : null}
                      <h2 className="mt-4 break-words text-lg font-black leading-snug text-[var(--marketing-text)]">
                        {forceLocale === "en"
                          ? buildLocalizedNewsTitle(
                              {
                                title: article.title,
                                englishTitle: article.englishTitle,
                                categoryName: article.category?.name,
                              },
                              forceLocale,
                            )
                          : article.title}
                      </h2>
                      <p className="mt-3 break-words text-sm leading-7 text-[var(--marketing-muted)]">
                        {forceLocale === "en"
                          ? buildLocalizedNewsSummary(
                              {
                                title: article.title,
                                englishTitle: article.englishTitle,
                                summary: article.summary,
                                englishSummary: article.englishSummary,
                                description: article.description,
                                englishDescription: article.englishDescription,
                                categoryName: article.category?.name,
                              },
                              forceLocale,
                            )
                          : article.summary}
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="surface-panel-soft p-6">
                  <p className="text-sm leading-7 text-[var(--marketing-muted)]">
                    {forceLocale === "en"
                      ? "Related articles will appear here as the topic grows."
                      : "该专题下的相关文章会随着内容发布持续补充。"}
                  </p>
                </div>
              )}
            </section>
          </div>

          <section className="space-y-6 lg:sticky lg:top-28 lg:self-start" aria-label={t.aiNews.topicSupportLabel}>
            <section className="glass rounded-2xl p-5">
              <h2 className="text-lg font-black text-[var(--marketing-text)]">
                {forceLocale === "en" ? "Keywords" : "专题关键词"}
              </h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {copy.keywords.map((keyword) => (
                  <Link
                    key={keyword}
                    href={`${buildLocalePath("/ai-news", forceLocale)}?q=${encodeURIComponent(keyword)}`}
                  className="min-h-11 rounded-full border border-[var(--marketing-border)] bg-[var(--marketing-card-soft)] px-3 py-1 text-xs font-semibold text-[var(--marketing-muted)] transition-[border-color,color] hover:border-[var(--marketing-accent)] hover:text-[var(--marketing-accent)]"
                  >
                    {keyword}
                  </Link>
                ))}
              </div>
            </section>

            <section className="glass rounded-2xl p-5">
              <h2 className="text-lg font-black text-[var(--marketing-text)]">
                {forceLocale === "en" ? "Sources" : "参考来源"}
              </h2>
              <div className="mt-4 grid gap-3">
                {topic.sourceLinks.map((source) => (
                  <a
                    key={source.url}
                    href={source.url}
                    target="_blank"
                    rel="nofollow noopener noreferrer"
                  className="rounded-xl border border-[var(--marketing-border)] bg-[var(--marketing-card-soft)] p-4 text-sm font-semibold text-[var(--marketing-text)] transition-[border-color,color] hover:border-[var(--marketing-accent)]/45 hover:text-[var(--marketing-accent)]"
                  >
                    {source.title}
                  </a>
                ))}
              </div>
            </section>

            <ButtonLink
              href={buildLocalePath("/ai-news", forceLocale)}
              variant="ghost"
              className="w-full"
            >
              {t.aiNews.latestTitle}
            </ButtonLink>
          </section>
        </section>
      </Container>
    </main>
  );
}

function buildTopicCollectionSchema(topic: AiNewsTopic, locale: Locale) {
  const copy = getAiNewsTopicCopy(topic, locale);
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: copy.title,
    description: copy.description,
    url: absoluteUrl(getAiNewsTopicPath(topic.slug, locale)),
    inLanguage: locale === "en" ? "en-US" : "zh-CN",
    about: copy.keywords,
    citation: topic.sourceLinks.map((source) => ({
      "@type": "CreativeWork",
      name: source.title,
      url: source.url,
    })),
  };
}
