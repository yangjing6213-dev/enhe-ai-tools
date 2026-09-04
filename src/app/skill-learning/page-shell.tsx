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
import { resolveLocalizedToolCategoryName } from "@/lib/tool-localization";
import {
  buildBreadcrumbSchema,
  buildFaqSchema,
  buildListingMetaDescription,
  buildLocalePath,
  buildMetadataTitle,
  buildPageMetadata,
} from "@/lib/seo";

export const skillLearningPageRevalidate = publicPageCacheSeconds;

const skillLearningGeoSections = {
  zh: [
    {
      title: "AI技能学习路径",
      body: "从提示词基础、AI工具实战、本地部署、自动化流程到内容创作，先建立可复用方法，再把方法迁移到写作、运营、设计、编程和日常办公任务中。",
    },
    {
      title: "适合谁学习",
      body: "适合希望系统提升 AI 使用能力的创作者、运营人员、自由职业者、中小企业团队和个人学习者，尤其适合想把零散工具变成稳定工作流的人。",
    },
    {
      title: "如何把课程转化为工作成果",
      body: "建议围绕一个真实任务学习：先看趋势和案例，再选择对应软件或账号服务，最后用课程步骤完成交付物，让学习结果变成文档、素材、自动化流程或可复用模板。",
    },
  ],
  en: [
    {
      title: "AI skill learning path",
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
      body: "每个学习路径都应该配合真实工具练习。你可以先看 AI 前沿资讯理解趋势，再进入 AI 软件应用选择工具，最后用课程步骤完成素材、方案、脚本或自动化流程。",
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

const skillLearningFaqItems = {
  zh: [
    {
      question: "ENHE AI 技能学习适合零基础用户吗？",
      answer:
        "适合。建议从提示词基础、常用 AI 工具工作流和具体任务案例开始，再逐步学习本地部署、自动化和多模态创作。",
    },
    {
      question: "如何判断应该先学课程还是先选工具？",
      answer:
        "如果你已经有明确任务，可以先选工具再按教程落地；如果还不清楚 AI 能解决什么问题，先看 AI 前沿资讯和趋势分析，再选择课程。",
    },
    {
      question: "AI 技能课程如何转化为实际工作成果？",
      answer:
        "围绕一个真实交付物学习，例如一份方案、一组视频素材、一个自动化流程或一套运营模板，并把步骤沉淀为可复用流程。",
    },
  ],
  en: [
    {
      question: "Is ENHE AI skill learning suitable for beginners?",
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
): Promise<Metadata> {
  const t = getDictionary(forceLocale);
  return buildPageMetadata({
    title: buildMetadataTitle({
      pageTitle: t.listing.skillLearningTitle,
      brand: t.brand,
    }),
    description: buildListingMetaDescription("skill-learning", forceLocale),
    path: "/skill-learning",
    locale: forceLocale === "en" ? "en_US" : "zh_CN",
    localeKey: forceLocale,
  });
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

  return (
    <main>
      <Container className="py-14">
        <StructuredData data={[breadcrumbSchema, faqSchema]} />
        <SectionTitle
          as="h1"
          title={t.listing.skillLearningTitle}
          intro={t.listing.skillLearningIntro}
        />
        <SkillLearningGeoBlock forceLocale={forceLocale} />
        <SkillLearningOutcomeBlock forceLocale={forceLocale} />
        <FilterBar categories={categories} locale={forceLocale} />
        {tools.length ? (
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {tools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} locale={forceLocale} />
            ))}
          </div>
        ) : (
          <EmptyState title={t.listing.emptyTitle} text={t.listing.emptyText} />
        )}
      </Container>
    </main>
  );
}

function SkillLearningOutcomeBlock({ forceLocale }: { forceLocale: Locale }) {
  const sections = skillLearningOutcomeSections[forceLocale];
  const faqs = skillLearningFaqItems[forceLocale];

  return (
    <section className="mt-8 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="surface-panel-soft p-6">
        <h2 className="text-2xl font-black text-[var(--marketing-text)]">
          {forceLocale === "en"
            ? "From AI skills to repeatable workflows"
            : "从 AI 技能到可复用工作流"}
        </h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {sections.map((section, index) => (
            <article
              key={section.title}
              className="rounded-2xl border border-white/10 bg-white/7 p-4"
            >
              <span className="text-xs font-black uppercase tracking-[0.22em] text-[var(--marketing-accent)]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-3 text-base font-black leading-snug text-[var(--marketing-text)]">
                {section.title}
              </h3>
              <p className="mt-2 text-sm leading-7 text-[var(--marketing-muted)]">
                {section.body}
              </p>
            </article>
          ))}
        </div>
      </div>
      <div className="surface-panel-soft p-6">
        <h2 className="text-2xl font-black text-[var(--marketing-text)]">
          {forceLocale === "en" ? "AI learning FAQ" : "AI 技能学习常见问题"}
        </h2>
        <div className="mt-5 space-y-4">
          {faqs.map((item) => (
            <article
              key={item.question}
              className="rounded-2xl border border-white/10 bg-white/7 p-4"
            >
              <h3 className="text-base font-black leading-snug text-[var(--marketing-text)]">
                {item.question}
              </h3>
              <p className="mt-2 text-sm leading-7 text-[var(--marketing-muted)]">
                {item.answer}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function SkillLearningGeoBlock({ forceLocale }: { forceLocale: Locale }) {
  const sections = skillLearningGeoSections[forceLocale];
  const links = [
    {
      label: { zh: "先看 AI 前沿趋势", en: "Read AI trends first" },
      href: buildLocalePath("/ai-news", forceLocale),
    },
    {
      label: { zh: "选择 AI 软件应用", en: "Choose AI software apps" },
      href: buildLocalePath("/software", forceLocale),
    },
    {
      label: { zh: "了解 AI 账号服务", en: "Review account service guidance" },
      href: buildLocalePath("/account-services", forceLocale),
    },
  ];

  return (
    <section className="glass mt-8 rounded-2xl p-6">
      <div className="grid gap-4 lg:grid-cols-3">
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
            className="rounded-full border border-white/14 bg-white/7 px-4 py-2 text-sm font-bold text-[var(--marketing-text)] transition hover:border-[var(--marketing-accent)] hover:text-[var(--marketing-accent)]"
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
      <input
        name="q"
        placeholder={t.listing.searchPlaceholder}
        className="form-control-dark"
      />
      <select name="category" className="form-select-dark">
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
      <select name="sort" className="form-select-dark">
        <option value="latest">{t.listing.latest}</option>
        <option value="hot">{t.listing.hot}</option>
      </select>
      <button className="rounded-full bg-[#050505] px-5 py-3 font-bold text-white transition hover:bg-[#161616] md:col-span-3">
        {t.listing.filter}
      </button>
    </form>
  );
}
