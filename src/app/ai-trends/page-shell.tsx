import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  Code2,
  FileSearch,
  GraduationCap,
  HeartHandshake,
  LineChart,
  Scale,
  Sparkles,
  Video,
  WalletCards
} from "lucide-react";
import { StructuredData } from "@/components/structured-data";
import { Badge, ButtonLink, Container, SectionTitle } from "@/components/ui";
import { getAiTrendBriefingSummaries, localizeAiTrendBriefingView } from "@/lib/ai-trends";
import { type Locale } from "@/lib/dictionaries";
import {
  absoluteUrl,
  buildBreadcrumbSchema,
  buildFaqSchema,
  buildLanguageAlternates,
  buildLocalePath,
  buildMetaDescription,
  buildMetadataTitle,
  defaultOgImage,
  siteName
} from "@/lib/seo";

const topicPath = "/ai-trends";

const content = {
  zh: {
    title: "人类最渴望用 AI 解决哪些问题",
    description:
      "ENHE AI 持续整理公开趋势信号，观察用户最希望用 AI 解决的工作效率、视频生成、内容创作、编程、学习、搜索研究、营销销售和生活辅助问题。",
    hero:
      "核心结论：用户最渴望 AI 解决的不是抽象智能问题，而是把高频、耗时、需要专业判断的任务变成可复用、可验证、可交付的工作流。",
    demandTitle: "需求热度排行",
    demandIntro:
      "热度不是单一搜索量，而是综合公开趋势信号、产品更新密度、创作者和开发者讨论、商业化成熟度后的判断。",
    scenarioTitle: "工作效率细分场景排行",
    scenarioIntro: "当工作效率位居最高热度时，下一步开发不应只停留在泛效率工具，而要优先看具体任务的频次、痛感、付费意愿和接入难度。",
    scenarioPriority: "开发优先级",
    prioritiesTitle: "机会优先级建议",
    prioritiesIntro: "优先做高频、低合规风险、能明确节省时间或增加收入的任务型产品。",
    recentTitle: "近期分析",
    recentIntro:
      "每日自动化报告公开摘要可分享，完整 HTML 报告登录后阅读；日更页不会进入 sitemap，也不会参与索引竞争。",
    dailyButton: "查看每日分析",
    newsButton: "查看 AI 前沿资讯",
    readSummary: "阅读摘要",
    emptyRecent: "还没有已发布的每日分析。自动化发布后，这里会显示最近的公开摘要。",
    home: "首页",
    aiTrends: "AI 趋势分析"
  },
  en: {
    title: "What People Most Want AI To Solve",
    description:
      "ENHE AI tracks public demand signals to understand where people most want AI to help across productivity, video, content, coding, learning, research, sales, and everyday assistance.",
    hero:
      "Core conclusion: people do not mainly want abstract intelligence. They want AI to turn high-frequency, time-consuming, judgment-heavy work into repeatable, verifiable, deliverable workflows.",
    demandTitle: "Demand heat ranking",
    demandIntro:
      "Heat is not just search volume. It combines public demand signals, release cadence, creator discussion, developer momentum, and commercial maturity.",
    scenarioTitle: "Work productivity scenario ranking",
    scenarioIntro: "When productivity leads demand, planning should move beyond generic efficiency tools and rank concrete tasks by frequency, pain, willingness to pay, and integration difficulty.",
    scenarioPriority: "Development priority",
    prioritiesTitle: "Opportunity priorities",
    prioritiesIntro:
      "Prioritize task-shaped products with frequent use, lower compliance risk, and clear time-saving or revenue impact.",
    recentTitle: "Recent analysis",
    recentIntro:
      "Daily automated reports publish public summaries for sharing. Full HTML reports are available after sign-in. Daily pages stay out of sitemap and do not compete for indexing.",
    dailyButton: "View daily analysis",
    newsButton: "View AI news",
    readSummary: "Read summary",
    emptyRecent: "No published daily analysis yet. Recent public summaries will appear here after automated publishing runs.",
    home: "Home",
    aiTrends: "AI Trends"
  }
} as const;

const aiTrendsGeoSections = {
  zh: [
    {
      title: "如何用趋势判断下一步行动",
      body: "AI趋势页把公开需求信号、产品更新、创作者讨论、开发者生态和商业成熟度放在一起看。用户可以用它判断下一步应该关注哪类资讯、学习哪项技能、选择哪类软件或规划哪种服务。"
    },
    {
      title: "需求热度代表什么",
      body: "热度不是单一搜索量，而是多种信号的综合判断。排名靠前的方向通常意味着用户痛点更清晰、内容转化路径更短，也更适合优先产出教程、工具合集和落地案例。"
    },
    {
      title: "如何连接站内资源",
      body: "看到趋势后，可以先阅读AI前沿资讯确认背景，再进入AI技能学习补齐方法，最后到AI软件应用或账号服务页面完成工具选择、访问咨询和实际交付。"
    }
  ],
  en: [
    {
      title: "How to use trends to choose the next action",
      body: "The AI trends page combines public demand signals, product updates, creator discussion, developer momentum, and commercial maturity. Users can decide what news to watch, what skill to learn, what software to try, or what service to plan next."
    },
    {
      title: "What demand heat means",
      body: "Demand heat is not a single search-volume metric. It reflects multiple signals. Higher-ranked areas usually have clearer pain points, shorter conversion paths, and stronger potential for tutorials, tool collections, and implementation cases."
    },
    {
      title: "How to connect site resources",
      body: "After identifying a trend, read AI news for context, use AI skill courses to learn the method, then choose software apps or account service guidance to complete the workflow."
    }
  ]
} as const;

const aiTrendsAnswerBlock = {
  zh: "ENHE AI 趋势分析的核心判断是：用户最希望 AI 解决高频、耗时、需要专业判断的任务，例如办公自动化、视频生成、内容创作、编程开发、搜索研究和学习。下一步应把趋势转化为软件选择、技能学习和可交付工作流。",
  en: "ENHE AI's trend analysis shows that users most want AI to solve frequent, time-consuming, judgment-heavy tasks such as office automation, video generation, content creation, coding, research, and learning. The next step is turning demand signals into software choices, skills, and deliverable workflows.",
} as const;

const aiTrendsSourceLinks = [
  {
    title: "Google Trends",
    href: "https://trends.google.com/trends/",
  },
  {
    title: "GitHub Trending",
    href: "https://github.com/trending",
  },
  {
    title: "Product Hunt Artificial Intelligence",
    href: "https://www.producthunt.com/topics/artificial-intelligence",
  },
] as const;

const aiTrendsFaqItems = {
  zh: [
    {
      question: "AI趋势热度排行的数据应该如何理解？",
      answer:
        "趋势热度不是单一搜索量，而是综合公开搜索趋势、产品发布密度、开发者生态、创作者讨论和商业成熟度后的方向性判断，适合用于内容选题和产品优先级规划。",
    },
    {
      question: "AI趋势页面如何帮助我决定下一步做什么？",
      answer:
        "先看高热度方向，再选择对应的AI前沿资讯、AI软件应用、AI技能课程或账号服务咨询，把趋势转化为可执行的工具测试、教程学习和工作流搭建。",
    },
    {
      question: "AI趋势分析是否等同于投资或商业承诺？",
      answer:
        "不是。AI趋势分析用于内容、工具和学习方向判断，不构成投资、法律或确定性商业承诺。重要决策应结合官方来源、实际测试和自身业务场景。",
    },
  ],
  en: [
    {
      question: "How should I interpret the AI demand heat ranking?",
      answer:
        "Demand heat is not a single search-volume metric. It combines public search signals, release cadence, developer momentum, creator discussion, and commercial maturity for content and product planning.",
    },
    {
      question: "How does the AI Trends page help me choose the next action?",
      answer:
        "Start with high-demand areas, then move to related AI news, software apps, skill courses, or account service guidance so a trend becomes a tool test, learning path, or workflow.",
    },
    {
      question: "Is AI trend analysis an investment or business guarantee?",
      answer:
        "No. The page supports content, product, and learning decisions. It is not investment, legal, or guaranteed business advice. Validate important decisions with official sources and real tests.",
    },
  ],
} as const;

const demandDirections = [
  {
    zhName: "工作效率",
    enName: "Work productivity",
    heat: 96,
    zhSignal: "搜索趋势 / SaaS 产品发布 / 企业预算",
    enSignal: "Search trends / SaaS releases / enterprise budgets",
    icon: BriefcaseBusiness
  },
  {
    zhName: "视频生成",
    enName: "Video generation",
    heat: 92,
    zhSignal: "创作者社区 / 模型更新 / 工具榜单",
    enSignal: "Creator communities / model updates / tool rankings",
    icon: Video
  },
  {
    zhName: "内容创作",
    enName: "Content creation",
    heat: 89,
    zhSignal: "社媒讨论 / 模板市场 / 自媒体需求",
    enSignal: "Social discussion / template markets / creator demand",
    icon: Sparkles
  },
  {
    zhName: "编程开发",
    enName: "Coding and development",
    heat: 86,
    zhSignal: "开发者工具 / GitHub 生态 / IDE 集成",
    enSignal: "Developer tools / GitHub ecosystem / IDE integration",
    icon: Code2
  },
  {
    zhName: "学习教育",
    enName: "Learning and education",
    heat: 81,
    zhSignal: "课程产品 / 家庭学习 / 语言学习",
    enSignal: "Course products / family learning / language learning",
    icon: GraduationCap
  },
  {
    zhName: "搜索研究",
    enName: "Search and research",
    heat: 79,
    zhSignal: "AI 搜索 / 知识库 / 研究助手",
    enSignal: "AI search / knowledge bases / research assistants",
    icon: FileSearch
  },
  {
    zhName: "营销销售",
    enName: "Marketing and sales",
    heat: 75,
    zhSignal: "CRM / 广告素材 / 客户触达",
    enSignal: "CRM / ad assets / customer outreach",
    icon: LineChart
  },
  {
    zhName: "办公自动化",
    enName: "Office automation",
    heat: 72,
    zhSignal: "文档表格 / 会议纪要 / 流程编排",
    enSignal: "Docs and sheets / meeting notes / workflow orchestration",
    icon: WalletCards
  },
  {
    zhName: "情感陪伴",
    enName: "Companion experiences",
    heat: 66,
    zhSignal: "消费应用 / 社区反馈 / 长时互动",
    enSignal: "Consumer apps / community feedback / long sessions",
    icon: HeartHandshake
  },
  {
    zhName: "财务法律辅助",
    enName: "Finance and legal support",
    heat: 61,
    zhSignal: "高风险咨询 / 合同审阅 / 合规工具",
    enSignal: "Higher-risk advisory / contract review / compliance tools",
    icon: Scale
  }
] as const;

const workProductivityScenarioRanking = [
  {
    zhName: "会议纪要与行动项追踪",
    enName: "Meeting notes and action follow-up",
    heat: 94,
    priority: "A",
    zhPain: "会后信息散落、责任人不清、CRM 和项目管理系统需要重复录入。",
    enPain: "Meeting context is scattered, owners are unclear, and CRM or project systems need duplicate updates.",
    zhOpportunity: "会议助手、销售跟进插件、项目管理自动同步。",
    enOpportunity: "Meeting assistants, sales follow-up plugins, and automatic project-management sync."
  },
  {
    zhName: "文档和报告初稿",
    enName: "Document and report drafting",
    heat: 90,
    priority: "A",
    zhPain: "空白页启动慢，资料整理和结构化表达耗时。",
    enPain: "Blank-page starts are slow, and turning raw material into structured writing takes time.",
    zhOpportunity: "行业模板、知识库写作、周报和方案生成。",
    enOpportunity: "Industry templates, knowledge-base writing, weekly reports, and proposal generation."
  },
  {
    zhName: "表格整理与数据清洗",
    enName: "Spreadsheet cleanup and data preparation",
    heat: 87,
    priority: "A",
    zhPain: "大量运营、财务、销售表格需要去重、归类、补字段和解释异常。",
    enPain: "Operations, finance, and sales sheets need deduplication, grouping, field completion, and anomaly explanation.",
    zhOpportunity: "表格助手、批量清洗、自动图表和经营摘要。",
    enOpportunity: "Spreadsheet assistants, batch cleanup, auto charts, and business summaries."
  },
  {
    zhName: "邮件和客户回复草拟",
    enName: "Email and customer reply drafting",
    heat: 84,
    priority: "A-",
    zhPain: "客服、销售和运营需要快速回复但又要保持语气、事实和上下文一致。",
    enPain: "Support, sales, and operations teams need fast replies while keeping tone, facts, and context consistent.",
    zhOpportunity: "客服知识库回复、销售邮件、售后解释和多语言回复。",
    enOpportunity: "Support knowledge-base replies, sales emails, after-sales explanations, and multilingual responses."
  },
  {
    zhName: "搜索研究与资料汇总",
    enName: "Research synthesis and source collection",
    heat: 82,
    priority: "B+",
    zhPain: "信息源多、可信度参差、人工整理引用链路耗时。",
    enPain: "Sources are scattered, credibility varies, and manual citation trails take time.",
    zhOpportunity: "可信来源研究包、竞品监控、市场摘要和引用可复核报告。",
    enOpportunity: "Trusted research packs, competitor monitoring, market summaries, and verifiable cited reports."
  },
  {
    zhName: "跨应用流程自动化",
    enName: "Cross-app workflow automation",
    heat: 78,
    priority: "B",
    zhPain: "数据在聊天、表格、邮件、CRM 和网盘之间来回搬运。",
    enPain: "Data keeps moving manually across chat, sheets, email, CRM, and cloud drives.",
    zhOpportunity: "轻量 RPA、个人办公代理、自动填表和状态同步。",
    enOpportunity: "Lightweight RPA, personal office agents, form filling, and status sync."
  }
] as const;
const opportunityPriorities = [
  {
    level: "A",
    zhTitle: "可量化省时的工作流",
    enTitle: "Quantifiable time-saving workflows",
    zhDetail: "最适合先做工具化和服务化，用户愿意为稳定交付、模板和流程集成付费。",
    enDetail:
      "Best for productization and service packaging. Users are willing to pay for reliable delivery, templates, and workflow integration."
  },
  {
    level: "A",
    zhTitle: "视频与多模态内容生产",
    enTitle: "Video and multimodal production",
    zhDetail: "需求热但竞争强，机会在垂直场景、素材管理、版权合规和批量生产。",
    enDetail:
      "Demand is hot but competition is strong. Opportunity sits in vertical use cases, asset management, rights compliance, and batch production."
  },
  {
    level: "B",
    zhTitle: "搜索研究与学习助手",
    enTitle: "Research and learning assistants",
    zhDetail: "适合做可信来源、任务型研究包和教育陪练，重点是引用透明与结果可复核。",
    enDetail:
      "Good for trustworthy-source workflows, task-shaped research packs, and education companions where transparent sourcing matters."
  },
  {
    level: "C",
    zhTitle: "情感、健康、财务与法律辅助",
    enTitle: "Emotional, health, finance, and legal assistance",
    zhDetail: "用户痛点真实，但需要更强边界、免责声明、人工转介和合规设计。",
    enDetail:
      "The pain points are real, but these areas need stronger guardrails, disclaimers, human escalation, and compliance design."
  }
] as const;

export function generateAiTrendTopicMetadata(locale: Locale = "zh"): Metadata {
  const copy = content[locale];
  const title = buildMetadataTitle({ pageTitle: copy.title, brand: siteName });
  const description = buildMetaDescription(copy.description, undefined, 150);
  const canonicalPath = buildLocalePath(topicPath, locale);

  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl(canonicalPath),
      languages: buildLanguageAlternates(topicPath)
    },
    robots: {
      index: true,
      follow: true
    },
    openGraph: {
      title,
      description,
      url: absoluteUrl(canonicalPath),
      siteName,
      images: [{ url: absoluteUrl(defaultOgImage), alt: copy.title }],
      locale: locale === "en" ? "en_US" : "zh_CN",
      type: "website"
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [absoluteUrl(defaultOgImage)]
    }
  };
}

export async function AiTrendTopicPageShell({ forceLocale = "zh" }: { forceLocale?: Locale } = {}) {
  const copy = content[forceLocale];
  const recentBriefings = (await getAiTrendBriefingSummaries(3)).map((briefing) => localizeAiTrendBriefingView(briefing, forceLocale));
  const breadcrumbSchema = buildBreadcrumbSchema({
    items: [
      { name: copy.home, path: buildLocalePath("/", forceLocale) },
      { name: copy.aiTrends, path: buildLocalePath(topicPath, forceLocale) }
    ]
  });
  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: copy.title,
    description: copy.description,
    url: absoluteUrl(buildLocalePath(topicPath, forceLocale)),
    inLanguage: forceLocale === "en" ? "en-US" : "zh-CN"
  };
  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: copy.title,
    description: copy.description,
    url: absoluteUrl(buildLocalePath(topicPath, forceLocale)),
    inLanguage: forceLocale === "en" ? "en-US" : "zh-CN",
    mainEntity: {
      "@type": "Thing",
      name: "AI demand trends",
      description: aiTrendsAnswerBlock[forceLocale],
    },
    citation: aiTrendsSourceLinks.map((source) => ({
      "@type": "CreativeWork",
      name: source.title,
      url: source.href,
    })),
  };
  const faqSchema = buildFaqSchema({
    items: aiTrendsFaqItems[forceLocale].map((item) => ({
      question: item.question,
      answer: item.answer,
    })),
  });

  return (
    <main>
      <Container className="py-14">
        <StructuredData
          data={[breadcrumbSchema, collectionSchema, webPageSchema, faqSchema]}
        />
        <section className="surface-panel overflow-hidden p-7 md:p-10">
        <div className="max-w-4xl">
          <Badge className="text-[var(--marketing-accent)]">AI Demand Trends</Badge>
          <h1 className="mt-6 max-w-4xl text-4xl font-black leading-tight text-[var(--marketing-text)] md:text-6xl">
            {copy.title}
          </h1>
          <p className="mt-5 max-w-3xl text-base font-medium leading-8 text-[var(--marketing-muted)] md:text-lg">
            {copy.hero}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <ButtonLink href={buildLocalePath("/ai-trends/daily", forceLocale)}>{copy.dailyButton}</ButtonLink>
            <ButtonLink href={buildLocalePath("/ai-news", forceLocale)} variant="ghost">
              {copy.newsButton}
            </ButtonLink>
          </div>
        </div>
        </section>

        <AiTrendsGeoBlock forceLocale={forceLocale} />

        <section className="glass mt-8 rounded-2xl p-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--marketing-accent)]">
            {forceLocale === "en" ? "Extractable answer" : "可摘录答案"}
          </p>
          <h2 className="mt-4 text-2xl font-black text-[var(--marketing-text)]">
            {forceLocale === "en"
              ? "What AI demand means now"
              : "当前AI需求意味着什么"}
          </h2>
          <p className="mt-4 max-w-4xl text-base leading-8 text-[var(--marketing-muted)]">
            {aiTrendsAnswerBlock[forceLocale]}
          </p>
        </section>

        <section className="mt-12">
        <SectionTitle title={copy.demandTitle} intro={copy.demandIntro} />
        <div className="grid gap-4 md:grid-cols-2">
          {demandDirections.map((item) => (
            <article key={item.zhName} className="surface-panel-soft p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--marketing-accent)]/12 text-[var(--marketing-accent)]">
                    <item.icon size={19} strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-lg font-black text-[var(--marketing-text)]">
                      {forceLocale === "en" ? item.enName : item.zhName}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-[var(--marketing-muted)]">
                      {forceLocale === "en" ? item.enSignal : item.zhSignal}
                    </p>
                  </div>
                </div>
                <strong className="text-2xl font-black text-[var(--marketing-accent)]">{item.heat}</strong>
              </div>
              <div className="mt-4 h-2 rounded-full bg-white/8">
                <div className="h-full rounded-full bg-[var(--marketing-accent)]" style={{ width: `${item.heat}%` }} />
              </div>
            </article>
          ))}
        </div>
        </section>

        <section className="mt-12">
        <SectionTitle title={copy.scenarioTitle} intro={copy.scenarioIntro} />
        <div className="grid gap-4 lg:grid-cols-3">
          {workProductivityScenarioRanking.map((scenario, index) => (
            <article key={scenario.zhName} className="surface-panel-soft p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Badge className="text-[var(--marketing-accent)]">#{index + 1}</Badge>
                  <h2 className="mt-3 text-lg font-black leading-snug text-[var(--marketing-text)]">
                    {forceLocale === "en" ? scenario.enName : scenario.zhName}
                  </h2>
                </div>
                <div className="text-right">
                  <strong className="block text-2xl font-black text-[var(--marketing-accent)]">{scenario.heat}</strong>
                  <span className="mt-1 block text-xs font-bold text-[var(--marketing-muted)]">
                    {copy.scenarioPriority} {scenario.priority}
                  </span>
                </div>
              </div>
              <div className="mt-4 h-2 rounded-full bg-white/8">
                <div className="h-full rounded-full bg-[var(--marketing-accent)]" style={{ width: `${scenario.heat}%` }} />
              </div>
              <p className="mt-4 text-sm leading-7 text-[var(--marketing-muted)]">
                {forceLocale === "en" ? scenario.enPain : scenario.zhPain}
              </p>
              <p className="mt-3 text-sm font-bold leading-7 text-[var(--marketing-text)]">
                {forceLocale === "en" ? scenario.enOpportunity : scenario.zhOpportunity}
              </p>
            </article>
          ))}
        </div>
        </section>

        <section className="mt-12">
        <SectionTitle title={copy.prioritiesTitle} intro={copy.prioritiesIntro} />
        <div className="grid gap-4 lg:grid-cols-4">
          {opportunityPriorities.map((item) => (
            <article key={`${item.level}-${item.zhTitle}`} className="surface-panel-soft p-5">
              <Badge className="text-[var(--marketing-accent)]">Priority {item.level}</Badge>
              <h2 className="mt-4 text-lg font-black leading-snug text-[var(--marketing-text)]">
                {forceLocale === "en" ? item.enTitle : item.zhTitle}
              </h2>
              <p className="mt-3 text-sm leading-7 text-[var(--marketing-muted)]">
                {forceLocale === "en" ? item.enDetail : item.zhDetail}
              </p>
            </article>
          ))}
        </div>
        </section>

        <section className="mt-12 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="glass rounded-2xl p-6">
            <h2 className="text-2xl font-black text-[var(--marketing-text)]">
              {forceLocale === "en" ? "AI Trends FAQ" : "AI趋势常见问题"}
            </h2>
            <div className="mt-5 grid gap-4">
              {aiTrendsFaqItems[forceLocale].map((item) => (
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
          </div>
          <aside className="glass rounded-2xl p-6">
            <h2 className="text-2xl font-black text-[var(--marketing-text)]">
              {forceLocale === "en" ? "Source citations" : "趋势参考来源"}
            </h2>
            <div className="mt-5 grid gap-3">
              {aiTrendsSourceLinks.map((source) => (
                <a
                  key={source.href}
                  href={source.href}
                  target="_blank"
                  rel="nofollow noopener noreferrer"
                  className="rounded-xl border border-white/10 bg-white/7 p-4 text-sm font-semibold text-[var(--marketing-text)] transition hover:border-[var(--marketing-accent)]/45 hover:text-[var(--marketing-accent)]"
                >
                  {source.title}
                </a>
              ))}
            </div>
          </aside>
        </section>

        <section className="mt-12">
        <SectionTitle title={copy.recentTitle} intro={copy.recentIntro} />
        {recentBriefings.length ? (
          <div className="grid gap-4 md:grid-cols-3">
            {recentBriefings.map((briefing) => (
              <Link
                key={briefing.id}
                href={buildLocalePath(`/ai-trends/daily/${briefing.slug}`, forceLocale)}
                className="surface-panel-soft group block p-5 transition hover:border-[var(--marketing-accent)]/45"
              >
                <time className="text-xs font-bold text-[var(--marketing-accent)]" dateTime={briefing.slug}>
                  {briefing.slug}
                </time>
                <h2 className="mt-3 text-lg font-black leading-snug text-[var(--marketing-text)]">{briefing.title}</h2>
                <p className="mt-3 line-clamp-3 text-sm leading-7 text-[var(--marketing-muted)]">{briefing.coreConclusion}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[var(--marketing-accent)]">
                  {copy.readSummary} <ArrowUpRight size={16} strokeWidth={1.8} aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="surface-panel-soft p-7">
            <p className="text-sm leading-7 text-[var(--marketing-muted)]">{copy.emptyRecent}</p>
          </div>
        )}
        </section>
      </Container>
    </main>
  );
}

function AiTrendsGeoBlock({ forceLocale }: { forceLocale: Locale }) {
  const sections = aiTrendsGeoSections[forceLocale];
  const links = [
    { label: { zh: "阅读 AI 前沿资讯", en: "Read AI news" }, href: buildLocalePath("/ai-news", forceLocale) },
    { label: { zh: "学习 AI 技能课程", en: "Learn AI skill courses" }, href: buildLocalePath("/skill-learning", forceLocale) },
    { label: { zh: "选择 AI 软件应用", en: "Choose AI software apps" }, href: buildLocalePath("/software", forceLocale) }
  ];

  return (
    <section className="glass mt-8 rounded-2xl p-6">
      <div className="grid gap-4 lg:grid-cols-3">
        {sections.map((section) => (
          <article key={section.title} className="rounded-2xl border border-white/10 bg-white/8 p-5">
            <h2 className="text-lg font-black leading-snug text-[var(--marketing-text)]">{section.title}</h2>
            <p className="mt-3 text-sm leading-7 text-[var(--marketing-muted)]">{section.body}</p>
          </article>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        {links.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-full border border-white/14 bg-white/7 px-4 py-2 text-sm font-bold text-[var(--marketing-text)] transition hover:border-[var(--marketing-accent)] hover:text-[var(--marketing-accent)]"
          >
            {item.label[forceLocale]}
          </Link>
        ))}
      </div>
    </section>
  );
}
