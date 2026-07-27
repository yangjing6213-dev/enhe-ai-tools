import Link from "next/link";
import { AdminSection, Field, SubmitButton, inputClass, selectClass, textareaClass } from "@/app/admin/admin-ui";
import {
  GEO_MINIMUM_VALID_SAMPLE_SIZE,
  GEO_MONITORING_QUERIES,
  buildGeoMonitoringReport,
  type GeoMonitoringProvider,
  type GeoMonitoringQuery,
  type GeoMonitoringRecommendation
} from "@/lib/geo-monitoring";
import { prisma } from "@/lib/db";
import { ensureGeoMonitoringDefaults, recordGeoVisibilityResultAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminGeoMonitoringPage() {
  await ensureGeoMonitoringDefaults();
  const latestResultRead = await getLatestGeoVisibilityResults();
  const queryResults = latestResultRead.results.map((result) => ({
    query: result.queryText,
    providerId: result.providerKey,
    collectionStatus:
      result.sentiment === "geo:unavailable"
        ? "unavailable" as const
        : result.sentiment === "geo:uncollected"
          ? "uncollected" as const
          : "collected" as const,
    isBrandMentioned: result.isBrandMentioned,
    isDomainCited: result.isDomainCited,
    citedUrls: result.citedUrls,
    answerSummary: result.answerSummary,
    screenshotUrl: result.screenshotUrl,
    checkedAt: result.checkedAt,
    competitors: result.competitors
  }));
  const [savedQueries, savedProviders] = await Promise.all([
    prisma.geoQuery.count().catch(() => 0),
    prisma.geoProvider.count().catch(() => 0)
  ]);
  const report = buildGeoMonitoringReport({ queryResults });
  const globalProviders = report.providers.filter((provider) => provider.region === "global");
  const chinaProviders = report.providers.filter((provider) => provider.region === "china");

  return (
    <AdminSection
      title="GEO 人工巡检证据台账"
      intro="仅记录 ChatGPT、Perplexity、Google AI Overview、Claude，以及百度、豆包、Kimi、通义、腾讯元宝、DeepSeek 等平台的人工巡检样本；本页面不代表自动监控或真实自动采集。"
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-8">
        <GeoStat label="核心查询" value={report.summary.totalQueries} accent />
        <GeoStat label="人工巡检平台" value={report.summary.eligibleProviders} />
        <GeoStat label="已记录结果" value={report.summary.recordedResults} />
        <GeoStat label="有效样本数" value={report.summary.validSampleCount} />
        <GeoStat label="目标覆盖" value={`${report.summary.validSampleCount} / ${report.summary.targetSampleCount}`} />
        <GeoStat label="品牌提及率" value={formatRate(report.summary.brandMentionRate)} />
        <GeoStat label="官网引用率" value={formatRate(report.summary.domainCitationRate)} />
        <GeoStat
          label="人工证据状态"
          value={latestResultRead.failed ? "读取失败" : evidenceStatusLabel(report.summary.evidenceStatus)}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-y border-white/10 py-3 text-sm text-[var(--marketing-muted)]">
        <span>日期范围：{formatDateRange(report.summary.firstCheckedAt, report.summary.lastCheckedAt)}</span>
        <span>最近巡检时间：{formatCheckedAt(report.summary.lastCheckedAt)}</span>
        <span>最低有效样本：{GEO_MINIMUM_VALID_SAMPLE_SIZE} 条</span>
        <span>已排除搜索绩效结果：{report.summary.excludedResults} 条</span>
        {latestResultRead.failed ? <span>数据库读取失败，当前按空态显示。</span> : null}
        <span>阶段边界：不含完整审核人、证据哈希、自动采集或数据库迁移。</span>
      </div>

      <section className="surface-panel mt-8 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-[var(--marketing-text)]">人工巡检平台范围</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--marketing-muted)]">
              台账只保存人工浏览器巡检证据。GSC 与 Bing Webmaster 仅作为搜索绩效来源，不计入 AI 品牌提及率、官网引用率或内容建议。
            </p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-semibold text-[var(--marketing-muted)]">
            数据库已保存 {savedProviders} 个平台
          </span>
        </div>
        <div className="mt-6 grid gap-5 xl:grid-cols-2">
          <ProviderGroup title="国际搜索与 AI 答案平台" providers={globalProviders} />
          <ProviderGroup title="中国搜索与 AI 模型平台" providers={chinaProviders} />
        </div>
      </section>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="surface-panel p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-[var(--marketing-text)]">20+ 核心 GEO 查询</h2>
            <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-semibold text-[var(--marketing-muted)]">
              数据库已保存 {savedQueries} 条查询
            </span>
          </div>
          <div className="mt-5 grid gap-3">
            {GEO_MONITORING_QUERIES.map((query) => (
              <QueryRow key={query.id} query={query} />
            ))}
          </div>
        </section>

        <section className="surface-panel p-6">
          <h2 className="text-xl font-semibold text-[var(--marketing-text)]">下一步优化建议</h2>
          <div className="mt-5 space-y-4">
            {report.recommendations.length ? report.recommendations.map((item) => (
              <RecommendationCard key={`${item.type}-${item.query}`} item={item} />
            )) : (
              <p className="text-sm leading-7 text-[var(--marketing-muted)]">暂无基于有效人工样本的内容建议。</p>
            )}
          </div>
        </section>
      </div>

      <section className="surface-panel mt-8 p-6">
        <h2 className="text-xl font-semibold text-[var(--marketing-text)]">月度巡检流程</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ProcessCard title="1. 人工运行核心查询" text="每月由人员在国际平台与中国平台分别检查 20+ 个查询，记录是否出现 ENHE AI、官网链接和竞品来源。" />
          <ProcessCard title="2. 保存人工证据" text="保存原始回答摘要、引用 URL、截图地址、竞争品牌和情绪判断，形成可回溯的人工巡检样本。" />
          <ProcessCard title="3. 生成内容动作" text="根据缺口补 FAQ、对比表、来源引用、可摘录答案段，并把高价值主题写入 OKF 概念页。" />
          <ProcessCard title="4. 回看转化路径" text="把 GEO 建议连接到站内 AI 资讯、软件应用、账号服务和技能教程，优先补能带来转化的页面。" />
        </div>
      </section>

      <section className="surface-panel mt-8 p-6">
        <h2 className="text-xl font-semibold text-[var(--marketing-text)]">记录巡检结果</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--marketing-muted)]">
          仅用于人工录入 ChatGPT、Perplexity、百度、豆包等平台的巡检证据。官网引用只有在同时提供 enhe-tech.com.cn 官方 URL 和原始回答摘要或截图证据时才会计入。
        </p>
        <form action={recordGeoVisibilityResultAction} className="mt-6 grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 md:grid-cols-2">
          <Field label="查询词">
            <select name="queryText" className={selectClass} defaultValue={GEO_MONITORING_QUERIES[0]?.query}>
              {GEO_MONITORING_QUERIES.map((query) => (
                <option key={query.id} value={query.query}>
                  {query.query}
                </option>
              ))}
            </select>
          </Field>
          <Field label="平台">
            <select name="providerKey" className={selectClass} defaultValue={globalProviders[0]?.id}>
              {report.providers.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="人工证据状态" className="md:col-span-2">
            <select name="collectionStatus" className={selectClass} defaultValue="collected">
              <option value="collected">人工样本已记录</option>
              <option value="uncollected">尚未人工巡检</option>
              <option value="unavailable">平台不可用</option>
            </select>
          </Field>
          <Field label="回答摘要" className="md:col-span-2">
            <textarea name="answerSummary" className={textareaClass} placeholder="粘贴平台回答中的关键摘要、是否推荐竞品、是否出现 ENHE AI。" />
          </Field>
          <Field label="引用链接，每行一个" className="md:col-span-2">
            <textarea name="citedUrls" className={textareaClass} placeholder="https://www.enhe-tech.com.cn/ai-news/..." />
          </Field>
          <Field label="竞品或被引用品牌">
            <textarea name="competitors" className={textareaClass} placeholder="每行一个竞品、工具或网站名称" />
          </Field>
          <div className="grid gap-4">
            <Field label="截图 URL">
              <input name="screenshotUrl" className={inputClass} placeholder="可选，填写巡检截图地址" />
            </Field>
            <Field label="情绪判断">
              <input name="sentiment" className={inputClass} placeholder="正向 / 中性 / 负向 / 未提及" />
            </Field>
            <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-[#E8EEF8]">
              <input name="isBrandMentioned" type="checkbox" className="h-4 w-4 accent-[var(--marketing-accent)]" />
              已提及 ENHE AI
            </label>
          </div>
          <div className="md:col-span-2">
            <SubmitButton pendingLabel="保存中...">保存人工巡检样本</SubmitButton>
          </div>
        </form>
      </section>
    </AdminSection>
  );
}

async function getLatestGeoVisibilityResults() {
  try {
    const groups = await prisma.geoVisibilityResult.groupBy({
      by: ["queryText", "providerKey"],
      _max: { checkedAt: true }
    });
    const latestFilters = groups.flatMap((group) =>
      group._max.checkedAt
        ? [{
            queryText: group.queryText,
            providerKey: group.providerKey,
            checkedAt: group._max.checkedAt
          }]
        : []
    );
    if (!latestFilters.length) return { results: [], failed: false };

    const candidates = await prisma.geoVisibilityResult.findMany({
      where: { OR: latestFilters },
      select: {
        id: true,
        queryText: true,
        providerKey: true,
        isBrandMentioned: true,
        isDomainCited: true,
        citedUrls: true,
        answerSummary: true,
        screenshotUrl: true,
        competitors: true,
        sentiment: true,
        checkedAt: true,
        createdAt: true
      },
      orderBy: [{ checkedAt: "desc" }, { createdAt: "desc" }, { id: "desc" }]
    });
    const latestByQueryProvider = new Map<string, (typeof candidates)[number]>();
    for (const candidate of candidates) {
      const key = JSON.stringify([candidate.queryText, candidate.providerKey]);
      if (!latestByQueryProvider.has(key)) latestByQueryProvider.set(key, candidate);
    }
    return { results: Array.from(latestByQueryProvider.values()), failed: false };
  } catch (error) {
    console.error("[geo-monitoring] failed to load latest visibility results", error);
    return { results: [], failed: true };
  }
}

function formatRate(value: number | null) {
  return value === null ? "数据不足" : `${value}%`;
}

function evidenceStatusLabel(status: "no_records" | "insufficient" | "sufficient") {
  if (status === "no_records") return "暂无人工证据";
  if (status === "insufficient") return "数据不足";
  return "人工样本已达阈值";
}

function formatDateRange(firstCheckedAt: string | null, lastCheckedAt: string | null) {
  if (!firstCheckedAt || !lastCheckedAt) return "暂无巡检记录";
  return `${formatCheckedAt(firstCheckedAt)} - ${formatCheckedAt(lastCheckedAt)}`;
}

function formatCheckedAt(value: string | null) {
  if (!value) return "暂无巡检记录";
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function GeoStat({ label, value, accent = false }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className="surface-panel p-5">
      <p className="text-sm text-[var(--marketing-muted)]">{label}</p>
      <p className={`mt-3 text-3xl font-semibold ${accent ? "text-[var(--marketing-accent)]" : "text-[#E8EEF8]"}`}>{value}</p>
    </div>
  );
}

function ProviderGroup({ title, providers }: { title: string; providers: GeoMonitoringProvider[] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <h3 className="text-base font-semibold text-[#E8EEF8]">{title}</h3>
      <div className="mt-4 grid gap-3">
        {providers.map((provider) => (
          <a
            key={provider.id}
            href={provider.officialUrl}
            target="_blank"
            rel="nofollow noopener noreferrer"
            className="rounded-xl border border-white/10 bg-black/10 p-4 transition hover:border-[var(--marketing-accent)]/40 hover:bg-[var(--marketing-accent)]/8"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-[#E8EEF8]">{provider.name}</span>
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-[var(--marketing-muted)]">
                {modeLabel(provider.mode)}
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-[var(--marketing-muted)]">{provider.description}</p>
          </a>
        ))}
      </div>
    </div>
  );
}

function QueryRow({ query }: { query: GeoMonitoringQuery }) {
  return (
    <Link
      href={query.targetPath}
      className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-[var(--marketing-accent)]/40 hover:bg-[var(--marketing-accent)]/8"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#E8EEF8]">{query.query}</p>
          <p className="mt-1 text-xs text-[var(--marketing-muted)]">{query.tags.join(" / ")}</p>
        </div>
        <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-[var(--marketing-muted)]">
          {intentLabel(query.intent)}
        </span>
      </div>
    </Link>
  );
}

function RecommendationCard({ item }: { item: GeoMonitoringRecommendation }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${priorityClass(item.priority)}`}>{priorityLabel(item.priority)}</span>
        <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-[var(--marketing-muted)]">{recommendationTypeLabel(item.type)}</span>
      </div>
      <h3 className="mt-4 text-lg font-semibold leading-7 text-[#E8EEF8]">{item.title}</h3>
      <p className="mt-3 text-sm leading-7 text-[var(--marketing-muted)]">{item.reason}</p>
      <p className="mt-4 rounded-xl border border-[var(--marketing-accent)]/20 bg-[var(--marketing-accent)]/8 p-4 text-sm leading-7 text-[#E8EEF8]">{item.action}</p>
      <Link href={item.targetPath} className="mt-4 inline-flex text-sm font-semibold text-[var(--marketing-accent)] hover:text-[#FFB86B]">
        查看目标页面
      </Link>
    </article>
  );
}

function ProcessCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <h3 className="text-base font-semibold text-[#E8EEF8]">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-[var(--marketing-muted)]">{text}</p>
    </div>
  );
}

function modeLabel(mode: GeoMonitoringProvider["mode"]) {
  if (mode === "api") return "API";
  if (mode === "search_console") return "GSC 搜索绩效（不计 AI）";
  if (mode === "bing_webmaster") return "Bing 搜索绩效（不计 AI）";
  return "人工浏览器巡检";
}

function intentLabel(intent: GeoMonitoringQuery["intent"]) {
  const labels: Record<GeoMonitoringQuery["intent"], string> = {
    recommendation: "推荐",
    deployment: "部署",
    compliance: "合规",
    tutorial: "教程",
    comparison: "对比",
    trend: "趋势"
  };
  return labels[intent];
}

function priorityLabel(priority: GeoMonitoringRecommendation["priority"]) {
  if (priority === "high") return "高优先级";
  if (priority === "medium") return "中优先级";
  return "观察";
}

function priorityClass(priority: GeoMonitoringRecommendation["priority"]) {
  if (priority === "high") return "bg-[#F05A35] text-white";
  if (priority === "medium") return "bg-[#FFB86B]/18 text-[#FFB86B]";
  return "bg-white/10 text-[var(--marketing-muted)]";
}

function recommendationTypeLabel(type: GeoMonitoringRecommendation["type"]) {
  const labels: Record<GeoMonitoringRecommendation["type"], string> = {
    faq: "FAQ",
    comparison_table: "对比表",
    source_citation: "来源引用",
    answer_block: "答案段",
    okf_concept: "OKF"
  };
  return labels[type];
}
