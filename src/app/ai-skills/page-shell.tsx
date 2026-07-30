import type { Metadata } from "next";
import Link from "next/link";
import { StructuredData } from "@/components/structured-data";
import { ToolCard } from "@/components/tool-card";
import { Container, EmptyState, SectionTitle } from "@/components/ui";
import { getDictionary, type Locale } from "@/lib/dictionaries";
import { getPublicToolCategories, getPublicToolListing } from "@/lib/public-content";
import { publicPageCacheSeconds } from "@/lib/public-routes";
import { buildCanonicalToolPath } from "@/lib/public-slugs";
import {
  absoluteUrl,
  buildBreadcrumbSchema,
  buildLocalePath,
  buildPageMetadata,
} from "@/lib/seo";
import { resolveLocalizedToolCategoryName } from "@/lib/tool-localization";

export const aiSkillsPageRevalidate = publicPageCacheSeconds;

const pageCopy = {
  zh: {
    title: "AI Skill",
    intro: "查找可安装到 Codex、OpenClaw、Claude Code、Cursor 等智能体中的专业 Skill，购买后获取 ZIP 包和使用说明。",
    answerTitle: "按智能体和任务选择 AI Skill",
    answerBody: "先确认准备在哪个智能体中使用，再查看适用任务、版本、价格和交付说明。每个商品详情页都会明确列出已支持的智能体。",
    all: "全部 AI Skill",
    search: "搜索 Skill 名称或用途",
    filter: "筛选",
    emptyTitle: "暂无 AI Skill",
    emptyText: "请调整筛选条件，或等待新的 AI Skill 发布。",
  },
  en: {
    title: "AI Skills",
    intro: "Browse professional Skills for Codex, OpenClaw, Claude Code, Cursor, and other AI agents. Purchase a Skill to access its ZIP package and setup notes.",
    answerTitle: "Choose an AI Skill by agent and task",
    answerBody: "Start with the agent you use, then review the task fit, version, price, and delivery notes. Each product page lists the agents that are currently supported.",
    all: "All AI Skills",
    search: "Search Skill name or use case",
    filter: "Filter",
    emptyTitle: "No AI Skills yet",
    emptyText: "Adjust the filters or check again when new AI Skills are published.",
  },
} as const;

export function generateAiSkillsPageMetadata(locale: Locale): Metadata {
  const copy = pageCopy[locale];
  return buildPageMetadata({
    title: `${copy.title} - ENHE AI`,
    description: copy.intro,
    path: buildLocalePath("/ai-skills", locale),
    locale: locale === "en" ? "en_US" : "zh_CN",
    localeKey: locale,
  });
}

export async function AiSkillsPageShell({
  searchParams,
  forceLocale,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
  forceLocale: Locale;
}) {
  const params = await searchParams;
  const copy = pageCopy[forceLocale];
  const t = getDictionary(forceLocale);
  const [categories, tools] = await Promise.all([
    getPublicToolCategories("ai_skill"),
    getPublicToolListing(
      "ai_skill",
      params.category,
      params.q,
      params.paid,
      params.sort,
    ),
  ]);
  const listingPath = buildLocalePath("/ai-skills", forceLocale);
  const breadcrumbSchema = buildBreadcrumbSchema({
    schemaType: "BreadcrumbList",
    items: [
      { name: t.nav.home, path: buildLocalePath("/", forceLocale) },
      { name: copy.title, path: listingPath },
    ],
  });
  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: copy.title,
    description: copy.intro,
    url: absoluteUrl(listingPath),
    inLanguage: forceLocale === "en" ? "en-US" : "zh-CN",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: tools.length,
      itemListElement: tools.map((tool, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: tool.englishName || tool.name,
        url: absoluteUrl(buildCanonicalToolPath(tool, forceLocale)),
      })),
    },
  };

  return (
    <main>
      <Container className="py-14">
        <StructuredData data={[breadcrumbSchema, collectionSchema]} />
        <SectionTitle as="h1" title={copy.title} intro={copy.intro} />

        <section className="surface-panel-soft mt-6 p-5" aria-label={copy.answerTitle}>
          <h2 className="text-base font-semibold text-[var(--marketing-text)]">{copy.answerTitle}</h2>
          <p className="mt-2 max-w-4xl text-sm leading-7 text-[var(--marketing-muted)]">{copy.answerBody}</p>
        </section>

        <form className="filter-surface mt-7 grid gap-3 md:grid-cols-[1fr_220px_140px]" action={listingPath}>
          <input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder={copy.search}
            className="rounded-xl border border-white/12 bg-white/6 px-4 py-3 text-sm text-[var(--marketing-text)]"
          />
          <select
            name="category"
            defaultValue={params.category ?? ""}
            aria-label={t.listing.allCategories}
            className="rounded-xl border border-white/12 bg-[#07101E] px-4 py-3 text-sm text-[var(--marketing-text)]"
          >
            <option value="">{copy.all}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {resolveLocalizedToolCategoryName(category.name, "ai_skill", forceLocale)}
              </option>
            ))}
          </select>
          <button className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-[var(--marketing-text)]">
            {copy.filter}
          </button>
        </form>

        {tools.length ? (
          <div className="listing-grid mt-8 grid gap-5 md:grid-cols-3">
            {tools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} locale={forceLocale} headingLevel={2} />
            ))}
          </div>
        ) : (
          <EmptyState title={copy.emptyTitle} text={copy.emptyText} />
        )}

        <p className="mt-8 text-sm text-[var(--marketing-muted)]">
          <Link href={buildLocalePath("/skill-learning", forceLocale)} className="text-[var(--marketing-accent)]">
            {forceLocale === "en" ? "View AI tutorials" : "查看 AI 教程"}
          </Link>
        </p>
      </Container>
    </main>
  );
}
