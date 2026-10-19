import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AiNewsListing } from "@/components/ai-news-listing";
import { PageCover } from "@/components/page-cover";
import { StructuredData } from "@/components/structured-data";
import { ContentlessState } from "@/components/redesign/contentless-state";
import {
  ButtonLink,
  Container,
} from "@/components/ui";
import {
  getNewsPageCount,
  getNewsPaginationLocales,
  hasActiveNewsFilters,
  isNewsPaginationPageInRange,
  isNewsPaginationPageQueryable,
  parseNewsSearchParams,
} from "@/lib/ai-news";
import { deduplicateNewsArticles, toNewsListingCards } from "@/lib/ai-news-listing";
import {
  getAiNewsTopicCopy,
  getAiNewsTopicPath,
} from "@/lib/ai-news-topics";
import {
  buildLocalizedNewsTitle,
  localizeAiNewsDiscoveryLabel,
  resolveLocalizedNewsCategoryName,
  resolveLocalizedNewsTagName,
} from "@/lib/ai-news-localization";
import { getDictionary, type Locale } from "@/lib/dictionaries";
import { buildCanonicalAiNewsPath } from "@/lib/public-slugs";
import {
  getPublicAiNewsDiscovery,
  getPublicAiNewsTopics,
  getPublicNewsCategories,
  getPublicNewsListing,
  getPublicNewsTags,
  type PublicNewsListingFilters,
} from "@/lib/public-content";
import { publicPageCacheSeconds } from "@/lib/public-routes";
import {
  absoluteUrl,
  buildBreadcrumbSchema,
  buildListingMetadataTitle,
  buildFaqSchema,
  buildAvailableLanguageAlternates,
  buildListingMetaDescription,
  buildLocalePath,
  buildMetadataTitle,
  buildPageMetadata,
} from "@/lib/seo";

type NewsCardArticle = Awaited<
  ReturnType<typeof getPublicNewsListing>
>["articles"][number];
type KeywordCloudItem = Awaited<
  ReturnType<typeof getPublicAiNewsDiscovery>
>["keywordCloudItems"][number];
type TopicCollectionItem = Awaited<
  ReturnType<typeof getPublicAiNewsDiscovery>
>["topicCollectionItems"][number];

export const aiNewsPageRevalidate = publicPageCacheSeconds;

type AiNewsPageSearchParams = Record<string, string | undefined>;

const aiNewsFilterParamNames = ["q", "category", "tag", "sort"] as const;

export function buildAiNewsLanguageHrefs(
  searchParams: AiNewsPageSearchParams,
  pageOverride?: number,
) {
  const path =
    pageOverride && pageOverride > 1
      ? `/ai-news/page/${pageOverride}`
      : "/ai-news";
  const query = new URLSearchParams();

  for (const name of aiNewsFilterParamNames) {
    const value = String(searchParams[name] ?? "").trim();
    if (value) query.set(name, value);
  }

  if (!pageOverride) {
    const queryPage = Number.parseInt(String(searchParams.page ?? ""), 10);
    if (Number.isSafeInteger(queryPage) && queryPage > 1) {
      query.set("page", String(queryPage));
    }
  }

  const queryString = query.toString();
  const buildHref = (locale: Locale) => {
    const href = buildLocalePath(path, locale);
    return queryString ? `${href}?${queryString}` : href;
  };

  return {
    zh: buildHref("zh"),
    en: buildHref("en"),
  };
}

function getAiNewsPageNumber(searchParams: AiNewsPageSearchParams) {
  return Math.max(
    1,
    Number.parseInt(String(searchParams.page ?? "1"), 10) || 1,
  );
}

function hasAiNewsFilters(searchParams: AiNewsPageSearchParams) {
  return aiNewsFilterParamNames.some((name) =>
    Boolean(String(searchParams[name] ?? "").trim()),
  );
}

export function getAiNewsPageOneRedirectPath(
  searchParams: AiNewsPageSearchParams,
  locale: Locale,
) {
  if (String(searchParams.page ?? "").trim() !== "1") return null;

  const query = new URLSearchParams();
  for (const [name, value] of Object.entries(searchParams)) {
    const normalizedValue = String(value ?? "").trim();
    if (name === "page" || !normalizedValue) continue;
    query.set(name, normalizedValue);
  }

  const basePath = buildLocalePath("/ai-news", locale);
  const queryString = query.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}

const aiNewsGeoSections = {
  zh: [
    {
      title: "AI资讯对用户有什么用",
      body: "AI前沿资讯不只是新闻列表，而是帮助用户判断一个模型、工具、政策或平台变化是否会影响自己的创作、运营、学习和工作流。每条高价值信息都应回答发生了什么、为什么重要、下一步能做什么。",
    },
    {
      title: "如何从资讯找到行动方向",
      body: "阅读资讯后，可以把信息拆成三类行动：需要关注的趋势、可以试用的软件、值得学习的技能。这样新闻不会停留在围观层面，而是转化为工具选择、课程学习或本地部署计划。",
    },
    {
      title: "如何判断信息可信度",
      body: "优先查看有来源链接、发布时间、相关工具或教程关联的内容。对于AI平台政策、账号订阅、模型能力和合规变化，应结合官方来源与站内解读，不把未经验证的传闻当作决策依据。",
    },
  ],
  en: [
    {
      title: "What AI news does for users",
      body: "AI news should help users decide whether a model, tool, policy, or platform change affects their creative work, operations, learning, or workflows. Useful news explains what happened, why it matters, and what to do next.",
    },
    {
      title: "How to turn news into action",
      body: "After reading an article, convert the signal into one of three actions: watch the trend, test a software app, or learn a related skill. This turns news into practical decisions.",
    },
    {
      title: "How to judge source quality",
      body: "Prefer articles with source links, publication dates, related tools, and related tutorials. For platform policy, account subscription, model capability, and compliance changes, verify against official sources.",
    },
  ],
} as const;

const aiNewsAnswerBlock = {
  zh: "ENHE AI 的 AI前沿资讯重点不是追热点，而是把 AI智能体、MCP 工具生态、本地 AI、开源模型、平台政策和实用工具变化解释成可执行的下一步：关注趋势、选择软件、学习技能或确认账号服务边界。",
  en: "ENHE AI news is not a raw headline feed. It turns changes in AI agents, MCP-style tool ecosystems, local AI, open models, platform policy, and practical AI tools into clear next steps: watch the trend, choose software, learn a skill, or check account-service boundaries.",
} as const;

const aiNewsFaqItems = {
  zh: [
    {
      question: "ENHE AI 的 AI前沿资讯和普通 AI 新闻有什么不同？",
      answer:
        "ENHE AI 更关注新闻对用户工作流的影响。每条高价值资讯都应解释发生了什么、为什么重要、用户下一步能做什么，并自然连接到相关软件、教程、课程或账号服务说明。",
    },
    {
      question: "阅读 AI 资讯后应该如何行动？",
      answer:
        "先判断这条资讯属于趋势、工具、政策还是教程，再进入 AI趋势分析、AI软件应用、AI技能学习或 AI账号服务页面，形成明确的试用、学习或合规确认路径。",
    },
    {
      question: "AI 资讯内容如何提高 SEO 和 GEO 表现？",
      answer:
        "资讯页面需要清晰标题、摘要、发布时间、来源链接、FAQ、相关工具和站内内链。这样既方便真实用户阅读，也方便 AI 搜索系统抽取和引用。",
    },
  ],
  en: [
    {
      question: "How is ENHE AI news different from a generic AI news feed?",
      answer:
        "ENHE AI focuses on how news affects real workflows. A useful article explains what changed, why it matters, what users can do next, and which related software, tutorials, courses, or account guidance can help.",
    },
    {
      question: "What should users do after reading an AI news article?",
      answer:
        "Classify the update as a trend, tool, policy, or tutorial signal, then move to AI trends, software apps, skill learning, or account-service guidance for the next action.",
    },
    {
      question: "How does AI news improve SEO and GEO visibility?",
      answer:
        "News pages should include clear titles, summaries, dates, source links, FAQ, related tools, and internal links. This helps both human readers and AI answer engines extract and cite the content.",
    },
  ],
} as const;

export async function generateAiNewsPageMetadata(
  forceLocale: Locale,
  searchParams: Promise<Record<string, string | undefined>> = Promise.resolve({}),
  pageOverride?: number,
): Promise<Metadata> {
  const t = getDictionary(forceLocale);
  const params = await searchParams;
  const filters = parseNewsSearchParams({
    ...params,
    ...(pageOverride ? { page: String(pageOverride) } : {}),
  });
  if (!isNewsPaginationPageQueryable(filters.page)) notFound();
  const isFiltered = hasActiveNewsFilters(filters);
  const isDbFreeMode = !process.env.DATABASE_URL?.trim();
  const canonicalPath = isFiltered
    ? "/ai-news"
    : filters.page > 1
      ? `/ai-news/page/${filters.page}`
      : "/ai-news";
  const pageLabel =
    forceLocale === "en" ? `Page ${filters.page}` : `第${filters.page}页`;
  const baseDescription = buildListingMetaDescription("ai-news", forceLocale);
  const languageLocales =
    isDbFreeMode
      ? (['zh', 'en'] as const)
      : !isFiltered && forceLocale === "zh" && filters.page > 1
      ? getNewsPaginationLocales(
          filters.page,
          (
            await getPublicNewsListing({
              sort: "latest",
              take: 0,
              locale: "en",
            })
          ).total,
        )
      : (['zh', 'en'] as const);
  const metadata = buildPageMetadata({
    title: !isFiltered && filters.page > 1
      ? buildMetadataTitle({
          pageTitle: `${t.aiNews.title} - ${pageLabel}`,
          brand: t.brand,
        })
      : buildListingMetadataTitle("ai-news", forceLocale, t.brand),
    description: isDbFreeMode
      ? forceLocale === "en"
        ? "AI News content is not available in this local preview because it has not been verified."
        : "本地预览不提供 AI 资讯内容，因为相关内容尚未核验。"
      : !isFiltered && filters.page > 1
        ? `${pageLabel}: ${baseDescription}`
        : baseDescription,
    path: canonicalPath,
    locale: forceLocale === "en" ? "en_US" : "zh_CN",
    localeKey: forceLocale,
    languageAlternates: buildAvailableLanguageAlternates(canonicalPath, [...languageLocales]),
  });

  if (isDbFreeMode || isFiltered) {
    metadata.robots = { index: false, follow: true };
  }

  return metadata;
}

export async function AiNewsPageShell({
  searchParams,
  forceLocale,
  pageOverride,
}: {
  searchParams: Promise<AiNewsPageSearchParams>;
  forceLocale: Locale;
  pageOverride?: number;
}) {
  const params = {
    ...(await searchParams),
    ...(pageOverride ? { page: String(pageOverride) } : {}),
  };
  const filters = parseNewsSearchParams(params);
  if (!isNewsPaginationPageQueryable(filters.page)) notFound();
  const filtered = hasActiveNewsFilters(filters);
  const t = getDictionary(forceLocale);
  const currentPathname = buildLocalePath(
    pageOverride && pageOverride > 1 ? `/ai-news/page/${pageOverride}` : "/ai-news",
    forceLocale,
  );
  if (!process.env.DATABASE_URL?.trim()) {
    return (
      <ContentlessState
        locale={forceLocale}
        className="ai-news-page ai-news-workspace enhe-reference-workspace"
        topContent={
          <PageCover
            src="/images/ai-news-cover.png"
            alt={forceLocale === "en" ? "ENHE AI news and insights" : "ENHE AI 资讯品牌封面"}
          />
        }
        dataStatusTarget="panel"
        eyebrow={forceLocale === "en" ? "AI News" : "AI 前沿资讯"}
        title={t.aiNews.title}
        intro={
          forceLocale === "en"
            ? "AI News content is not available in this local preview."
            : "AI 资讯内容尚未核验，当前本地预览不展示资讯卡片或资讯事实。"
        }
        statusLabel={forceLocale === "en" ? "Unverified" : "待核验"}
        stateTitle={forceLocale === "en" ? "Content is being prepared" : "内容准备中"}
        statusText={
          forceLocale === "en"
            ? "Unverified — AI News content has not been verified yet."
            : "待核验：AI 资讯内容尚未核验。"
        }
        primaryAction={{
          href: buildLocalePath("/", forceLocale),
          label: forceLocale === "en" ? "Return home" : "返回首页",
        }}
        secondaryActions={[
          {
            href: buildLocalePath("/software", forceLocale),
            label: forceLocale === "en" ? "Browse software" : "浏览 AI 软件",
          },
          {
            href: buildLocalePath("/skill-learning", forceLocale),
            label: forceLocale === "en" ? "Learn skills" : "学习 AI 技能",
          },
        ]}
      />
    );
  }
  const [{ articles, total }, otherLanguageListing, hot, categories, tags, discovery, topics] =
    await Promise.all([
      getPublicNewsListing({
        ...(filters satisfies PublicNewsListingFilters),
        locale: forceLocale,
      }),
      getPublicNewsListing({ ...filters, skip: 0, take: 0, locale: forceLocale === "zh" ? "en" : "zh" }),
      getPublicNewsListing({ sort: "hot", take: 6, locale: forceLocale }),
      getPublicNewsCategories(),
      getPublicNewsTags(forceLocale),
      getPublicAiNewsDiscovery(forceLocale),
      getPublicAiNewsTopics(),
    ]);
  const pageCount = getNewsPageCount(total);
  if (
    pageOverride &&
    !isNewsPaginationPageInRange(pageOverride, total)
  ) {
    notFound();
  }
  const collectionPath =
    !filtered && filters.page > 1
      ? `/ai-news/page/${filters.page}`
      : "/ai-news";
  const breadcrumbSchema = buildBreadcrumbSchema({
    items: [
      { name: t.nav.home, path: buildLocalePath("/", forceLocale) },
      { name: t.aiNews.title, path: buildLocalePath("/ai-news", forceLocale) },
    ],
  });
  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: t.aiNews.title,
    description: t.aiNews.intro,
    url: absoluteUrl(buildLocalePath(collectionPath, forceLocale)),
    inLanguage: forceLocale === "en" ? "en-US" : "zh-CN",
  };
  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: t.aiNews.title,
    description: aiNewsAnswerBlock[forceLocale],
    url: absoluteUrl(buildLocalePath(collectionPath, forceLocale)),
    inLanguage: forceLocale === "en" ? "en-US" : "zh-CN",
    mainEntity: {
      "@type": "Thing",
      name: forceLocale === "en" ? "AI news and trend interpretation" : "AI前沿资讯与趋势解读",
      description: aiNewsAnswerBlock[forceLocale],
    },
  };
  const faqSchema = buildFaqSchema({
    items: aiNewsFaqItems[forceLocale],
  });

  return (
    <main className="ai-news-page ai-news-workspace enhe-reference-workspace">
      <Container className="ai-news-workspace-container ai-news-page-container py-14">
        <StructuredData data={[breadcrumbSchema, collectionSchema, webPageSchema, faqSchema]} />
        <PageCover
          src="/images/ai-news-cover.png"
          alt={forceLocale === "en" ? "ENHE AI news and insights" : "ENHE AI 资讯品牌封面"}
        />
        <section
          className="ai-news-workspace-hero"
          data-ai-news-region="hero"
        >
          <div className="relative max-w-4xl">
              <p className="text-sm font-bold tracking-[0.08em] text-[var(--marketing-accent)]">
                ENHE AI INSIGHTS
              </p>
              <h1 className="redesign-bold-copy mt-5 text-4xl font-black leading-tight text-[var(--marketing-text)] md:text-6xl">
                {t.aiNews.title}
              </h1>
              <p className="mt-5 max-w-3xl text-base font-medium leading-8 text-[var(--marketing-muted)] md:text-lg">
                {t.aiNews.intro}
              </p>
          </div>
        </section>

        <FilterBar
          categories={categories}
          tags={tags}
          filters={filters}
          locale={forceLocale}
        />

        <section className="glass ai-news-workspace-takeaway mt-8 rounded-2xl p-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--marketing-accent)]">
            {forceLocale === "en" ? "Key takeaway" : "核心结论"}
          </p>
          <h2 className="mt-4 text-2xl font-black text-[var(--marketing-text)]">
            {forceLocale === "en" ? "What ENHE AI news is for" : "ENHE AI 资讯真正解决什么"}
          </h2>
          <p className="mt-4 max-w-4xl text-base leading-8 text-[var(--marketing-muted)]">
            {aiNewsAnswerBlock[forceLocale]}
          </p>
        </section>

        <div className="ai-news-workspace-grid mt-12 grid gap-8">
          <AiNewsListing
            key={JSON.stringify([forceLocale, filters.q, filters.category, filters.tag, filters.sort, filters.page])}
            initialArticles={toNewsListingCards(articles, forceLocale)}
            initialPage={filters.page}
            initialPageCount={pageCount}
            initialLanguagePageCounts={{
              zh: forceLocale === "zh" ? pageCount : getNewsPageCount(otherLanguageListing.total),
              en: forceLocale === "en" ? pageCount : getNewsPageCount(otherLanguageListing.total),
            }}
            locale={forceLocale}
            filters={filters}
            labels={t.aiNews}
          />

          <section
            className="space-y-6"
            aria-label={t.aiNews.discoveryRegionLabel}
          >
            <TrendPanel articles={deduplicateNewsArticles(hot.articles)} locale={forceLocale} />
            <KeywordCloud
              locale={forceLocale}
              items={discovery.keywordCloudItems}
            />
            <TopicCollections
              locale={forceLocale}
              items={discovery.topicCollectionItems}
              topics={topics}
            />
          </section>
        </div>

        <section className="glass mt-12 rounded-2xl p-7">
          <div className="flex flex-col items-start gap-5">
            <div>
              <h2 className="text-2xl font-black text-[var(--marketing-text)]">
                {t.aiNews.subscribeTitle}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--marketing-muted)]">
                {t.aiNews.subscribeIntro}
              </p>
            </div>
            <ButtonLink
              href={buildLocalePath("/user", forceLocale)}
              className="ai-news-subscribe-action"
            >
              {t.nav.user}
            </ButtonLink>
          </div>
        </section>

        <AiNewsGeoBlock forceLocale={forceLocale} />

        <section className="glass ai-news-faq mt-8 rounded-2xl p-6">
          <h2 className="text-2xl font-black text-[var(--marketing-text)]">
            {forceLocale === "en" ? "AI news FAQ" : "AI前沿资讯常见问题"}
          </h2>
          <div className="mt-5 grid gap-4">
            {aiNewsFaqItems[forceLocale].map((item) => (
              <article key={item.question} className="rounded-2xl border border-[var(--marketing-border)] bg-[var(--marketing-card)] p-5">
                <h3 className="text-base font-black leading-snug text-[var(--marketing-text)]">
                  {item.question}
                </h3>
                <p className="mt-3 text-sm leading-7 text-[var(--marketing-muted)]">
                  {item.answer}
                </p>
              </article>
            ))}
          </div>
        </section>
      </Container>
      </main>
  );
}

function AiNewsGeoBlock({ forceLocale }: { forceLocale: Locale }) {
  const sections = aiNewsGeoSections[forceLocale];
  const links = [
    {
      label: { zh: "查看 AI 趋势分析", en: "View AI trends" },
      href: buildLocalePath("/ai-trends", forceLocale),
    },
    {
      label: { zh: "选择 AI 软件应用", en: "Choose AI software apps" },
      href: buildLocalePath("/software", forceLocale),
    },
    {
      label: { zh: "学习 AI 技能课程", en: "Learn AI skill courses" },
      href: buildLocalePath("/skill-learning", forceLocale),
    },
  ];

  return (
    <section className="glass ai-news-guide mt-8 rounded-2xl p-6">
      <div className="grid gap-4">
        {sections.map((section) => (
          <article
            key={section.title}
            className="rounded-2xl border border-[var(--marketing-border)] bg-[var(--marketing-card)] p-5"
          >
            <h2 className="text-lg font-black leading-snug text-[var(--marketing-text)]">
              {section.title}
            </h2>
            <p className="mt-3 text-sm leading-7 text-[var(--marketing-muted)]">
              {section.body}
            </p>
          </article>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        {links.map((item) => (
          <Link
            key={item.href}
            href={item.href}
                  className="rounded-full border border-[var(--marketing-border)] bg-[var(--marketing-card)] px-4 py-2 text-sm font-bold text-[var(--marketing-text)] transition-[border-color,color] hover:border-[var(--marketing-accent)] hover:text-[var(--marketing-accent)]"
          >
            {item.label[forceLocale]}
          </Link>
        ))}
      </div>
    </section>
  );
}

function FilterBar({
  categories,
  tags,
  filters,
  locale,
}: {
  categories: { id: string; name: string }[];
  tags: { slug: string; name: string }[];
  filters: ReturnType<typeof parseNewsSearchParams>;
  locale: Locale;
}) {
  const t = getDictionary(locale);

  return (
    <form
      action={buildLocalePath("/ai-news", locale)}
      className="filter-surface ai-news-filter-surface mt-8 grid gap-3 lg:grid-cols-[1fr_180px_160px_140px]"
      aria-label={t.aiNews.filterFormLabel}
      data-analytics-event="search_ai_news"
      data-analytics-meta-locale={locale}
      data-analytics-meta-query={filters.q ?? ""}
      data-analytics-meta-category={filters.category ?? ""}
      data-analytics-meta-tag={filters.tag ?? ""}
      data-analytics-meta-sort={filters.sort}
    >
      <label className="sr-only" htmlFor="ai-news-search">
        {t.aiNews.searchPlaceholder}
      </label>
      <input
        id="ai-news-search"
        name="q"
        defaultValue={filters.q}
        aria-label={t.aiNews.searchPlaceholder}
        placeholder={t.aiNews.searchPlaceholder}
        title={t.aiNews.searchPlaceholder}
        className="form-control-dark"
      />
      <label className="sr-only" htmlFor="ai-news-category">
        {t.aiNews.allCategories}
      </label>
      <select
        id="ai-news-category"
        name="category"
        aria-label={t.aiNews.allCategories}
        defaultValue={filters.category ?? ""}
        title={t.aiNews.allCategories}
        className="form-select-dark"
      >
        <option value="">{t.aiNews.allCategories}</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {resolveLocalizedNewsCategoryName(category.name, locale)}
          </option>
        ))}
      </select>
      <label className="sr-only" htmlFor="ai-news-tag">
        {t.aiNews.allTags}
      </label>
      <select
        id="ai-news-tag"
        name="tag"
        aria-label={t.aiNews.allTags}
        defaultValue={filters.tag ?? ""}
        title={t.aiNews.allTags}
        className="form-select-dark"
      >
        <option value="">{t.aiNews.allTags}</option>
        {tags.map((tag) => (
          <option key={tag.slug} value={tag.slug}>
            {resolveLocalizedNewsTagName(tag.name, locale) || tag.name}
          </option>
        ))}
      </select>
      <label className="sr-only" htmlFor="ai-news-sort">
        {t.aiNews.latest}
      </label>
      <select
        id="ai-news-sort"
        name="sort"
        aria-label={t.aiNews.latest}
        defaultValue={filters.sort}
        title={t.aiNews.latest}
        className="form-select-dark"
      >
        <option value="latest">{t.aiNews.latest}</option>
        <option value="hot">{t.aiNews.hot}</option>
        <option value="featured">{t.aiNews.featured}</option>
      </select>
               <button className="rounded-full bg-[var(--marketing-button)] px-5 py-3 font-bold text-[var(--marketing-card)] transition-colors hover:bg-[var(--marketing-accent)] lg:col-span-4">
        {t.aiNews.filter}
      </button>
    </form>
  );
}

function TrendPanel({
  articles,
  locale,
}: {
  articles: NewsCardArticle[];
  locale: Locale;
}) {
  const t = getDictionary(locale);

  return (
    <section className="glass rounded-2xl p-5">
      <h2 className="text-lg font-black text-[var(--marketing-text)]">
        {t.aiNews.trendTitle}
      </h2>
      <div className="mt-4 space-y-3">
        {articles.length ? (
          articles.map((article, index) => (
            <Link
              key={article.id}
              href={buildCanonicalAiNewsPath(article, locale)}
              className="ai-news-interactive-link block rounded-xl border border-[var(--marketing-border)] bg-[var(--marketing-card)] p-4"
            >
              <span className="text-xs font-bold text-[var(--marketing-accent)]">
                #{index + 1}
              </span>
              <p className="mt-2 text-sm font-semibold leading-6 text-[var(--marketing-text)]">
                {locale === "en"
                  ? buildLocalizedNewsTitle(
                      {
                        title: article.title,
                        englishTitle: article.englishTitle,
                        categoryName: article.category?.name,
                      },
                      locale,
                    )
                  : article.title}
              </p>
            </Link>
          ))
        ) : (
          <p className="text-sm leading-6 text-[var(--marketing-muted)]">
            {t.aiNews.emptyText}
          </p>
        )}
      </div>
    </section>
  );
}

function KeywordCloud({
  locale,
  items,
}: {
  locale: Locale;
  items: KeywordCloudItem[];
}) {
  const t = getDictionary(locale);

  return (
    <section className="glass rounded-2xl p-5">
      <h2 className="text-lg font-black text-[var(--marketing-text)]">
        {t.aiNews.keywordsTitle}
      </h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {items.map((item) => (
          <Link
            key={item.keyword}
            href={`${buildLocalePath("/ai-news", locale)}?q=${encodeURIComponent(item.query)}`}
            className="ai-news-interactive-link rounded-full border border-[var(--marketing-border)] bg-[var(--marketing-card)] px-3 py-1 text-xs font-semibold text-[var(--marketing-muted)]"
          >
            {localizeAiNewsDiscoveryLabel(
              item.displayName,
              locale,
              locale === "en" ? "AI Insights" : item.displayName,
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}

const aiNewsTopicPathHints = [
  "/ai-news/topics/ai-agent",
  "/ai-news/topics/local-ai",
  "/ai-news/topics/open-source-models",
  "/ai-news/topics/ai-tools",
  "/ai-news/topics/ai-tutorials",
  "/ai-news/topics/ai-account-service",
  "/ai-news/topics/ai-regulation",
] as const;

function TopicCollections({
  locale,
  items,
  topics,
}: {
  locale: Locale;
  items: TopicCollectionItem[];
  topics: Awaited<ReturnType<typeof getPublicAiNewsTopics>>;
}) {
  const t = getDictionary(locale);
  const topicLinks = topics.map((topic) => {
    const copy = getAiNewsTopicCopy(topic, locale);
    return {
      key: topic.slug,
      title: copy.title,
      href: getAiNewsTopicPath(topic.slug, locale),
    };
  });
  const fallbackItems = items.slice(0, 2);

  return (
    <section className="glass rounded-2xl p-5">
      <h2 className="text-lg font-black text-[var(--marketing-text)]">
        {t.aiNews.topicsTitle}
      </h2>
      <div
        className="mt-4 grid gap-3"
        data-topic-paths={aiNewsTopicPathHints.join(" ")}
      >
        {topicLinks.map((item) => (
          <Link
            key={item.key}
            href={item.href}
                     className="rounded-xl border border-[var(--marketing-border)] bg-[var(--marketing-card)] p-4 text-sm font-semibold text-[var(--marketing-text)] transition-[border-color,color] hover:border-[var(--marketing-accent)]/45 hover:text-[var(--marketing-accent)]"
          >
            {item.title}
          </Link>
        ))}
        {fallbackItems.map((item) => (
          <Link
            key={item.key}
            href={`${buildLocalePath("/ai-news", locale)}?q=${encodeURIComponent(item.query)}`}
                     className="rounded-xl border border-[var(--marketing-border)] bg-[var(--marketing-card)] p-4 text-sm font-semibold text-[var(--marketing-muted)] transition-[border-color,color] hover:border-[var(--marketing-accent)]/45 hover:text-[var(--marketing-accent)]"
          >
            {localizeAiNewsDiscoveryLabel(
              item.title,
              locale,
              locale === "en" ? "AI Insights" : item.title,
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
