import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StructuredData } from "@/components/structured-data";
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
import { getPublicNewsListing } from "@/lib/public-content";
import {
  absoluteUrl,
  buildAvailableLanguageAlternates,
  buildBreadcrumbSchema,
  buildFaqSchema,
  buildLocalePath,
  buildMetadataTitle,
  buildPageMetadata,
} from "@/lib/seo";

export const aiNewsTopicPageRevalidate = 300;

export function generateAiNewsTopicStaticParams() {
  return aiNewsTopicSlugs.map((slug) => ({ slug }));
}

export async function generateAiNewsTopicMetadata(
  forceLocale: Locale,
  slug: string,
): Promise<Metadata> {
  const topic = getAiNewsTopic(slug);
  const t = getDictionary(forceLocale);
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
    description: copy.description,
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
  const topic = getAiNewsTopic(slug);
  if (!topic) notFound();

  const t = getDictionary(forceLocale);
  const copy = getAiNewsTopicCopy(topic, forceLocale);
  const related = await getPublicNewsListing({
    q: copy.searchQuery,
    sort: "latest",
    take: 6,
    locale: forceLocale,
  });
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
    <main>
      <Container className="py-14">
        <StructuredData data={[breadcrumbSchema, topicSchema, faqSchema]} />

        <section className="glass relative overflow-hidden rounded-[2rem] p-7 md:p-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(240,90,53,0.18),transparent_30%),radial-gradient(circle_at_80%_18%,rgba(122,167,255,0.14),transparent_34%)]" />
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
            {forceLocale === "en" ? "Extractable answer" : "可摘录答案"}
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
                    className="rounded-full border border-white/14 bg-white/7 px-4 py-2 text-sm font-bold text-[var(--marketing-text)] transition hover:border-[var(--marketing-accent)] hover:text-[var(--marketing-accent)]"
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
                    className="rounded-2xl border border-white/10 bg-white/7 p-5"
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
              {related.articles.length ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {related.articles.map((article) => (
                    <Link
                      key={article.id}
                      href={buildCanonicalAiNewsPath(article, forceLocale)}
                      className="surface-panel-soft block p-5 transition hover:border-[var(--marketing-accent)]/45"
                    >
                      {article.category ? (
                        <Badge>
                          {resolveLocalizedNewsCategoryName(
                            article.category.name,
                            forceLocale,
                          )}
                        </Badge>
                      ) : null}
                      <h2 className="mt-4 text-lg font-black leading-snug text-[var(--marketing-text)]">
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
                      <p className="mt-3 line-clamp-3 text-sm leading-7 text-[var(--marketing-muted)]">
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

          <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">
            <section className="glass rounded-2xl p-5">
              <h2 className="text-lg font-black text-[var(--marketing-text)]">
                {forceLocale === "en" ? "Keywords" : "专题关键词"}
              </h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {copy.keywords.map((keyword) => (
                  <Link
                    key={keyword}
                    href={`${buildLocalePath("/ai-news", forceLocale)}?q=${encodeURIComponent(keyword)}`}
                    className="rounded-full border border-white/14 bg-white/7 px-3 py-1 text-xs font-semibold text-[var(--marketing-muted)] transition hover:border-[var(--marketing-accent)] hover:text-[var(--marketing-accent)]"
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
                    className="rounded-xl border border-white/10 bg-white/7 p-4 text-sm font-semibold text-[var(--marketing-text)] transition hover:border-[var(--marketing-accent)]/45 hover:text-[var(--marketing-accent)]"
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
          </aside>
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
