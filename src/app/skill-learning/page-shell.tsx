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
import { buildThemedToolCategories } from "@/lib/tool-category-groups";
import { resolveLocalizedToolCategoryName } from "@/lib/tool-localization";
import {
  applyFilteredListingRobots,
  buildBreadcrumbSchema,
  buildFaqSchema,
  buildListingMetadataTitle,
  buildListingMetaDescription,
  buildLocalePath,
  buildPageMetadata,
} from "@/lib/seo";

export const skillLearningPageRevalidate = publicPageCacheSeconds;

const skillLearningGeoSections = {
  zh: [
    {
      title: "先选择未来机会方向",
      body: "AI教程与实战指南围绕已发布的 AI 工具教程、内容生成、智能体、自动化工作流和本地部署课程，帮助用户按真实任务选择学习路径。",
    },
    {
      title: "再确认真实价值",
      body: "智能体、提示词、订阅和副业变现产品都应该服务于明确结果。先看它能解决什么问题、如何交付、风险边界在哪里，再决定是否深入。",
    },
    {
      title: "沉淀为长期资产",
      body: "真正有价值的 AI 产品应能留下可复用提示词、账号能力、智能体流程、生活工具方案或项目经验，而不是一次性的试用热闹。",
    },
  ],
  en: [
    {
      title: "Practical AI tutorial path",
      body: "Start with prompt basics, AI tool workflows, local deployment, automation, and content creation, then turn each method into repeatable work habits.",
    },
    {
      title: "Who should learn here",
      body: "These courses are for creators, operators, freelancers, small teams, and individual learners who want to convert scattered AI tools into practical workflows.",
    },
    {
      title: "How to turn lessons into outcomes",
      body: "Learn around a real task: review trends, choose related software or account support, then follow the course steps to create a document, asset, workflow, or reusable template.",
    },
  ],
} as const;

const skillLearningOutcomeSections = {
  zh: [
    {
      title: "从问题开始选课",
      body: "先明确你要解决的是写作、运营、视频、办公自动化、本地部署还是团队提效问题，再选择对应课程。这样学习不会停留在知识点，而是直接服务一个可交付结果。",
    },
    {
      title: "把课程连接到工具",
      body: "每个学习路径都应该配合真实工具练习。你可以先看 AI 资讯理解趋势，再进入 AI 工具选择产品，最后用教程步骤完成素材、方案、脚本或自动化流程。",
    },
    {
      title: "沉淀为可复用资产",
      body: "完成一次练习后，把提示词、操作步骤、模板、常见错误和交付样例保存下来。可复用资产越多，AI 学习越容易转化成持续效率。",
    },
  ],
  en: [
    {
      title: "Choose courses from a real problem",
      body: "Start with the task you need to solve: writing, operations, video, automation, local deployment, or team productivity. This keeps learning tied to a deliverable outcome.",
    },
    {
      title: "Connect lessons with tools",
      body: "Each learning path should include hands-on tool practice. Read AI news for context, choose software apps for execution, then use courses to complete assets, plans, scripts, or workflows.",
    },
    {
      title: "Turn practice into reusable assets",
      body: "After each exercise, save prompts, steps, templates, common mistakes, and examples. The more reusable assets you build, the faster AI learning becomes real productivity.",
    },
  ],
} as const;

const skillLearningPathStrip = {
  zh: [
    { label: "1", title: "从真实问题开始", body: "先选一个要完成的任务。" },
    { label: "2", title: "配合工具练习", body: "用软件或账号服务跑通流程。" },
    { label: "3", title: "沉淀可复用资产", body: "保存提示词、步骤和模板。" },
  ],
  en: [
    { label: "1", title: "Start from a real problem", body: "Choose one task you need to finish." },
    { label: "2", title: "Practice with tools", body: "Run the workflow with software or access guidance." },
    { label: "3", title: "Save reusable assets", body: "Keep prompts, steps, and templates." },
  ],
} as const;

const skillLearningFaqItems = {
  zh: [
    {
      question: "ENHE AI 教程适合零基础用户吗？",
      answer:
        "适合。建议从提示词基础、常用 AI 工具工作流和具体任务案例开始，再逐步学习本地部署、自动化和多模态创作。",
    },
    {
      question: "如何判断应该先学课程还是先选工具？",
      answer:
        "如果你已经有明确任务，可以先选工具再按教程落地；如果还不清楚 AI 能解决什么问题，先看 AI 资讯和趋势分析，再选择课程。",
    },
    {
      question: "AI 技能课程如何转化为实际工作成果？",
      answer:
        "围绕一个真实交付物学习，例如一份方案、一组视频素材、一个自动化流程或一套运营模板，并把步骤沉淀为可复用流程。",
    },
  ],
  en: [
    {
      question: "Are ENHE AI tutorials suitable for beginners?",
      answer:
        "Yes. Start with prompt basics, common AI tool workflows, and task-based examples, then move into local deployment, automation, and multimodal creation.",
    },
    {
      question: "Should I choose a tool or a course first?",
      answer:
        "If you already have a task, choose the tool first and follow a tutorial. If you are exploring opportunities, read AI news and trend analysis before choosing a course.",
    },
    {
      question: "How do AI courses become real work outcomes?",
      answer:
        "Learn around one deliverable, such as a plan, video asset, automation workflow, or operations template, then save the process as a reusable workflow.",
    },
  ],
} as const;

export async function generateSkillLearningPageMetadata(
  forceLocale: Locale,
  searchParams: Promise<Record<string, string | undefined>> = Promise.resolve({}),
): Promise<Metadata> {
  const t = getDictionary(forceLocale);
  const metadata = buildPageMetadata({
    title: buildListingMetadataTitle("skill-learning", forceLocale, t.brand),
    description: buildListingMetaDescription("skill-learning", forceLocale),
    path: "/skill-learning",
    locale: forceLocale === "en" ? "en_US" : "zh_CN",
    localeKey: forceLocale,
  });

  return applyFilteredListingRobots(metadata, await searchParams, [
    "q",
    "category",
    "sort",
  ]);
}

export async function SkillLearningPageShell({
  searchParams,
  forceLocale,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
  forceLocale: Locale;
}) {
  const params = await searchParams;
  const keyword = params.q;
  const categoryId = params.category;
  const sort = params.sort;
  const t = getDictionary(forceLocale);
  const breadcrumbSchema = buildBreadcrumbSchema({
    items: [
      { name: t.nav.home, path: forceLocale === "en" ? "/en" : "/" },
      {
        name: t.listing.skillLearningTitle,
        path: forceLocale === "en" ? "/en/skill-learning" : "/skill-learning",
      },
    ],
  });
  const faqSchema = buildFaqSchema({
    items: [...skillLearningFaqItems[forceLocale]],
  });
  const [categories, tools] = await Promise.all([
    getPublicToolCategories("skill_learning"),
    getPublicToolListing(
      "skill_learning",
      categoryId,
      keyword,
      undefined,
      sort,
    ),
  ]);
  const categoryOptions = buildThemedToolCategories(categories, "futureAi");

  return (
    <main>
      <Container className="py-14">
        <StructuredData data={[breadcrumbSchema, faqSchema]} />
        <SectionTitle
          as="h1"
          title={t.listing.skillLearningTitle}
          intro={t.listing.skillLearningIntro}
        />
        <SkillLearningUserAnswerCard forceLocale={forceLocale} />
        <ListingDecisionStrip forceLocale={forceLocale} />
        <ListingTrustNote forceLocale={forceLocale} />
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
              ? "AI learning path, outcome guide, and FAQ"
              : "AI 学习路径、成果转化与常见问题"
          }
        >
          <SkillLearningGeoBlock forceLocale={forceLocale} />
          <SkillLearningOutcomeBlock forceLocale={forceLocale} />
        </ProductSeoDisclosure>
      </Container>
    </main>
  );
}

function SkillLearningUserAnswerCard({ forceLocale }: { forceLocale: Locale }) {
  return (
    <section
      className="surface-panel-soft mt-6 p-5"
      aria-label={forceLocale === "en" ? "AI tutorial answer" : "AI 教程答案"}
    >
      <strong className="text-sm font-black text-[var(--marketing-text)]">
        {forceLocale === "en"
          ? "AI learning should start from a real task, not from collecting another course."
          : "AI 教程应从真实任务开始，而不是继续收藏泛泛内容。"}
      </strong>
      <p className="mt-2 max-w-4xl text-sm leading-7 text-[var(--marketing-muted)]">
        {forceLocale === "en"
          ? "ENHE AI helps users learn prompts, tool workflows, automation, and content creation by producing reusable outputs such as documents, scripts, assets, templates, or repeatable work processes."
          : "ENHE AI 帮用户围绕工作效率、内容创作、资料整理和工具使用来学习提示词、工具流程、自动化和创作方法，目标是产出文档、脚本、素材、模板或可复用工作流。"}
      </p>
    </section>
  );
}

function ListingDecisionStrip({ forceLocale }: { forceLocale: Locale }) {
  const items =
    forceLocale === "en"
      ? [
          {
            label: "Real task",
            title: "Choose by outcome",
            body: "Start from a deliverable instead of collecting another generic AI course.",
          },
          {
            label: "Course delivery",
            title: "Check the path",
            body: "Look for steps, examples, and tool connections before buying.",
          },
          {
            label: "Reusable assets",
            title: "Save the system",
            body: "Turn prompts, steps, and templates into assets you can reuse.",
          },
        ]
      : [
          {
            label: "选真实任务",
            title: "按成果选课",
            body: "先确定要产出什么，避免只收藏泛泛的 AI 课程。",
          },
          {
            label: "看课程交付",
            title: "确认学习路径",
            body: "购买前看步骤、案例和对应工具是否足够清楚。",
          },
          {
            label: "沉淀模板",
            title: "形成复用资产",
            body: "把提示词、步骤和模板保存为下一次可用的系统。",
          },
        ];

  return (
    <section
      className="listing-decision-strip"
      aria-label={
        forceLocale === "en"
          ? "Course purchase decision guide"
          : "课程购买决策提示"
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
        ? "Course pages should make the outcome and delivery clear before purchase. Choose from a real task, not a vague interest."
        : "课程购买前先确认学习成果和交付内容；建议从真实任务出发，而不是泛泛收藏。"}
      <Link href={buildLocalePath("/ai-topics/ai-skill-learning-path", forceLocale)}>
        {forceLocale === "en" ? "View learning path" : "查看学习路线"}
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

function SkillLearningOutcomeBlock({ forceLocale }: { forceLocale: Locale }) {
  const sections = skillLearningOutcomeSections[forceLocale];
  const faqs = skillLearningFaqItems[forceLocale];

  return (
    <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="surface-panel-soft p-6">
        <h2 className="text-2xl font-black text-[var(--marketing-text)]">
          {forceLocale === "en"
            ? "From AI skills to repeatable workflows"
            : "从 AI 技能到可复用工作流"}
        </h2>
        <div className="skill-learning-outcome-fold-list mt-5">
          {sections.map((section, index) => (
            <details
              key={section.title}
              className="content-fold"
            >
              <summary>
                <div className="content-fold-summary-copy">
                  <span className="text-xs font-black text-[var(--marketing-accent)]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <strong className="text-base font-black leading-snug text-[var(--marketing-text)]">
                    {section.title}
                  </strong>
                </div>
              </summary>
              <div className="content-fold-body">
                <p className="text-sm leading-7 text-[var(--marketing-muted)]">
                  {section.body}
                </p>
              </div>
            </details>
          ))}
        </div>
      </div>
      <div className="surface-panel-soft p-6">
        <h2 className="text-2xl font-black text-[var(--marketing-text)]">
          {forceLocale === "en" ? "AI tutorial FAQ" : "AI 教程常见问题"}
        </h2>
        <div className="mt-5 space-y-4">
          {faqs.map((item) => (
            <details
              key={item.question}
              className="content-fold"
            >
              <summary>
                <strong className="text-base font-black leading-snug text-[var(--marketing-text)]">
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
    </section>
  );
}

function SkillLearningGeoBlock({ forceLocale }: { forceLocale: Locale }) {
  const sections = skillLearningGeoSections[forceLocale];
  const pathItems = skillLearningPathStrip[forceLocale];
  const links = [
    {
      label: { zh: "先看 AI 前沿趋势", en: "Read AI trends first" },
      href: buildLocalePath("/ai-news", forceLocale),
    },
    {
      label: { zh: "选择 AI 工具", en: "Choose AI tools" },
      href: buildLocalePath("/software", forceLocale),
    },
    {
      label: { zh: "了解 AI 账号服务", en: "Review account service guidance" },
      href: buildLocalePath("/account-services", forceLocale),
    },
    {
      label: { zh: "AI 教程路线", en: "AI tutorial path" },
      href: buildLocalePath("/ai-topics/ai-skill-learning-path", forceLocale),
    },
  ];

  return (
    <section className="glass rounded-2xl p-6">
      <div className="skill-learning-path-fold-list">
        {pathItems.map((item) => (
          <details key={item.label} className="content-fold">
            <summary>
              <div className="content-fold-summary-copy">
                <span className="text-xs font-black text-[var(--marketing-accent)]">
                  {item.label}
                </span>
                <strong className="text-base font-black leading-snug text-[var(--marketing-text)]">
                  {item.title}
                </strong>
              </div>
            </summary>
            <div className="content-fold-body">
              <p className="text-sm leading-6 text-[var(--marketing-muted)]">
                {item.body}
              </p>
            </div>
          </details>
        ))}
      </div>
      <div className="skill-learning-geo-fold-list">
        {sections.map((section) => (
          <details
            key={section.title}
            className="content-fold"
          >
            <summary>
              <strong className="text-lg font-black leading-snug text-[var(--marketing-text)]">
                {section.title}
              </strong>
            </summary>
            <div className="content-fold-body">
              <p className="text-sm leading-7 text-[var(--marketing-muted)]">
                {section.body}
              </p>
            </div>
          </details>
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
  );
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
    <form className="filter-surface grid gap-3 md:grid-cols-[1fr_180px_140px]">
      <label className="sr-only" htmlFor="skill-learning-search">
        {t.listing.searchPlaceholder}
      </label>
      <input
        id="skill-learning-search"
        name="q"
        aria-label={t.listing.searchPlaceholder}
        placeholder={t.listing.searchPlaceholder}
        title={t.listing.searchPlaceholder}
        className="form-control-dark"
      />
      <label className="sr-only" htmlFor="skill-learning-category">
        {t.listing.allCategories}
      </label>
      <select
        id="skill-learning-category"
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
              "skill_learning",
              locale,
            )}
          </option>
        ))}
      </select>
      <label className="sr-only" htmlFor="skill-learning-sort">
        {t.listing.latest}
      </label>
      <select
        id="skill-learning-sort"
        name="sort"
        aria-label={t.listing.latest}
        title={t.listing.latest}
        className="form-select-dark"
      >
        <option value="latest">{t.listing.latest}</option>
        <option value="hot">{t.listing.hot}</option>
      </select>
              <button className="rounded-full bg-[#050505] px-5 py-3 font-bold text-white transition-colors hover:bg-[#161616] md:col-span-3">
        {t.listing.filter}
      </button>
    </form>
  );
}
