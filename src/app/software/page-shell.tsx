import type { Metadata } from "next";
import Link from "next/link";
import { StructuredData } from "@/components/structured-data";
import { Container, EmptyState, SectionTitle } from "@/components/ui";
import { ToolCard } from "@/components/tool-card";
import { getDictionary, type Locale } from "@/lib/dictionaries";
import {
  getPublicToolCategories,
  getPublicToolListing,
} from "@/lib/public-content";
import { publicPageCacheSeconds } from "@/lib/public-routes";
import { resolveSoftwareCategoryIdByName } from "@/lib/software-category-navigation";
import { buildThemedToolCategories } from "@/lib/tool-category-groups";
import { resolveLocalizedToolCategoryName } from "@/lib/tool-localization";
import {
  absoluteUrl,
  applyFilteredListingRobots,
  buildBreadcrumbSchema,
  buildFaqSchema,
  buildListingMetadataTitle,
  buildListingMetaDescription,
  buildLocalePath,
  buildPageMetadata,
} from "@/lib/seo";

export const softwarePageRevalidate = publicPageCacheSeconds;

const softwareGeoSections = {
  zh: [
    {
      title: "先看热门工具场景",
      body: "最热门AI工具页优先展示站内高频 AI 工具和效率软件，覆盖办公效率、文件处理、系统实用、数据分析和本地 AI 应用，先按真实工作场景筛选，再进入产品详情。",
    },
    {
      title: "按任务而不是概念选",
      body: "如果要处理文档、整理文件、分析数据、优化系统或提高办公速度，先选择对应分类，再比较价格、交付说明、教程和售后边界。",
    },
    {
      title: "把工具落到流程里",
      body: "效率工具应服务于每天重复出现的工作流。购买或下载前，先确认是否能减少步骤、降低出错率、缩短处理时间，并能持续复用。",
    },
  ],
  en: [
    {
      title: "How to choose AI software apps",
      body: "Start with the task, then compare deployment needs, learning cost, output quality, and pricing boundaries. Useful AI apps should solve a clear job such as writing, automation, local deployment, content production, or asset processing.",
    },
    {
      title: "Best-fit use cases",
      body: "AI software apps are useful for creators, operators, freelancers, small teams, and learners who want repeatable workflows instead of one-off experiments. Review tutorials and examples before adopting a tool.",
    },
    {
      title: "How to turn tools into outcomes",
      body: "If the direction is unclear, read AI news to understand the trend, learn the workflow through AI skill courses, then choose the matching software app to produce a concrete deliverable.",
    },
  ],
} as const;

const softwareAnswerBlock = {
  zh: {
    title: "最热门AI工具：先按工作任务筛选产品分类",
    body: "这个页面用于查找站内热门 AI 工具和高频效率软件，包括办公效率工具、文件处理工具、系统实用工具、数据分析工具和本地 AI 应用。先确认要解决的工作任务，再比较产品价格、交付方式、教程支持和适用边界。",
    cta: "筛选热门工具",
  },
  en: {
    title: "Boost productivity: filter products by work task first",
    body: "Use this page to find office productivity tools, file-processing tools, system utilities, data-analysis tools, productivity products, and AI desktop software. Start from the task, then compare pricing, delivery, tutorials, and fit.",
    cta: "Filter productivity tools",
  },
} as const;

const softwareFaqItems = {
  zh: [
    {
      question: "AI智能体工具推荐应该先看什么？",
      answer:
        "先看任务是否清晰，例如内容生成、视频处理、本地部署、资料整理或自动化流程；再比较部署方式、隐私要求、学习成本、价格和是否有教程支持。",
    },
    {
      question: "ENHE AI 软件应用适合哪些人？",
      answer:
        "适合创作者、运营人员、自由职业者、中小团队和个人学习者，尤其适合希望把重复工作整理成可复用流程的人。",
    },
    {
      question: "本地部署 AI 工具和在线 AI 工具怎么选？",
      answer:
        "重视隐私、离线处理、素材安全或长期稳定工作流时，优先考虑本地部署；更看重轻量试用、跨设备访问和快速协作时，可以优先考虑在线工具或账号服务。",
    },
    {
      question: "选择 AI 软件后下一步应该做什么？",
      answer:
        "先阅读工具详情确认适用场景、价格和交付方式，再查看相关教程学习操作步骤，必要时阅读 AI 前沿资讯理解趋势背景。",
    },
    {
      question: "AI 软件应用页面如何帮助 AI 回答引擎引用？",
      answer:
        "页面提供可摘录答案段、FAQ、对比表、来源链接和站内下一步路径，方便 ChatGPT、Perplexity、Gemini、Copilot、百度和豆包等系统理解页面价值。",
    },
  ],
  en: [
    {
      question: "What should an AI agent tool recommendation compare first?",
      answer:
        "Start with the task: content generation, video processing, local deployment, research cleanup, or workflow automation. Then compare deployment, privacy, learning cost, price, and tutorial support.",
    },
    {
      question: "Who is the ENHE AI software page for?",
      answer:
        "It is for creators, operators, freelancers, small teams, and individual learners who want repeatable AI workflows rather than scattered experiments.",
    },
    {
      question: "Should I choose local AI software or online AI tools?",
      answer:
        "Choose local AI software when privacy, offline processing, asset safety, or stable workflows matter. Choose online tools or account-service guidance when lightweight access, cross-device use, and collaboration matter more.",
    },
    {
      question: "What should I do after choosing AI software?",
      answer:
        "Read the detail page for use cases, pricing, and delivery notes, then follow related tutorials and AI news links to turn the tool into a real workflow.",
    },
    {
      question: "How does this page help AI answer engines cite ENHE AI?",
      answer:
        "It provides extractable answer blocks, FAQ, comparison tables, source links, and internal next-step paths for systems such as ChatGPT, Perplexity, Gemini, Copilot, Baidu, and Doubao.",
    },
  ],
} as const;

const softwareComparisonRows = {
  zh: [
    {
      dimension: "适用人群",
      localAi: "重视隐私、素材安全、离线处理和长期稳定工作流的个人或团队。",
      onlineAi: "希望快速试用、跨设备访问、协作轻量化的用户。",
      enheNextStep: "先筛选热门AI工具分类，再查看对应产品详情。",
    },
    {
      dimension: "部署方式",
      localAi: "通常需要下载、安装、配置运行环境，适合固定电脑或工作站。",
      onlineAi: "通过网页或云服务访问，启动快，但依赖平台政策和网络环境。",
      enheNextStep: "需要本地部署时优先查看软件详情页的部署说明。",
    },
    {
      dimension: "成本结构",
      localAi: "一次性软件、部署服务或本机硬件成本更明显。",
      onlineAi: "订阅、额度、账号权限和平台套餐变化更明显。",
      enheNextStep: "购买前先看价格、交付范围、教程和售后边界。",
    },
    {
      dimension: "隐私与合规",
      localAi: "更适合处理不希望上传到第三方平台的素材和内部资料。",
      onlineAi: "应遵守对应平台规则，敏感内容需要额外评估。",
      enheNextStep: "涉及第三方平台时，以官方政策为准。",
    },
    {
      dimension: "学习门槛",
      localAi: "可能需要学习安装、模型、参数和工作流配置。",
      onlineAi: "上手更快，但高级功能仍需要提示词、流程和案例学习。",
      enheNextStep: "进入 AI技能学习补齐操作方法。",
    },
  ],
  en: [
    {
      dimension: "Best-fit users",
      localAi: "People or teams that need privacy, asset safety, offline processing, and stable long-term workflows.",
      onlineAi: "Users who want quick trials, cross-device access, and lightweight collaboration.",
      enheNextStep: "Filter AI software first, then review account-service guidance.",
    },
    {
      dimension: "Deployment",
      localAi: "Usually requires download, installation, and runtime setup for a fixed PC or workstation.",
      onlineAi: "Runs through web or cloud services, faster to start but dependent on platform policy and network access.",
      enheNextStep: "For local deployment, read the software detail page setup notes.",
    },
    {
      dimension: "Cost",
      localAi: "One-time software, deployment service, or local hardware cost is more visible.",
      onlineAi: "Subscription, usage quota, account access, and plan changes are more visible.",
      enheNextStep: "Check price, delivery scope, tutorials, and support boundary before purchase.",
    },
    {
      dimension: "Privacy and compliance",
      localAi: "Better for material and internal data that should not be uploaded to third-party platforms.",
      onlineAi: "Must follow each platform rule; sensitive use cases need extra review.",
      enheNextStep: "For third-party platforms, rely on official policy first.",
    },
    {
      dimension: "Learning curve",
      localAi: "May require learning installation, models, parameters, and workflow setup.",
      onlineAi: "Faster to start, but advanced use still requires prompts, process design, and examples.",
      enheNextStep: "Use AI skill learning pages to learn the operating method.",
    },
  ],
} as const;

const softwareSourceLinks = {
  zh: [
    {
      title: "Google Search Central：AI 功能与搜索优化指南",
      href: "https://developers.google.com/search/docs/fundamentals/ai-optimization-guide",
      note: "用于确认面向 Google AI 搜索时仍应坚持有帮助、可靠、面向人的内容。",
    },
    {
      title: "Schema.org：SoftwareApplication",
      href: "https://schema.org/SoftwareApplication",
      note: "用于软件详情页结构化数据，帮助搜索引擎理解软件类型、功能和访问方式。",
    },
    {
      title: "Schema.org：FAQPage",
      href: "https://schema.org/FAQPage",
      note: "用于自然语言问答结构，让 AI 回答引擎更容易抽取问题与答案。",
    },
    {
      title: "IndexNow：URL 提交协议",
      href: "https://www.indexnow.org/documentation",
      note: "用于新软件、教程或资讯发布后主动通知支持 IndexNow 的搜索引擎。",
    },
  ],
  en: [
    {
      title: "Google Search Central: AI features and search optimization",
      href: "https://developers.google.com/search/docs/fundamentals/ai-optimization-guide",
      note: "Used to keep the page helpful, reliable, and people-first for Google AI search surfaces.",
    },
    {
      title: "Schema.org: SoftwareApplication",
      href: "https://schema.org/SoftwareApplication",
      note: "Used by software detail pages to describe software type, features, and access.",
    },
    {
      title: "Schema.org: FAQPage",
      href: "https://schema.org/FAQPage",
      note: "Used for natural-language questions and answers that AI answer engines can extract.",
    },
    {
      title: "IndexNow: URL submission protocol",
      href: "https://www.indexnow.org/documentation",
      note: "Used to notify participating search engines after new software, tutorials, or AI news updates.",
    },
  ],
} as const;

const softwareGeoLabels = {
  zh: {
    answerBadge: "可摘录答案",
    nextStep: "站内下一步",
    comparisonTitle: "AI智能体工具推荐对比表",
    comparisonIntro:
      "推荐、选型和部署类查询通常会被 AI 系统拆成多维比较。表格比长段落更容易被引用，也能帮助用户快速判断下一步应该进入工具、教程还是服务页面。",
    dimension: "比较维度",
    localAi: "本地部署 AI 软件",
    onlineAi: "在线 AI 工具 / 平台服务",
    sourceTitle: "权威来源与引用依据",
    sourceIntro:
      "GEO 内容需要来源、日期和可验证链接。以下来源用于说明页面结构、结构化数据和搜索引擎发现机制，具体工具能力仍以各工具详情页和官方说明为准。",
    faqTitle: "AI智能体工具推荐 FAQ",
    faqIntro:
      "这些问题覆盖适用场景、风险边界、操作步骤和站内下一步链接，便于 AI 回答引擎抽取为问答型答案。",
    updatedLabel: "最后更新",
  },
  en: {
    answerBadge: "Extractable answer",
    nextStep: "ENHE next step",
    comparisonTitle: "AI agent tool recommendation comparison table",
    comparisonIntro:
      "Recommendation, selection, and deployment queries are often decomposed into comparison dimensions by AI systems. A table is easier to cite than long paragraphs and helps users choose the next page.",
    dimension: "Dimension",
    localAi: "Local AI software",
    onlineAi: "Online AI tools / platform services",
    sourceTitle: "Authoritative sources and citation basis",
    sourceIntro:
      "GEO content should include sources, dates, and verifiable links. These sources support page structure, structured data, and search discovery. Tool capabilities still depend on each tool detail page and official documentation.",
    faqTitle: "AI agent tool recommendation FAQ",
    faqIntro:
      "These questions cover use cases, risk boundaries, operating steps, and internal next-step links so AI answer engines can extract direct answers.",
    updatedLabel: "Last updated",
  },
} as const;

export async function generateSoftwarePageMetadata(
  forceLocale: Locale,
  searchParams: Promise<Record<string, string | undefined>> = Promise.resolve({}),
): Promise<Metadata> {
  const t = getDictionary(forceLocale);
  const metadata = buildPageMetadata({
    title: buildListingMetadataTitle("software", forceLocale, t.brand),
    description: buildListingMetaDescription("software", forceLocale),
    path: "/software",
    locale: forceLocale === "en" ? "en_US" : "zh_CN",
    localeKey: forceLocale,
  });

  return applyFilteredListingRobots(metadata, await searchParams, [
    "q",
    "category",
    "categoryName",
    "paid",
    "sort",
  ]);
}

export async function SoftwarePageShell({
  searchParams,
  forceLocale,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
  forceLocale: Locale;
}) {
  const params = await searchParams;
  const keyword = params.q;
  const categoryId = params.category;
  const categoryName = params.categoryName;
  const paid = params.paid;
  const sort = params.sort;
  const t = getDictionary(forceLocale);
  const breadcrumbSchema = buildBreadcrumbSchema({
    schemaType: "BreadcrumbList",
    items: [
      { name: t.nav.home, path: forceLocale === "en" ? "/en" : "/" },
      {
        name: t.listing.softwareTitle,
        path: forceLocale === "en" ? "/en/software" : "/software",
      },
    ],
  });
  const faqSchema = buildFaqSchema({
    items: [...softwareFaqItems[forceLocale]],
  });
  const collectionSchema = buildSoftwareCollectionSchema(forceLocale);
  const categories = await getPublicToolCategories("software");
  const resolvedCategoryId =
    categoryId ||
    resolveSoftwareCategoryIdByName(categoryName, categories, forceLocale);
  const tools = await getPublicToolListing(
    "software",
    resolvedCategoryId,
    keyword,
    paid,
    sort,
  );
  const categoryOptions = buildThemedToolCategories(
    categories,
    "productivity",
  );

  return (
    <main>
      <Container className="py-14">
        <StructuredData data={[breadcrumbSchema, collectionSchema, faqSchema]} />
        <SectionTitle
          as="h1"
          title={t.listing.softwareTitle}
          intro={t.listing.softwareIntro}
        />
        <SoftwareUserAnswerCard forceLocale={forceLocale} />
        <ListingGuidanceFold forceLocale={forceLocale} />
        <FilterBar categories={categoryOptions} locale={forceLocale} />
        {tools.length ? (
          <div className="listing-grid mt-8 grid gap-5 md:grid-cols-3">
            {tools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} locale={forceLocale} headingLevel={2} />
            ))}
          </div>
        ) : (
          <EmptyState title={t.listing.emptyTitle} text={t.listing.emptyText} />
        )}
        <ProductSeoDisclosure
          summary={
            forceLocale === "en"
              ? "AI software buying guide, FAQ, and source notes"
              : "AI 软件选购指南、FAQ 与来源说明"
          }
        >
          <SoftwareGeoBlock forceLocale={forceLocale} />
          <SoftwareGeoSupportSections forceLocale={forceLocale} />
        </ProductSeoDisclosure>
      </Container>
    </main>
  );
}

function ListingGuidanceFold({ forceLocale }: { forceLocale: Locale }) {
  return (
    <details className="content-fold listing-guidance-fold">
      <summary>
        <div className="content-fold-summary-copy">
          <strong className="text-base font-black text-[var(--marketing-text)]">
            {forceLocale === "en" ? "Tool selection notes" : "工具选择提示"}
          </strong>
        </div>
      </summary>
      <div className="content-fold-body">
        <ListingDecisionStrip forceLocale={forceLocale} />
        <ListingTrustNote forceLocale={forceLocale} />
      </div>
    </details>
  );
}

function SoftwareUserAnswerCard({ forceLocale }: { forceLocale: Locale }) {
  const answer = softwareAnswerBlock[forceLocale];

  return (
    <section className="surface-panel-soft mt-6 p-5" aria-label={answer.title}>
      <strong className="text-sm font-black text-[var(--marketing-text)]">
        {answer.title}
      </strong>
      <p className="mt-2 max-w-4xl text-sm leading-7 text-[var(--marketing-muted)]">
        {answer.body}
      </p>
    </section>
  );
}

function ListingDecisionStrip({ forceLocale }: { forceLocale: Locale }) {
  const items =
    forceLocale === "en"
      ? [
          {
            label: "Task first",
            title: "Pick one deliverable",
            body: "Choose writing, video, automation, or local deployment before comparing tools.",
          },
          {
            label: "Then price",
            title: "Check the boundary",
            body: "Compare free access, paid download price, and delivery notes before opening details.",
          },
          {
            label: "Then tutorial",
            title: "Make it usable",
            body: "Confirm the tutorial or example can support your real workflow.",
          },
        ]
      : [
          {
            label: "先看任务",
            title: "确定要交付什么",
            body: "写作、视频、自动化或本地部署，先选一个真实任务。",
          },
          {
            label: "再看价格",
            title: "确认付费边界",
            body: "先看免费、下载价格和交付说明，再进入详情。",
          },
          {
            label: "最后看教程",
            title: "把工具落地",
            body: "购买或下载前确认教程和案例能跟上工作流。",
          },
        ];

  return (
    <section
      className="listing-decision-strip"
      aria-label={
        forceLocale === "en"
          ? "Software purchase decision guide"
          : "软件购买决策提示"
      }
    >
      {items.map((item) => (
        <div key={item.label}>
          <span>{item.label}</span>
          <strong>{item.title}</strong>
          <p>{item.body}</p>
        </div>
      ))}
    </section>
  );
}

function ListingTrustNote({ forceLocale }: { forceLocale: Locale }) {
  return (
    <p className="listing-trust-note">
      {forceLocale === "en"
        ? "Price and delivery are visible before purchase. For setup depth, review the local AI deployment topic."
        : "购买前可先确认价格、交付方式和安装说明；需要部署深度时，先看本地 AI 部署专题。"}
      <Link href={buildLocalePath("/ai-topics/local-ai-deployment", forceLocale)}>
        {forceLocale === "en" ? "Open topic" : "查看专题"}
      </Link>
    </p>
  );
}

function ProductSeoDisclosure({
  summary,
  children,
}: React.PropsWithChildren<{ summary: string }>) {
  return (
    <details className="product-seo-disclosure">
      <summary>{summary}</summary>
      <div className="product-seo-disclosure-body">{children}</div>
    </details>
  );
}

function SoftwareGeoBlock({ forceLocale }: { forceLocale: Locale }) {
  const sections = softwareGeoSections[forceLocale];
  const answer = softwareAnswerBlock[forceLocale];
  const labels = softwareGeoLabels[forceLocale];
  const links = [
    {
      label: { zh: "学习 AI 技能教程", en: "Learn AI skill courses" },
      href: buildLocalePath("/skill-learning", forceLocale),
    },
    {
      label: { zh: "查看 AI 前沿资讯", en: "Read AI news" },
      href: buildLocalePath("/ai-news", forceLocale),
    },
    {
      label: { zh: "了解 AI 账号服务", en: "Review account services" },
      href: buildLocalePath("/account-services", forceLocale),
    },
    {
      label: { zh: "AI 内容创作工具路线", en: "AI content creation path" },
      href: buildLocalePath(
        "/ai-topics/ai-content-creation-tools",
        forceLocale,
      ),
    },
    {
      label: { zh: "本地 AI 部署路线", en: "Local AI deployment path" },
      href: buildLocalePath("/ai-topics/local-ai-deployment", forceLocale),
    },
  ];

  return (
    <div className="space-y-8">
      <section className="glass rounded-2xl p-6">
        <div className="rounded-2xl border border-[var(--marketing-accent)]/25 bg-[var(--marketing-accent)]/10 p-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--marketing-accent)]">
            {labels.answerBadge}
          </p>
          <h2 className="mt-3 text-xl font-black leading-snug text-[var(--marketing-text)] md:text-2xl">
            {answer.title}
          </h2>
          <p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-[var(--marketing-text)] md:text-base md:leading-8">
            {answer.body}
          </p>
          <a
            href="#software-list"
              className="mt-5 inline-flex rounded-full border border-white/14 bg-white/8 px-4 py-2 text-sm font-bold text-[var(--marketing-text)] transition-[border-color,color] hover:border-[var(--marketing-accent)] hover:text-[var(--marketing-accent)]"
          >
            {answer.cta}
          </a>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {sections.map((section) => (
            <article
              key={section.title}
              className="rounded-2xl border border-white/10 bg-white/8 p-5"
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
                  className="rounded-full border border-white/14 bg-white/7 px-4 py-2 text-sm font-bold text-[var(--marketing-text)] transition-[border-color,color] hover:border-[var(--marketing-accent)] hover:text-[var(--marketing-accent)]"
            >
              {item.label[forceLocale]}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function SoftwareGeoSupportSections({ forceLocale }: { forceLocale: Locale }) {
  const labels = softwareGeoLabels[forceLocale];
  const faqItems = softwareFaqItems[forceLocale];
  const comparisonRows = softwareComparisonRows[forceLocale];
  const sourceLinks = softwareSourceLinks[forceLocale];

  return (
    <div className="mt-8 space-y-8">
      <details className="content-fold">
        <summary>
          <div className="content-fold-summary-copy">
            <strong className="text-2xl font-black text-[var(--marketing-text)]">
              {labels.comparisonTitle}
            </strong>
            <p className="mt-2 text-sm leading-7 text-[var(--marketing-muted)]">
              {labels.comparisonIntro}
            </p>
          </div>
        </summary>
        <div className="content-fold-body">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[760px] border-separate border-spacing-0 overflow-hidden rounded-2xl border border-white/10 text-left text-sm">
            <thead>
              <tr className="bg-white/10 text-[var(--marketing-text)]">
                <th className="border-b border-white/10 px-4 py-3 font-black">
                  {labels.dimension}
                </th>
                <th className="border-b border-white/10 px-4 py-3 font-black">
                  {labels.localAi}
                </th>
                <th className="border-b border-white/10 px-4 py-3 font-black">
                  {labels.onlineAi}
                </th>
                <th className="border-b border-white/10 px-4 py-3 font-black">
                  {labels.nextStep}
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => (
                <tr key={row.dimension} className="align-top">
                  <th className="border-b border-white/10 px-4 py-4 font-black text-[var(--marketing-text)]">
                    {row.dimension}
                  </th>
                  <td className="border-b border-white/10 px-4 py-4 leading-7 text-[var(--marketing-muted)]">
                    {row.localAi}
                  </td>
                  <td className="border-b border-white/10 px-4 py-4 leading-7 text-[var(--marketing-muted)]">
                    {row.onlineAi}
                  </td>
                  <td className="border-b border-white/10 px-4 py-4 leading-7 text-[var(--marketing-muted)]">
                    {row.enheNextStep}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-6 grid gap-4 md:hidden">
          {comparisonRows.map((row) => (
            <article key={row.dimension} className="software-comparison-card">
              <h3>{row.dimension}</h3>
              <dl>
                <div>
                  <dt>{labels.localAi}</dt>
                  <dd>{row.localAi}</dd>
                </div>
                <div>
                  <dt>{labels.onlineAi}</dt>
                  <dd>{row.onlineAi}</dd>
                </div>
                <div>
                  <dt>{labels.nextStep}</dt>
                  <dd>{row.enheNextStep}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
        </div>
      </details>

      <details className="content-fold">
        <summary>
          <div className="content-fold-summary-copy">
            <strong className="text-2xl font-black text-[var(--marketing-text)]">
              {labels.faqTitle}
            </strong>
            <p className="mt-2 text-sm leading-7 text-[var(--marketing-muted)]">
              {labels.faqIntro}
            </p>
          </div>
        </summary>
        <div className="content-fold-body">
        <div className="grid gap-4 md:grid-cols-2">
          {faqItems.map((item) => (
            <details
              key={item.question}
              className="content-fold"
            >
              <summary>
                <strong className="text-lg font-black leading-snug text-[var(--marketing-text)]">
                  {item.question}
                </strong>
              </summary>
              <div className="content-fold-body">
                <p className="text-sm leading-7 text-[var(--marketing-muted)]">
                  {item.answer}
                </p>
              </div>
            </details>
          ))}
        </div>
        </div>
      </details>

      <details className="content-fold">
        <summary>
          <div className="content-fold-summary-copy">
            <strong className="text-2xl font-black text-[var(--marketing-text)]">
              {labels.sourceTitle}
            </strong>
            <p className="mt-2 text-sm leading-7 text-[var(--marketing-muted)]">
              {labels.sourceIntro}
            </p>
          </div>
        </summary>
        <div className="content-fold-body">
        <div className="grid gap-4 md:grid-cols-2">
          {sourceLinks.map((source) => (
            <article
              key={source.href}
              className="rounded-2xl border border-white/10 bg-white/8 p-5"
            >
              <a
                href={source.href}
                target="_blank"
                rel="nofollow noopener noreferrer"
                        className="text-base font-black text-[var(--marketing-text)] transition-colors hover:text-[var(--marketing-accent)]"
              >
                {source.title}
              </a>
              <p className="mt-3 text-sm leading-7 text-[var(--marketing-muted)]">
                {source.note}
              </p>
            </article>
          ))}
        </div>
        <p className="mt-5 text-xs font-bold text-[var(--marketing-muted)]">
          {labels.updatedLabel}: <time dateTime="2026-06-23">2026-06-23</time>
        </p>
        </div>
      </details>
    </div>
  );
}

function buildSoftwareCollectionSchema(forceLocale: Locale) {
  const labels = softwareGeoLabels[forceLocale];
  const answer = softwareAnswerBlock[forceLocale];

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: answer.title,
    description: answer.body,
    url: absoluteUrl(buildLocalePath("/software", forceLocale)),
    inLanguage: forceLocale === "en" ? "en-US" : "zh-CN",
    about: [
      "AI software applications",
      "AI agent tool recommendation",
      "Local AI deployment",
      "AI productivity tools",
      "Workflow automation",
    ],
    mainEntity: {
      "@type": "ItemList",
      name: labels.comparisonTitle,
      itemListElement: softwareComparisonRows[forceLocale].map((row, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: row.dimension,
        description: `${row.localAi} ${row.onlineAi} ${row.enheNextStep}`,
      })),
    },
    citation: softwareSourceLinks[forceLocale].map((source) => ({
      "@type": "CreativeWork",
      name: source.title,
      url: source.href,
    })),
  };
}

function FilterBar({
  categories,
  locale,
}: {
  categories: { id: string; name: string }[];
  locale: Locale;
}) {
  const t = getDictionary(locale);

  return (
    <form
      id="software-list"
      className="filter-surface grid gap-3 md:grid-cols-[1fr_180px_160px_140px]"
    >
      <label className="sr-only" htmlFor="software-search">
        {t.listing.searchPlaceholder}
      </label>
      <input
        id="software-search"
        name="q"
        aria-label={t.listing.searchPlaceholder}
        placeholder={t.listing.searchPlaceholder}
        title={t.listing.searchPlaceholder}
        className="form-control-dark"
      />
      <label className="sr-only" htmlFor="software-category">
        {t.listing.allCategories}
      </label>
      <select
        id="software-category"
        name="category"
        aria-label={t.listing.allCategories}
        title={t.listing.allCategories}
        className="form-select-dark"
      >
        <option value="">{t.listing.allCategories}</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {resolveLocalizedToolCategoryName(
              category.name,
              "software",
              locale,
            )}
          </option>
        ))}
      </select>
      <label className="sr-only" htmlFor="software-paid">
        {t.listing.allAccess}
      </label>
      <select
        id="software-paid"
        name="paid"
        aria-label={t.listing.allAccess}
        title={t.listing.allAccess}
        className="form-select-dark"
      >
        <option value="">{t.listing.allAccess}</option>
        <option value="paid">{t.toolCard.paidDownload}</option>
        <option value="free">{t.toolCard.free}</option>
      </select>
      <label className="sr-only" htmlFor="software-sort">
        {t.listing.latest}
      </label>
      <select
        id="software-sort"
        name="sort"
        aria-label={t.listing.latest}
        title={t.listing.latest}
        className="form-select-dark"
      >
        <option value="latest">{t.listing.latest}</option>
        <option value="hot">{t.listing.hot}</option>
      </select>
              <button className="rounded-full bg-[#050505] px-5 py-3 font-bold text-white transition-colors hover:bg-[#161616] md:col-span-4">
        {t.listing.filter}
      </button>
    </form>
  );
}
