import Link from "next/link";
import { AdminSection } from "@/app/admin/admin-ui";
import { prisma } from "@/lib/db";
import { buildSeoInsightReport, type SeoInsightRecommendation } from "@/lib/seo-insights";

export default async function AdminSeoInsightsPage() {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [events, articles, tools, tutorials] = await Promise.all([
    prisma.analyticsEvent.findMany({
      where: {
        createdAt: { gte: since },
        eventName: {
          in: ["seo_landing_view", "search_ai_news", "create_order", "payment_proof_submitted", "payment_review_approved", "click_open_vip"]
        }
      },
      select: { eventName: true, path: true, metadata: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5000
    }),
    prisma.newsArticle.findMany({
      where: { status: "published" },
      select: { title: true, keywords: true, seoKeywords: true, summary: true }
    }),
    prisma.tool.findMany({
      where: { status: "published" },
      select: {
        name: true,
        type: true,
        shortDescription: true,
        category: { select: { name: true } }
      }
    }),
    prisma.tutorial.findMany({
      where: { status: "active", tool: { status: "published" } },
      select: { title: true, content: true, tool: { select: { category: { select: { name: true } } } } },
      take: 300
    })
  ]);
  const report = buildSeoInsightReport({
    events,
    articles,
    tools: tools.map((tool) => ({
      title: tool.name,
      summary: tool.shortDescription,
      type: tool.type,
      categoryName: tool.category?.name
    })),
    tutorials: tutorials.map((tutorial) => ({
      title: tutorial.title,
      summary: tutorial.content.slice(0, 220),
      categoryName: tutorial.tool.category?.name
    }))
  });

  return (
    <AdminSection
      title="SEO 数据跟踪与行动建议"
      intro="汇总近 30 天自然搜索、AI 问答引擎、站内搜索和转化信号，自动推导下一步文章、软件、账号服务和课程方向。"
    >
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <InsightStat label="SEO访问" value={report.summary.totalSeoViews} accent />
        <InsightStat label="自然搜索" value={report.summary.organicLandings} />
        <InsightStat label="AI问答入口" value={report.summary.aiAnswerLandings} />
        <InsightStat label="站内搜索" value={report.summary.searchEvents} />
        <InsightStat label="转化动作" value={report.summary.conversionEvents} />
        <InsightStat label="内部访问" value={report.summary.internalViews} />
      </div>

      <section className="surface-panel mt-8 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-[var(--marketing-text)]">下一步优先行动</h2>
          <span className="text-xs text-[var(--marketing-muted)]">按搜索意图、覆盖缺口和落地页表现生成</span>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {report.recommendations.map((item, index) => (
            <RecommendationCard key={`${item.title}-${index}`} item={item} />
          ))}
        </div>
      </section>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="surface-panel p-6">
          <h2 className="text-xl font-semibold text-[var(--marketing-text)]">SEO 落地页表现</h2>
          <div className="mt-5 space-y-3">
            {report.topLandingPages.length ? (
              report.topLandingPages.slice(0, 12).map((page) => (
                <div key={page.path} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link href={page.path} className="text-sm font-semibold text-[#E8EEF8] transition hover:text-[var(--marketing-accent)]">
                      {page.path}
                    </Link>
                    <span className="text-xs text-[var(--marketing-muted)]">{contentTypeLabel(page.contentType)}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-[var(--marketing-muted)]">
                    <span>访问 {page.count}</span>
                    <span>转化 {page.conversionCount}</span>
                  </div>
                </div>
              ))
            ) : (
              <EmptyNote text="暂时还没有 SEO 落地页数据。部署后访问数据会自动进入这里。" />
            )}
          </div>
        </section>

        <section className="surface-panel p-6">
          <h2 className="text-xl font-semibold text-[var(--marketing-text)]">来源分布</h2>
          <div className="mt-5 space-y-3">
            {report.trafficSources.length ? (
              report.trafficSources.slice(0, 10).map((source) => (
                <div key={`${source.source}-${source.medium}`} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
                  <span className="font-semibold text-[#E8EEF8]">{source.source}</span>
                  <span className="text-xs text-[var(--marketing-muted)]">
                    {source.medium} · {source.count}
                  </span>
                </div>
              ))
            ) : (
              <EmptyNote text="暂无来源分布数据。" />
            )}
          </div>
        </section>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <section className="surface-panel p-6">
          <h2 className="text-xl font-semibold text-[var(--marketing-text)]">关键词与站内搜索机会</h2>
          <div className="mt-5 space-y-3">
            {report.searchQueries.length ? (
              report.searchQueries.slice(0, 16).map((query) => (
                <div key={query.query} className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-[#E8EEF8]">{query.query}</p>
                    <p className="mt-1 text-xs text-[var(--marketing-muted)]">{query.covered ? "已有内容覆盖" : "内容缺口，建议优先补"}</p>
                  </div>
                  <span className="text-sm font-semibold text-[var(--marketing-accent)]">{query.count}</span>
                </div>
              ))
            ) : (
              <EmptyNote text="暂无可用关键词。Search Console 可以补充更完整的曝光词，站内搜索会自动积累。" />
            )}
          </div>
        </section>

        <section className="surface-panel p-6">
          <h2 className="text-xl font-semibold text-[var(--marketing-text)]">内容类型流量结构</h2>
          <div className="mt-5 space-y-3">
            {report.contentTypeMix.length ? (
              report.contentTypeMix.map((row) => (
                <div key={row.contentType} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-[#E8EEF8]">{contentTypeLabel(row.contentType)}</span>
                    <span className="text-[var(--marketing-accent)]">{row.count}</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-[var(--marketing-accent)]" style={{ width: `${Math.min(100, Math.max(6, row.count * 12))}%` }} />
                  </div>
                </div>
              ))
            ) : (
              <EmptyNote text="暂无内容类型数据。" />
            )}
          </div>
        </section>
      </div>

      <section className="surface-panel mt-8 p-6">
        <h2 className="text-xl font-semibold text-[var(--marketing-text)]">建议配套使用的外部 SEO 工具</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ToolNote title="Google Search Console" text="跟踪 Google 搜索曝光、点击、CTR、平均排名、索引状态和页面问题。" />
          <ToolNote title="Bing Webmaster Tools" text="跟踪 Bing 搜索表现，也覆盖一部分 Copilot/Edge 生态入口。" />
          <ToolNote title="PageSpeed Insights" text="查看真实用户 Core Web Vitals 和页面性能，辅助技术 SEO 优化。" />
          <ToolNote title="站内 SEO 洞察" text="跟踪用户进站后的行为、转化和内容机会，生成下一步运营建议。" />
        </div>
      </section>
    </AdminSection>
  );
}

function InsightStat({ label, value, accent = false }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className="surface-panel p-5">
      <p className="text-sm text-[var(--marketing-muted)]">{label}</p>
      <p className={`mt-3 text-3xl font-semibold ${accent ? "text-[var(--marketing-accent)]" : "text-[#E8EEF8]"}`}>{value}</p>
    </div>
  );
}

function RecommendationCard({ item }: { item: SeoInsightRecommendation }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${priorityClass(item.priority)}`}>{priorityLabel(item.priority)}</span>
        <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-[var(--marketing-muted)]">{targetTypeLabel(item.targetType)}</span>
      </div>
      <h3 className="mt-4 text-lg font-semibold leading-7 text-[#E8EEF8]">{item.title}</h3>
      <p className="mt-3 text-sm leading-7 text-[var(--marketing-muted)]">{item.reason}</p>
      <p className="mt-4 rounded-xl border border-[var(--marketing-accent)]/20 bg-[var(--marketing-accent)]/8 p-4 text-sm leading-7 text-[#E8EEF8]">{item.action}</p>
    </article>
  );
}

function EmptyNote({ text }: { text: string }) {
  return <p className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm leading-7 text-[var(--marketing-muted)]">{text}</p>;
}

function ToolNote({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <h3 className="text-base font-semibold text-[#E8EEF8]">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-[var(--marketing-muted)]">{text}</p>
    </div>
  );
}

function priorityLabel(priority: SeoInsightRecommendation["priority"]) {
  if (priority === "high") return "高优先级";
  if (priority === "medium") return "中优先级";
  return "观察";
}

function priorityClass(priority: SeoInsightRecommendation["priority"]) {
  if (priority === "high") return "bg-[#F05A35] text-white";
  if (priority === "medium") return "bg-[#FFB86B]/18 text-[#FFB86B]";
  return "bg-white/10 text-[var(--marketing-muted)]";
}

function targetTypeLabel(targetType: SeoInsightRecommendation["targetType"]) {
  const labels = {
    article: "文章",
    software: "软件应用",
    service: "账号服务",
    course: "技能课程",
    technical_seo: "技术 SEO"
  };
  return labels[targetType];
}

function contentTypeLabel(type: string) {
  const labels: Record<string, string> = {
    home: "首页",
    ai_news_listing: "AI资讯列表",
    ai_news_article: "AI资讯文章",
    software_listing: "软件列表",
    software_detail: "软件详情",
    account_service_listing: "账号服务列表",
    account_service_detail: "账号服务详情",
    skill_learning_listing: "技能学习",
    tutorial_listing: "教程列表",
    pricing: "价格页",
    legal: "法律页面",
    other: "其他"
  };
  return labels[type] ?? type;
}
