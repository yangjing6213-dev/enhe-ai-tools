import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AiNewsInteractions } from "@/components/ai-news-interactions";
import { StructuredData } from "@/components/structured-data";
import { Badge, ButtonLink, Container, SectionTitle } from "@/components/ui";
import { ToolCard } from "@/components/tool-card";
import {
  buildAiNewsRelatedKeywords,
  buildAiNewsDescriptionFallback,
  buildAiNewsSerpTitle,
  extractNewsTableOfContents,
  isEnglishNewsArticleIndexable,
  mergeAiNewsRelatedItems,
  renderNewsContentBlocks,
  resolveAiNewsMetaDescription,
  resolveNewsVideo,
  toNewsIsoDate,
  type NewsContentBlock,
  type NewsInlinePart,
} from "@/lib/ai-news";
import {
  buildLocalizedNewsKeywordList,
  buildLocalizedNewsSummary,
  buildLocalizedNewsTitle,
  buildLocalizedTutorialPreviewTitle,
  buildLocalizedTutorialPreviewToolName,
  resolveLocalizedNewsCategoryName,
  resolveLocalizedNewsTagName,
} from "@/lib/ai-news-localization";
import { prisma } from "@/lib/db";
import { getDictionary, type Locale } from "@/lib/dictionaries";
import { normalizeImageSrc } from "@/lib/media";
import {
  getPublicNewsArticleBySlug,
  resolvePublicNewsArticleSlug,
} from "@/lib/public-content";
import {
  buildCanonicalAiNewsPath,
  buildCanonicalToolPath,
  getCanonicalAiNewsSlug,
} from "@/lib/public-slugs";
import { publicPageCacheSeconds } from "@/lib/public-routes";
import {
  absoluteUrl,
  buildBreadcrumbSchema,
  buildAvailableLanguageAlternates,
  buildLocalePath,
  buildMetadataTitle,
  buildOrganizationSchema,
  buildPageMetadata,
  siteName,
} from "@/lib/seo";

type NewsArticle = NonNullable<
  Awaited<ReturnType<typeof getPublicNewsArticleBySlug>>
>;

export const aiNewsDetailPageRevalidate = publicPageCacheSeconds;

export async function generateAiNewsDetailPageMetadata(
  forceLocale: Locale,
  slug: string,
): Promise<Metadata> {
  const t = getDictionary(forceLocale);
  const slugMatch = await resolvePublicNewsArticleSlug(slug);
  const article = slugMatch
    ? await getPublicNewsArticleBySlug(slugMatch.slug)
    : null;
  const canonicalSlug = slugMatch?.canonicalSlug ?? slug;
  if (!article) {
    return buildPageMetadata({
      title: buildMetadataTitle({ pageTitle: t.aiNews.title, brand: t.brand }),
      description: t.aiNews.intro,
      path: `/ai-news/${canonicalSlug}`,
      locale: forceLocale === "en" ? "en_US" : "zh_CN",
      localeKey: forceLocale,
    });
  }

  const localized = localizeArticle(article, forceLocale);
  const hasIndexableEnglishPage = isEnglishNewsArticleIndexable(article);
  const metadata = buildPageMetadata({
    title: buildMetadataTitle({
      pageTitle: buildAiNewsSerpTitle({
        title: localized.title,
        categoryName: article.category?.name,
        locale: forceLocale,
        maxLength: forceLocale === "en" ? 58 : 60,
      }),
      brand: t.brand,
      maxLength: forceLocale === "en" ? 58 : 60,
    }),
    description: localized.description,
    path: `/ai-news/${canonicalSlug}`,
    image: normalizeImageSrc(article.coverImage),
    locale: forceLocale === "en" ? "en_US" : "zh_CN",
    localeKey: forceLocale,
    type: "article",
    languageAlternates: buildAvailableLanguageAlternates(
      `/ai-news/${canonicalSlug}`,
      hasIndexableEnglishPage ? ["zh", "en"] : ["zh"],
    ),
  });

  if (forceLocale === "en" && !hasIndexableEnglishPage) {
    metadata.robots = {
      index: false,
      follow: true,
    };
  }

  return metadata;
}

export async function AiNewsDetailPageShell({
  slug,
  forceLocale,
}: {
  slug: string;
  forceLocale: Locale;
}) {
  const slugMatch = await resolvePublicNewsArticleSlug(slug);
  if (!slugMatch) notFound();

  const article = await getPublicNewsArticleBySlug(slugMatch.slug);
  if (!article) notFound();

  const canonicalSlug = getCanonicalAiNewsSlug(article);
  if (slug !== canonicalSlug) {
    redirect(buildCanonicalAiNewsPath(article, forceLocale));
  }

  const t = getDictionary(forceLocale);
  const localized = localizeArticle(article, forceLocale);
  const coverImage = normalizeImageSrc(article.coverImage);
  const publishedAt = article.publishedAt ?? article.createdAt;
  const toc = extractNewsTableOfContents(localized.content);
  const contentBlocks = renderNewsContentBlocks(localized.content);
  const articleVideo = resolveNewsVideo(article, localized.title);
  const relatedKeywords = buildAiNewsRelatedKeywords({
    title: article.title,
    keywords: article.keywords,
    seoKeywords: article.seoKeywords,
    categoryName: article.category?.name,
    tagNames: article.tagLinks.map(({ tag }) => tag.name),
  });
  const [relatedTools, relatedTutorials, relatedArticles] = await Promise.all([
    getRelatedTools(article.relatedToolIds, relatedKeywords),
    getRelatedTutorials(article.relatedTutorialIds, relatedKeywords),
    getRelatedNewsArticles(article, relatedKeywords),
  ]);
  const breadcrumbSchema = buildBreadcrumbSchema({
    items: [
      { name: t.nav.home, path: buildLocalePath("/", forceLocale) },
      { name: t.aiNews.title, path: buildLocalePath("/ai-news", forceLocale) },
      {
        name: localized.title,
        path: buildCanonicalAiNewsPath(article, forceLocale),
      },
    ],
  });
  const newsArticleSchema = buildNewsArticleSchema(
    article,
    localized,
    forceLocale,
    coverImage,
  );
  const organizationSchema = buildOrganizationSchema({
    name: t.brand,
    logo: "/images/brand/enhe-icon-gradient-white-bg-cropped.png",
    url: absoluteUrl(buildLocalePath("/", forceLocale)),
  });

  return (
    <Container className="py-14">
      <StructuredData
        data={[breadcrumbSchema, organizationSchema, newsArticleSchema]}
      />
      <article>
        <section className="glass overflow-hidden rounded-[2rem] p-5 md:p-8">
          <div className="flex flex-wrap gap-2">
            {article.category ? (
              <Badge>
                {resolveLocalizedNewsCategoryName(
                  article.category.name,
                  forceLocale,
                )}
              </Badge>
            ) : null}
            {article.isPinned || article.isFeatured ? (
              <Badge className="text-[var(--marketing-accent)]">
                {t.aiNews.featured}
              </Badge>
            ) : null}
            {article.tagLinks.map(({ tag }) => (
              <Badge key={tag.id}>
                {resolveLocalizedNewsTagName(tag.name, forceLocale) || tag.name}
              </Badge>
            ))}
          </div>
          <h1 className="mt-6 max-w-5xl text-4xl font-black leading-tight text-[var(--marketing-text)] md:text-6xl">
            {localized.title}
          </h1>
          {localized.subtitle ? (
            <p className="mt-5 max-w-3xl text-lg font-medium leading-8 text-[var(--marketing-muted)]">
              {localized.subtitle}
            </p>
          ) : null}
          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[var(--marketing-muted)]">
            <span>{article.author || "ENHE AI"}</span>
            <time dateTime={toNewsIsoDate(publishedAt)}>
              {formatDate(publishedAt, forceLocale)}
            </time>
            <span>{article.readingTime} min</span>
            <span>{article.viewCount} views</span>
          </div>
          {coverImage ? (
            <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-2xl border border-white/12 bg-white/6">
              <Image
                src={coverImage}
                alt={localized.title}
                fill
                className="object-cover"
                sizes="(min-width: 1024px) 1120px, 100vw"
                unoptimized
              />
            </div>
          ) : null}
        </section>

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <main className="space-y-8">
            <section className="glass rounded-2xl p-6">
              <h2 className="text-xl font-black text-[var(--marketing-text)]">
                {t.aiNews.keyTakeaways}
              </h2>
              <p className="mt-4 text-base leading-8 text-[var(--marketing-muted)]">
                {localized.summary}
              </p>
              {localized.keyTakeaways.length ? (
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {localized.keyTakeaways.map((item) => (
                    <div
                      key={item}
                      className="rounded-xl border border-white/10 bg-white/7 p-4 text-sm leading-6 text-[var(--marketing-text)]"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              ) : null}
            </section>

            <section className="glass rounded-2xl p-6">
              <NewsContent blocks={contentBlocks} />
            </section>

            {articleVideo ? (
              <section className="glass rounded-2xl p-6">
                <h2 className="text-2xl font-black text-[var(--marketing-text)]">
                  {articleVideo.title}
                </h2>
                {articleVideo.description ? (
                  <p className="mt-4 text-base leading-8 text-[var(--marketing-muted)]">
                    {articleVideo.description}
                  </p>
                ) : null}
                <a
                  href={articleVideo.url}
                  target="_blank"
                  rel="nofollow noopener noreferrer"
                  className="mt-5 inline-flex break-all rounded-xl border border-[var(--marketing-accent)]/40 px-4 py-3 text-sm font-bold text-[var(--marketing-accent)] transition hover:border-[var(--marketing-accent)]"
                >
                  {articleVideo.url}
                </a>
              </section>
            ) : null}

            {localized.impactNotes ? (
              <section className="glass rounded-2xl p-6">
                <h2 className="text-2xl font-black text-[var(--marketing-text)]">
                  {t.aiNews.impactTitle}
                </h2>
                <p className="mt-4 whitespace-pre-line text-base leading-8 text-[var(--marketing-muted)]">
                  {localized.impactNotes}
                </p>
              </section>
            ) : null}

            {relatedTools.length ? (
              <section>
                <SectionTitle title={t.aiNews.relatedTools} />
                <div className="grid gap-5 md:grid-cols-3">
                  {relatedTools.map((tool) => (
                    <ToolCard key={tool.id} tool={tool} locale={forceLocale} />
                  ))}
                </div>
              </section>
            ) : null}

            {relatedTutorials.length ? (
              <section className="glass rounded-2xl p-6">
                <h2 className="text-2xl font-black text-[var(--marketing-text)]">
                  {t.aiNews.relatedTutorials}
                </h2>
                <div className="mt-5 grid gap-3">
                  {relatedTutorials.map((tutorial) => (
                    <Link
                      key={tutorial.id}
                      href={buildCanonicalToolPath(tutorial.tool, forceLocale)}
                      className="rounded-xl border border-white/10 bg-white/7 p-4 transition hover:border-[var(--marketing-accent)]/45"
                    >
                      <p className="font-semibold text-[var(--marketing-text)]">
                        {buildLocalizedTutorialPreviewTitle(
                          tutorial.title,
                          tutorial.tool,
                          forceLocale,
                        )}
                      </p>
                      <p className="mt-2 text-sm text-[var(--marketing-muted)]">
                        {buildLocalizedTutorialPreviewToolName(
                          tutorial.tool,
                          forceLocale,
                        )}
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            {relatedArticles.length ? (
              <section className="glass rounded-2xl p-6">
                <h2 className="text-2xl font-black text-[var(--marketing-text)]">
                  {t.aiNews.relatedNews}
                </h2>
                <div className="mt-5 grid gap-3">
                  {relatedArticles.map((item) => (
                    <Link
                      key={item.id}
                      href={buildCanonicalAiNewsPath(item, forceLocale)}
                      className="rounded-xl border border-white/10 bg-white/7 p-4 transition hover:border-[var(--marketing-accent)]/45"
                    >
                      <p className="font-semibold text-[var(--marketing-text)]">
                        {forceLocale === "en"
                          ? buildLocalizedNewsTitle(
                              {
                                title: item.title,
                                englishTitle: item.englishTitle,
                                categoryName: item.category?.name,
                              },
                              forceLocale,
                            )
                          : item.title}
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--marketing-muted)]">
                        {forceLocale === "en"
                          ? buildLocalizedNewsSummary(
                              {
                                title: item.title,
                                englishTitle: item.englishTitle,
                                summary: item.summary,
                                englishSummary: item.englishSummary,
                                description: item.description,
                                englishDescription: item.englishDescription,
                                categoryName: item.category?.name,
                              },
                              forceLocale,
                            )
                          : item.summary}
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            {localized.conclusion ? (
              <section className="glass rounded-2xl p-6">
                <h2 className="text-2xl font-black text-[var(--marketing-text)]">
                  {t.aiNews.conclusion}
                </h2>
                <p className="mt-4 whitespace-pre-line text-base leading-8 text-[var(--marketing-muted)]">
                  {localized.conclusion}
                </p>
              </section>
            ) : null}

            {article.externalSources.length ? (
              <section className="glass rounded-2xl p-6">
                <h2 className="text-2xl font-black text-[var(--marketing-text)]">
                  {t.aiNews.sources}
                </h2>
                <div className="mt-5 grid gap-3">
                  {article.externalSources.map((source) => (
                    <a
                      key={source.id}
                      href={source.url}
                      target="_blank"
                      rel="nofollow noopener noreferrer"
                      className="rounded-xl border border-white/10 bg-white/7 p-4 transition hover:border-[var(--marketing-accent)]/45"
                    >
                      <p className="font-semibold text-[var(--marketing-text)]">
                        {source.title}
                      </p>
                      {source.description ? (
                        <p className="mt-2 text-sm leading-6 text-[var(--marketing-muted)]">
                          {source.description}
                        </p>
                      ) : null}
                    </a>
                  ))}
                </div>
              </section>
            ) : null}

            <AiNewsInteractions
              slug={canonicalSlug}
              labels={{
                like: t.aiNews.like,
                favorite: t.aiNews.favorite,
                share: t.aiNews.share,
                copyLink: t.aiNews.copyLink,
                backToTop: t.aiNews.backToTop,
                loginRequired: t.aiNews.loginRequired,
              }}
            />
          </main>

          <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
            <section className="glass rounded-2xl p-5">
              <h2 className="text-lg font-black text-[var(--marketing-text)]">
                {t.aiNews.tableOfContents}
              </h2>
              <div className="mt-4 grid gap-2">
                {toc.length ? (
                  toc.map((item) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className={`rounded-lg px-3 py-2 text-sm transition hover:bg-white/8 hover:text-[var(--marketing-accent)] ${item.level === 3 ? "ml-4 text-[var(--marketing-muted)]" : "text-[var(--marketing-text)]"}`}
                    >
                      {item.title}
                    </a>
                  ))
                ) : (
                  <p className="text-sm text-[var(--marketing-muted)]">
                    {localized.title}
                  </p>
                )}
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
        </div>
      </article>
    </Container>
  );
}

function localizeArticle(article: NewsArticle, locale: Locale) {
  if (locale === "en") {
    const summary =
      article.englishSummary ||
      buildLocalizedNewsSummary(
        {
          title: article.title,
          englishTitle: article.englishTitle,
          summary: article.summary,
          englishSummary: article.englishSummary,
          description: article.description,
          englishDescription: article.englishDescription,
          categoryName: article.category?.name,
        },
        "en",
      );

    return {
      title: buildLocalizedNewsTitle(
        {
          title: article.title,
          englishTitle: article.englishTitle,
          categoryName: article.category?.name,
        },
        "en",
      ),
      subtitle: article.englishSubtitle || article.subtitle,
      description: resolveAiNewsMetaDescription(
        [
          article.englishSeoDescription,
          article.englishSummary,
          article.englishDescription,
          article.seoDescription,
          article.summary,
          article.description,
        ],
        buildAiNewsDescriptionFallback({
          title: article.englishTitle || article.title,
          categoryName: article.category?.name,
          locale: "en",
        }),
      ),
      summary,
      content: article.englishContent || article.content,
      keyTakeaways: article.englishKeyTakeaways.length
        ? article.englishKeyTakeaways
        : article.keyTakeaways,
      impactNotes: article.englishImpactNotes || article.impactNotes,
      conclusion: article.englishConclusion || article.conclusion,
    };
  }

  return {
    title: article.title,
    subtitle: article.subtitle,
    description: resolveAiNewsMetaDescription(
      [article.seoDescription, article.summary, article.description],
      buildAiNewsDescriptionFallback({
        title: article.title,
        categoryName: article.category?.name,
        locale: "zh",
      }),
    ),
    summary: article.summary,
    content: article.content,
    keyTakeaways: article.keyTakeaways,
    impactNotes: article.impactNotes,
    conclusion: article.conclusion,
  };
}

function NewsContent({ blocks }: { blocks: NewsContentBlock[] }) {
  return (
    <div className="space-y-5">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          const Tag = block.level === 2 ? "h2" : "h3";
          return (
            <Tag
              key={`${block.id}-${index}`}
              id={block.id}
              className={
                block.level === 2
                  ? "scroll-mt-28 text-2xl font-black text-[var(--marketing-text)]"
                  : "scroll-mt-28 text-xl font-bold text-[var(--marketing-text)]"
              }
              dangerouslySetInnerHTML={{ __html: block.text }}
            />
          );
        }

        if (block.type === "list") {
          const Tag = block.ordered ? "ol" : "ul";
          return (
            <Tag
              key={index}
              className={`space-y-2 pl-5 text-base leading-8 text-[var(--marketing-muted)] ${block.ordered ? "list-decimal" : "list-disc"}`}
            >
              {block.items.map((item) => (
                <li
                  key={
                    typeof item === "string"
                      ? item
                      : item.parts.map((part) => part.text).join("")
                  }
                >
                  {typeof item === "string" ? (
                    <span dangerouslySetInnerHTML={{ __html: item }} />
                  ) : (
                    <InlineParts parts={item.parts} />
                  )}
                </li>
              ))}
            </Tag>
          );
        }

        if (block.type === "quote") {
          return (
            <blockquote
              key={index}
              className="rounded-2xl border border-[var(--marketing-accent)]/25 bg-[var(--marketing-accent)]/8 p-5 text-base leading-8 text-[var(--marketing-text)]"
              dangerouslySetInnerHTML={{ __html: block.text }}
            />
          );
        }

        if (block.type === "image") {
          return (
            <figure
              key={`${block.src}-${index}`}
              className="overflow-hidden rounded-2xl border border-white/10 bg-white/6"
            >
              <Image
                src={block.src}
                alt={block.alt}
                width={1200}
                height={675}
                className="aspect-[16/9] w-full object-cover"
                unoptimized
              />
              {block.caption ? (
                <figcaption
                  className="px-4 py-3 text-sm leading-6 text-[var(--marketing-muted)]"
                  dangerouslySetInnerHTML={{ __html: block.caption }}
                />
              ) : null}
            </figure>
          );
        }

        if (block.type === "code") {
          return (
            <pre
              key={index}
              className="overflow-x-auto rounded-2xl border border-white/10 bg-[#05070B] p-4 text-sm leading-6 text-[#C5D0E2]"
            >
              <code>{block.code}</code>
            </pre>
          );
        }

        return (
          <p
            key={index}
            className="text-base leading-8 text-[var(--marketing-muted)]"
          >
            {block.parts ? (
              <InlineParts parts={block.parts} />
            ) : (
              <span dangerouslySetInnerHTML={{ __html: block.text ?? "" }} />
            )}
          </p>
        );
      })}
    </div>
  );
}

function InlineParts({ parts }: { parts: NewsInlinePart[] }) {
  return (
    <>
      {parts.map((part, index) => {
        if (part.type === "link") {
          return (
            <Link
              key={`${part.href}-${index}`}
              href={part.href}
              className="font-semibold text-[var(--marketing-accent)] underline decoration-[var(--marketing-accent)]/35 underline-offset-4 transition hover:decoration-[var(--marketing-accent)]"
            >
              <span dangerouslySetInnerHTML={{ __html: part.text }} />
            </Link>
          );
        }

        return (
          <span
            key={`${part.text}-${index}`}
            dangerouslySetInnerHTML={{ __html: part.text }}
          />
        );
      })}
    </>
  );
}

function buildKeywordContainsOr(keywords: string[], fields: string[]) {
  return keywords.flatMap((keyword) =>
    fields.map((field) => ({
      [field]: { contains: keyword, mode: "insensitive" as const },
    })),
  );
}

function buildToolKeywordOr(keywords: string[]) {
  return [
    ...buildKeywordContainsOr(keywords, [
      "name",
      "englishName",
      "shortDescription",
      "content",
    ]),
    ...keywords.map((keyword) => ({
      category: { name: { contains: keyword, mode: "insensitive" as const } },
    })),
    ...keywords.map((keyword) => ({
      tagLinks: {
        some: {
          tag: { name: { contains: keyword, mode: "insensitive" as const } },
        },
      },
    })),
  ];
}

function buildTutorialKeywordOr(keywords: string[]) {
  return [
    ...buildKeywordContainsOr(keywords, [
      "title",
      "content",
      "notes",
      "commonErrors",
    ]),
    ...keywords.flatMap((keyword) => [
      { tool: { name: { contains: keyword, mode: "insensitive" as const } } },
      {
        tool: {
          englishName: { contains: keyword, mode: "insensitive" as const },
        },
      },
      {
        tool: {
          shortDescription: { contains: keyword, mode: "insensitive" as const },
        },
      },
      {
        tool: {
          category: {
            name: { contains: keyword, mode: "insensitive" as const },
          },
        },
      },
    ]),
  ];
}

function buildNewsKeywordOr(keywords: string[]) {
  return [
    ...buildKeywordContainsOr(keywords, [
      "title",
      "subtitle",
      "summary",
      "description",
      "keywords",
      "seoTitle",
      "seoDescription",
      "seoKeywords",
      "englishTitle",
      "englishSummary",
      "englishKeywords",
      "englishSeoKeywords",
    ]),
    ...keywords.map((keyword) => ({
      category: { name: { contains: keyword, mode: "insensitive" as const } },
    })),
    ...keywords.map((keyword) => ({
      tagLinks: {
        some: {
          tag: { name: { contains: keyword, mode: "insensitive" as const } },
        },
      },
    })),
  ];
}

async function getRelatedTools(ids: string[], keywords: string[]) {
  const include = {
    category: true,
    priceSpecs: {
      where: { status: "active" as const },
      orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }],
    },
  };
  const [explicit, keywordMatched, fallback] = await Promise.all([
    ids.length
      ? prisma.tool.findMany({
          where: { id: { in: ids }, status: "published" },
          include,
          take: 3,
        })
      : Promise.resolve([]),
    keywords.length
      ? prisma.tool.findMany({
          where: { status: "published", OR: buildToolKeywordOr(keywords) },
          include,
          orderBy: [
            { isHomeRecommended: "desc" },
            { sortOrder: "asc" },
            { createdAt: "desc" },
          ],
          take: 6,
        })
      : Promise.resolve([]),
    prisma.tool.findMany({
      where: { status: "published" },
      include,
      orderBy: [
        { isHomeRecommended: "desc" },
        { sortOrder: "asc" },
        { createdAt: "desc" },
      ],
      take: 6,
    }),
  ]);

  return mergeAiNewsRelatedItems([explicit, keywordMatched, fallback], 3);
}

async function getRelatedTutorials(ids: string[], keywords: string[]) {
  const [explicit, keywordMatched, fallback] = await Promise.all([
    ids.length
      ? prisma.tutorial.findMany({
          where: {
            id: { in: ids },
            status: "active",
            tool: { status: "published" },
          },
          include: { tool: true },
          take: 3,
        })
      : Promise.resolve([]),
    keywords.length
      ? prisma.tutorial.findMany({
          where: {
            status: "active",
            tool: { status: "published" },
            OR: buildTutorialKeywordOr(keywords),
          },
          include: { tool: true },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
          take: 6,
        })
      : Promise.resolve([]),
    prisma.tutorial.findMany({
      where: { status: "active", tool: { status: "published" } },
      include: { tool: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      take: 6,
    }),
  ]);

  return mergeAiNewsRelatedItems([explicit, keywordMatched, fallback], 3);
}

async function getRelatedNewsArticles(
  article: NewsArticle,
  keywords: string[],
) {
  const explicit = article.relatedArticleIds.length
    ? await prisma.newsArticle.findMany({
        where: { id: { in: article.relatedArticleIds }, status: "published" },
        include: { category: true, tagLinks: { include: { tag: true } } },
        take: 6,
      })
    : [];

  const [keywordMatched, categoryFallback, latestFallback] = await Promise.all([
    keywords.length
      ? prisma.newsArticle.findMany({
          where: {
            status: "published",
            id: { not: article.id },
            OR: buildNewsKeywordOr(keywords),
          },
          include: { category: true, tagLinks: { include: { tag: true } } },
          orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }],
          take: 6,
        })
      : Promise.resolve([]),
    article.categoryId
      ? prisma.newsArticle.findMany({
          where: {
            status: "published",
            id: { not: article.id },
            categoryId: article.categoryId,
          },
          include: { category: true, tagLinks: { include: { tag: true } } },
          orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }],
          take: 6,
        })
      : Promise.resolve([]),
    prisma.newsArticle.findMany({
      where: {
        status: "published",
        id: { not: article.id },
      },
      include: { category: true, tagLinks: { include: { tag: true } } },
      orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }],
      take: 6,
    }),
  ]);

  return mergeAiNewsRelatedItems(
    [explicit, keywordMatched, categoryFallback, latestFallback],
    6,
  );
}

function buildNewsArticleSchema(
  article: NewsArticle,
  localized: ReturnType<typeof localizeArticle>,
  locale: Locale,
  coverImage: string | null,
) {
  const url = absoluteUrl(buildCanonicalAiNewsPath(article, locale));
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: localized.title,
    description: localized.description,
    url,
    inLanguage: locale === "en" ? "en-US" : "zh-CN",
    datePublished: toNewsIsoDate(article.publishedAt ?? article.createdAt),
    dateModified: toNewsIsoDate(article.updatedAt),
    author: {
      "@type": "Person",
      name: article.author || siteName,
    },
    publisher: {
      "@type": "Organization",
      name: siteName,
    },
    ...(coverImage ? { image: [absoluteUrl(coverImage)] } : {}),
    keywords:
      buildLocalizedNewsKeywordList(
        {
          keywords: article.keywords,
          seoKeywords: article.seoKeywords,
          englishKeywords: article.englishKeywords,
          englishSeoKeywords: article.englishSeoKeywords,
          categoryName: article.category?.name,
          tagNames: article.tagLinks.map(({ tag }) => tag.name),
        },
        locale,
      ).join(", ") || undefined,
  };
}

function formatDate(value: Date | string, locale: Locale) {
  return new Date(value).toLocaleDateString(
    locale === "en" ? "en-US" : "zh-CN",
  );
}
