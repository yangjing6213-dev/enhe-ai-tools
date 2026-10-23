"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

import type { RedesignLocale } from "@/components/redesign/types";
import { buildLocalizedToolOptionalText, resolveLocalizedToolIdentity, resolveLocalizedToolTagName } from "@/lib/tool-localization";
import { AiWorkflowCoverImage } from "./workflow-cover-image";
import { AiWorkflowFavoriteButton } from "./workflow-interactions";
import type { AiWorkflowCatalogFilters } from "@/lib/ai-workflows/catalog";

type TopicOption = { id: string; name: string; englishName: string | null };
const topicEnglishFallbacks: Readonly<Record<string, string>> = {
  "工作效率": "Productivity",
  "视频生成": "Video generation",
  "内容创作": "Content creation",
  "编程开发": "Programming & development",
  "学习教育": "Learning & education",
  "搜索研究": "Search & research",
  "营销销售": "Marketing & sales",
  "办公自动化": "Office automation",
  "情感陪伴": "Companionship",
  "财务法律辅助": "Finance & legal support",
};

function topicLabel(topic: { name: string; englishName: string | null }, locale: RedesignLocale) {
  if (locale === "zh") return topic.name;
  return topic.englishName?.trim() || topicEnglishFallbacks[topic.name] || topic.name;
}

export type AiWorkflowCatalogCard = {
  id: string;
  slug: string;
  name: string;
  englishName: string | null;
  shortDescription: string;
  coverImage: string | null;
  isDownloadPaid: boolean;
  price: number;
  favoriteCount: number;
  isFavorite: boolean;
  downloadCount: number;
  ratingAverage: number | null;
  reviewCount: number;
  projectType: string;
  deliveryMode: "package" | "repository_link";
  githubStars: number | null;
  verifiedEnvironments: string[];
  topic: { name: string; englishName: string | null } | null;
  tags: string[];
  systemRequirement: string | null;
};

export type AiWorkflowDirectoryEmptyState = "no-matches" | "no-published" | "topics-unconfigured" | "unverified";

const copy = {
  zh: {
    search: "搜索中文名、仓库名、用途、主题或标签", products: "全部工作流",
    noProducts: "目前还没有已发布工作流。符合主题且许可清晰的项目会以可下载包或 GitHub 原仓库链接展示。",
    topic: "全部主题", paid: "全部价格", free: "免费", paidOnly: "付费", environment: "全部环境",
    windows: "已验证 Windows", macos: "已验证 macOS", linux: "已验证 Linux", type: "全部类型",
    workflow: "工作流", automation: "自动化工具", agent: "智能体项目", template: "模板", companion: "配套工具",
    sort: "推荐排序", latest: "最新发布", downloads: "网站下载发起", rating: "用户评分", price: "价格从低到高",
    count: "个项目", details: "查看详情", freeTag: "免费", pricePending: "价格待确认", repositoryLink: "原仓库链接", noRating: "暂无评分", reviews: "条评价",
    downloadsLabel: "次网站下载发起", repositoryOnly: "仅提供 GitHub 原仓库", stars: "GitHub 星标", environments: "已验证", page: "页", previous: "上一页", next: "下一页",
    browseSkills: "浏览 AI Skills", browseTools: "浏览 AI 工具", clearFilters: "清除筛选，查看全部工作流",
    emptyStates: {
      "no-matches": { title: "没有匹配的工作流", body: "当前搜索或筛选条件没有匹配项。清除条件即可查看全部工作流。" },
      "no-published": { title: "目前还没有已发布工作流", body: "有工作流发布后会显示在这里，您也可以先浏览其他 AI 内容。" },
      "topics-unconfigured": { title: "工作流主题尚未配置", body: "工作流目录正在准备中，您可以先浏览其他 AI 内容。" },
      unverified: { title: "本地预览尚未连接内容源", body: "当前无法核验已发布工作流数量；这不代表线上目录没有内容。" },
    },
  },
  en: {
    search: "Search Chinese name, repository, use case, topic, or tag", products: "All workflows",
    noProducts: "No workflow is published yet. Relevant projects with a clear license will appear as a downloadable package or a GitHub repository link.",
    topic: "All topics", paid: "All prices", free: "Free", paidOnly: "Paid", environment: "All environments",
    windows: "Verified Windows", macos: "Verified macOS", linux: "Verified Linux", type: "All types",
    workflow: "Workflow", automation: "Automation tool", agent: "Agent project", template: "Template", companion: "Companion tool",
    sort: "Recommended", latest: "Newest", downloads: "Website download starts", rating: "User rating", price: "Price: low to high",
    count: "items", details: "View details", freeTag: "Free", pricePending: "Price pending", repositoryLink: "GitHub repository", noRating: "No ratings yet", reviews: "reviews",
    downloadsLabel: "website download starts", repositoryOnly: "GitHub source link only", stars: "GitHub stars", environments: "Verified", page: "Page", previous: "Previous", next: "Next",
    browseSkills: "Browse AI Skills", browseTools: "Browse AI tools", clearFilters: "Clear filters and view all workflows",
    emptyStates: {
      "no-matches": { title: "No matching workflows", body: "Nothing matches the current search or filters. Clear them to view all workflows." },
      "no-published": { title: "No workflows have been published yet", body: "Published workflows will appear here. You can browse other AI content in the meantime." },
      "topics-unconfigured": { title: "Workflow topics are not configured", body: "The workflow directory is being prepared. You can browse other AI content in the meantime." },
      unverified: { title: "Local preview is not connected to a content source", body: "The published workflow count cannot be verified here; this does not mean the live directory is empty." },
    },
  },
} as const;

function queryString(filters: AiWorkflowCatalogFilters, page: number) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.topic) params.set("topic", filters.topic);
  if (filters.paid !== "all") params.set("paid", filters.paid);
  if (filters.environment !== "all") params.set("environment", filters.environment);
  if (filters.type !== "all") params.set("type", filters.type);
  if (filters.sort !== "recommended") params.set("sort", filters.sort);
  if (page > 1) params.set("page", String(page));
  const value = params.toString();
  return value ? `?${value}` : "";
}

export function AiWorkflowDirectory({
  locale, filters, items, topics, total, pageCount, emptyState,
}: {
  locale: RedesignLocale;
  filters: AiWorkflowCatalogFilters;
  items: AiWorkflowCatalogCard[];
  topics: TopicOption[];
  total: number;
  pageCount: number;
  emptyState: AiWorkflowDirectoryEmptyState;
}) {
  const [query, setQuery] = useState(filters.q);
  const text = copy[locale];
  const basePath = locale === "en" ? "/en/ai-workflows" : "/ai-workflows";
  const emptyCopy = text.emptyStates[emptyState];

  return (
    <>
      <form action={basePath} method="get" className="filter-surface mt-7 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4" aria-label={locale === "en" ? "Workflow filters" : "工作流筛选"}>
        <label className="relative sm:col-span-2">
          <span className="sr-only">{text.search}</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--marketing-muted)]" />
          <input name="q" type="search" value={query} placeholder={text.search} className="w-full rounded-xl border border-border bg-background py-3 pl-12 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onChange={(event) => setQuery(event.currentTarget.value)} />
        </label>
        <label>
          <span className="sr-only">{text.topic}</span>
          <select name="topic" defaultValue={filters.topic} className="w-full rounded-xl border border-border bg-background px-3 py-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <option value="">{text.topic}</option>
            {topics.map((topic) => <option key={topic.id} value={topic.id}>{topicLabel(topic, locale)}</option>)}
          </select>
        </label>
        <label>
          <span className="sr-only">{text.paid}</span>
          <select name="paid" defaultValue={filters.paid} className="w-full rounded-xl border border-border bg-background px-3 py-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <option value="all">{text.paid}</option><option value="free">{text.free}</option><option value="paid">{text.paidOnly}</option>
          </select>
        </label>
        <label>
          <span className="sr-only">{text.environment}</span>
          <select name="environment" defaultValue={filters.environment} className="w-full rounded-xl border border-border bg-background px-3 py-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <option value="all">{text.environment}</option><option value="windows">{text.windows}</option><option value="macos">{text.macos}</option><option value="linux">{text.linux}</option>
          </select>
        </label>
        <label>
          <span className="sr-only">{text.type}</span>
          <select name="type" defaultValue={filters.type} className="w-full rounded-xl border border-border bg-background px-3 py-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <option value="all">{text.type}</option><option value="workflow">{text.workflow}</option><option value="automation">{text.automation}</option><option value="agent">{text.agent}</option><option value="template">{text.template}</option><option value="companion">{text.companion}</option>
          </select>
        </label>
        <label>
          <span className="sr-only">{text.sort}</span>
          <select name="sort" defaultValue={filters.sort} className="w-full rounded-xl border border-border bg-background px-3 py-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <option value="recommended">{text.sort}</option><option value="latest">{text.latest}</option><option value="downloads">{text.downloads}</option><option value="rating">{text.rating}</option><option value="price">{text.price}</option>
          </select>
        </label>
        <button type="submit" className="ai-workflows-apply-filters rounded-xl bg-[var(--marketing-accent)] px-4 py-3 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{locale === "en" ? "Apply filters" : "应用筛选"}</button>
      </form>

      <section className="mt-6" aria-labelledby="ai-workflow-products-title">
        <div className="flex items-end justify-between gap-4"><h2 id="ai-workflow-products-title" className="text-lg font-semibold text-[var(--marketing-text)]">{text.products}</h2><p className="text-sm text-[var(--marketing-muted)]">{total} {text.count}</p></div>
        {items.length ? <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const href = `${basePath}/${item.slug}`;
            const identity = resolveLocalizedToolIdentity({ ...item, type: "ai_workflow" }, locale);
            const description = buildLocalizedToolOptionalText(item.shortDescription, locale, { allowUntranslated: true });
            const tags = item.tags.map((tag) => resolveLocalizedToolTagName(tag, locale)).filter(Boolean);
            const priceLabel = item.isDownloadPaid
              ? Number.isFinite(item.price) && item.price > 0 ? `¥${item.price.toFixed(2)}` : text.pricePending
              : text.freeTag;
            return <article key={item.id} className="flex min-h-[270px] flex-col rounded-2xl border border-[var(--marketing-border)] bg-white p-5 shadow-[0_12px_34px_rgba(29,78,126,0.06)]">
              <div className="flex items-start gap-3">
                <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#e8f3ff] text-[var(--marketing-accent)]">
                  <AiWorkflowCoverImage coverImage={item.coverImage} slug={item.slug} alt="" width={56} height={56} unoptimized className="size-14 object-cover" />
                </div>
                <div className="min-w-0 flex-1"><Link href={href} className="font-semibold text-[var(--marketing-text)] hover:text-[var(--marketing-accent)]">{identity.primaryName}</Link>{locale === "zh" && identity.secondaryName ? <p className="mt-1 truncate text-xs text-[var(--marketing-muted)]">{identity.secondaryName}</p> : null}</div>
                <span className="shrink-0 rounded-full bg-[#e8f3ff] px-2.5 py-1 text-xs font-semibold text-[var(--marketing-accent)]">{item.deliveryMode === "repository_link" ? text.repositoryLink : priceLabel}</span>
              </div>
              <p className="mt-4 line-clamp-3 text-sm leading-6 text-[var(--marketing-muted)]">{description}</p>
              <div className="mt-3 flex flex-wrap gap-2">{item.topic ? <span className="rounded-full border border-[var(--marketing-border)] px-2.5 py-1 text-xs">{topicLabel(item.topic, locale)}</span> : null}{tags.slice(0, 3).map((tag) => <span key={tag} className="rounded-full border border-[var(--marketing-border)] px-2.5 py-1 text-xs">{tag}</span>)}</div>
              <div className="mt-auto pt-4">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-[var(--marketing-muted)]">
                  <span aria-label={item.ratingAverage === null ? text.noRating : `${item.ratingAverage.toFixed(1)} / 5`}>{item.ratingAverage === null ? text.noRating : `★ ${item.ratingAverage.toFixed(1)} (${item.reviewCount} ${text.reviews})`}</span>
                  {item.deliveryMode === "package" ? <span>{item.downloadCount} {text.downloadsLabel}</span> : <span>{text.repositoryOnly}</span>}
                  {item.githubStars !== null ? <span>★ {item.githubStars.toLocaleString()} {text.stars}</span> : null}
                  {item.verifiedEnvironments.length ? <span>{text.environments}: {item.verifiedEnvironments.join(" / ")}</span> : null}
                </div>
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--marketing-border)] pt-3">
                  <AiWorkflowFavoriteButton slug={item.slug} initialCount={item.favoriteCount} initialFavorite={item.isFavorite} locale={locale} loginHref={`${locale === "en" ? "/en" : ""}/login?returnTo=${encodeURIComponent(href)}`} />
                  <Link href={href} className="ai-workflows-detail-link rounded-lg bg-[var(--marketing-accent)] px-3 py-2 text-sm font-semibold text-white hover:opacity-90">{text.details}</Link>
                </div>
              </div>
            </article>;
          })}
        </div> : <div className="mt-4 rounded-2xl border border-[var(--marketing-border)] bg-white p-6"><h3 className="font-semibold text-[var(--marketing-text)]">{emptyCopy.title}</h3><p className="mt-2 text-sm leading-6 text-[var(--marketing-muted)]">{emptyCopy.body}</p><div className="mt-4 flex flex-wrap gap-4">{emptyState === "no-matches" ? <Link className="text-sm font-medium text-[var(--marketing-accent)] underline-offset-4 hover:underline" href={basePath}>{text.clearFilters}</Link> : null}<Link className="text-sm font-medium text-[var(--marketing-accent)] underline-offset-4 hover:underline" href={locale === "en" ? "/en/ai-skills" : "/ai-skills"}>{text.browseSkills}</Link><Link className="text-sm font-medium text-[var(--marketing-accent)] underline-offset-4 hover:underline" href={locale === "en" ? "/en/software" : "/software"}>{text.browseTools}</Link></div></div>}
        {pageCount > 1 ? <nav className="mt-6 flex items-center justify-center gap-3" aria-label={locale === "en" ? "Workflow pages" : "工作流分页"}>
          {filters.page > 1 ? <Link href={`${basePath}${queryString(filters, filters.page - 1)}`} className="rounded-lg border px-3 py-2 text-sm">{text.previous}</Link> : null}
          <span className="text-sm text-[var(--marketing-muted)]">{text.page} {filters.page} / {pageCount}</span>
          {filters.page < pageCount ? <Link href={`${basePath}${queryString(filters, filters.page + 1)}`} className="rounded-lg border px-3 py-2 text-sm">{text.next}</Link> : null}
        </nav> : null}
      </section>
    </>
  );
}
