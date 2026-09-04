import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, LockKeyhole, Signal } from "lucide-react";
import { Badge, ButtonLink, Container, EmptyState, SectionTitle } from "@/components/ui";
import { buildAiTrendLoginUrl, getAiTrendBriefingSummaries, localizeAiTrendBriefingView } from "@/lib/ai-trends";
import { getCurrentUser } from "@/lib/auth";
import { type Locale } from "@/lib/dictionaries";
import { absoluteUrl, buildLocalePath, buildMetaDescription, buildMetadataTitle, defaultOgImage, siteName } from "@/lib/seo";

const archivePath = "/ai-trends/daily";

const copy = {
  zh: {
    title: "AI 需求趋势每日分析",
    description: "AI 需求趋势每日分析归档。公开用户可阅读摘要，登录用户可阅读完整 HTML 报告。",
    intro: "每日追踪公开趋势信号，整理“人类最渴望用 AI 解决哪些问题”。公开用户可浏览摘要，登录后可阅读完整视觉化 HTML 报告。",
    back: "返回趋势总览",
    login: "登录查看完整报告",
    archiveTitle: "分析归档",
    archiveIntro: "这些日更页用于用户分享和阅读，不进入 sitemap，并通过 robots metadata 设置 noindex, follow。",
    readFull: "阅读全文",
    readSummary: "阅读摘要",
    emptyTitle: "暂无分析",
    emptyText: "自动化发布第一份 AI 需求趋势分析后，这里会显示公开摘要。",
    sources: "个来源信号",
    scenarioTitle: "细分场景",
    developmentPriority: "开发优先级",
    loginHint: "登录后看全文"
  },
  en: {
    title: "Daily AI Demand Analysis",
    description: "Daily AI demand analysis archive. Public readers can view summaries, and signed-in users can read full HTML reports.",
    intro:
      "Track public demand signals every day around what people most want AI to solve. Public readers can browse the summary, and signed-in users can read the full visual HTML report.",
    back: "Back to trend overview",
    login: "Log in to read the full report",
    archiveTitle: "Analysis archive",
    archiveIntro:
      "These daily pages are meant for reading and sharing, stay out of sitemap, and explicitly use noindex, follow via robots metadata.",
    readFull: "Read full report",
    readSummary: "Read summary",
    emptyTitle: "No analysis yet",
    emptyText: "Public summaries will appear here after the first automated AI demand analysis is published.",
    sources: "source signals",
    scenarioTitle: "Scenarios",
    developmentPriority: "Development priority",
    loginHint: "Log in for full text"
  }
} as const;

export function generateAiTrendDailyArchiveMetadata(locale: Locale = "zh"): Metadata {
  const text = copy[locale];
  const title = buildMetadataTitle({ pageTitle: text.title, brand: siteName });
  const description = buildMetaDescription(text.description);
  const canonicalPath = buildLocalePath(archivePath, locale);

  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl(canonicalPath)
    },
    robots: {
      index: false,
      follow: true
    },
    openGraph: {
      title,
      description,
      url: absoluteUrl(canonicalPath),
      siteName,
      images: [{ url: absoluteUrl(defaultOgImage), alt: text.title }],
      locale: locale === "en" ? "en_US" : "zh_CN",
      type: "website"
    }
  };
}

export async function AiTrendDailyArchivePageShell({ forceLocale = "zh" }: { forceLocale?: Locale } = {}) {
  const [briefings, user] = await Promise.all([getAiTrendBriefingSummaries(30), getCurrentUser()]);
  const isLoggedIn = Boolean(user);
  const text = copy[forceLocale];
  const localizedBriefings = briefings.map((briefing) => localizeAiTrendBriefingView(briefing, forceLocale));

  return (
    <Container className="py-14">
      <section className="surface-panel p-7 md:p-10">
        <Badge className="text-[var(--marketing-accent)]">Daily Analysis</Badge>
        <h1 className="mt-5 text-4xl font-black leading-tight text-[var(--marketing-text)] md:text-5xl">{text.title}</h1>
        <p className="mt-5 max-w-3xl text-base font-medium leading-8 text-[var(--marketing-muted)]">{text.intro}</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <ButtonLink href={buildLocalePath("/ai-trends", forceLocale)}>{text.back}</ButtonLink>
          {!isLoggedIn ? (
            <ButtonLink href={buildAiTrendLoginUrl(new Date().toISOString().slice(0, 10), forceLocale)} variant="ghost">
              {text.login}
            </ButtonLink>
          ) : null}
        </div>
      </section>

      <section className="mt-12">
        <SectionTitle title={text.archiveTitle} intro={text.archiveIntro} />
        {localizedBriefings.length ? (
          <div className="grid gap-5">
            {localizedBriefings.map((briefing) => (
              <article key={briefing.id} className="surface-panel-soft p-5">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[var(--marketing-muted)]">
                      <span className="inline-flex items-center gap-2 text-[var(--marketing-accent)]">
                        <CalendarDays size={15} strokeWidth={1.8} aria-hidden="true" />
                        <time dateTime={briefing.slug}>{briefing.slug}</time>
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <Signal size={15} strokeWidth={1.8} aria-hidden="true" />
                        {briefing.sourceCount} {text.sources}
                      </span>
                      {!isLoggedIn ? (
                        <span className="inline-flex items-center gap-2">
                          <LockKeyhole size={15} strokeWidth={1.8} aria-hidden="true" />
                          {text.loginHint}
                        </span>
                      ) : null}
                    </div>
                    <h2 className="mt-3 text-2xl font-black leading-snug text-[var(--marketing-text)]">{briefing.title}</h2>
                    <p className="mt-3 text-base leading-8 text-[var(--marketing-muted)]">{briefing.coreConclusion}</p>
                    {briefing.publicHighlights.length ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {briefing.publicHighlights.slice(0, 5).map((highlight) => (
                          <Badge key={highlight}>{highlight}</Badge>
                        ))}
                      </div>
                    ) : null}
                    {briefing.demandBreakdowns.length ? (
                      <div className="mt-5 grid gap-2 md:grid-cols-3">
                        {briefing.demandBreakdowns[0].scenarios.slice(0, 3).map((scenario) => (
                          <div key={`${briefing.id}-${scenario.name}`} className="rounded-xl border border-white/10 bg-white/7 p-3">
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-sm font-bold leading-6 text-[var(--marketing-text)]">{scenario.name}</p>
                              <span className="shrink-0 text-sm font-black text-[var(--marketing-accent)]">{scenario.heat}</span>
                            </div>
                            {scenario.developmentPriority || scenario.urgency ? (
                              <p className="mt-2 text-xs leading-5 text-[var(--marketing-muted)]">
                                {text.developmentPriority} {scenario.developmentPriority || scenario.urgency}
                              </p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <Link
                    href={buildLocalePath(`/ai-trends/daily/${briefing.slug}`, forceLocale)}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-[var(--marketing-accent)]/40 px-5 py-3 text-sm font-bold text-[var(--marketing-accent)] transition hover:border-[var(--marketing-accent)]"
                  >
                    {isLoggedIn ? text.readFull : text.readSummary}
                    <ArrowUpRight size={16} strokeWidth={1.8} aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title={text.emptyTitle} text={text.emptyText} />
        )}
      </section>
    </Container>
  );
}
