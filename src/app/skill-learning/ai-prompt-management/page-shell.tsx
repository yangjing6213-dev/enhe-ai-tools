import type { Metadata } from "next";
import Link from "next/link";
import { AiPromptManagementWorkbench } from "@/components/ai-prompt-management-workbench";
import { StructuredData } from "@/components/structured-data";
import { Container } from "@/components/ui";
import { aiPromptManagementManifest } from "@/data/ai-prompt-management-manifest";
import type { Locale } from "@/lib/dictionaries";
import {
  absoluteUrl,
  buildBreadcrumbSchema,
  buildFaqSchema,
  buildLocalePath,
  buildMetadataTitle,
  buildPageMetadata,
} from "@/lib/seo";

const pageCopy = {
  zh: {
    title: "AI提示词管理系统",
    description:
      "免费 AI 提示词管理系统，收录写作、短视频、图像生成、学习、职场、运营和编程等场景的中英文提示词，支持搜索、分类、补充任务背景并一键复制。",
    eyebrow: "免费 AI 技能工具",
    heading: "AI提示词管理系统",
    intro:
      "不再翻聊天记录找提示词。先选场景，再补充自己的任务背景，把收藏的提示词变成随手可用的工作指令。",
    guideTitle: "怎样用得更稳",
    guide:
      "先选择最接近的场景，再写清楚目标、对象、平台、语气和限制。复制后可直接用于 ChatGPT、Claude、Gemini、DeepSeek、豆包、通义千问或其他 AI 工具。",
    related: "继续学习",
    relatedLinks: [
      { label: "Build Your Own X 项目导航器", href: "/build-your-own-x" },
      { label: "AI技能学习", href: "/skill-learning" },
      { label: "AI前沿资讯", href: "/ai-news" },
    ],
    faq: [
      {
        question: "AI提示词管理系统适合谁？",
        answer:
          "适合普通 AI 用户、内容创作者、电商运营、产品经理、学生、职场用户和需要企业内部提示词库的团队。",
      },
      {
        question: "这个页面需要登录吗？",
        answer: "不需要。网页版是免费公开工具，可以直接搜索、分类和复制提示词。",
      },
      {
        question: "桌面版和网页版有什么区别？",
        answer:
          "网页版适合随时使用和公开发现，桌面版更适合作为离线提示词库、培训资料或企业交付版本。",
      },
    ],
  },
  en: {
    title: "AI Prompt Management System",
    description:
      "Search 418 Chinese prompts and 418 English prompts across 11 categories in a free library. Filter by category, add task context, and copy prompts into your AI assistant.",
    eyebrow: "Free AI skill tool",
    heading: "AI Prompt Management System",
    intro:
      "Browse 418 Chinese prompts and 418 English prompts across 11 categories in the free public web library. Search by task, filter by category, add your own context, and copy a prompt into the AI assistant you use. No sign-in is required. The desktop download is a separate paid product; check the current offer for its price, included files, and delivery details.",
    guideTitle: "How to use the prompt library",
    guide:
      "1. Open the free web library; no sign-in is required. 2. Search by task or choose a category. 3. Select a prompt and add context that matters to you, such as your goal, audience, platform, tone, or constraints. 4. Copy it into your AI assistant and review the result before using it.",
    related: "Keep learning",
    relatedLinks: [
      { label: "Build Your Own X Navigator", href: "/build-your-own-x" },
      { label: "AI Skill Learning", href: "/skill-learning" },
      { label: "AI News", href: "/ai-news" },
    ],
    faq: [
      {
        question: "What can I do with the web library?",
        answer:
          "Search prompt entries by keyword, filter by category, add task context, and copy a prompt for use in an AI assistant.",
      },
      {
        question: "Do I need to sign in to use the web library?",
        answer: "No. The web library is free to use without signing in.",
      },
      {
        question: "How many prompts are available?",
        answer:
          "The Chinese dataset and English dataset each contain 418 prompt entries across 11 categories.",
      },
      {
        question: "Does the free web library include the desktop download?",
        answer:
          "No. The desktop download is a separate paid product. Check the current offer for its price, included files, and delivery details.",
      },
    ],
  },
} as const;

export async function generateAiPromptManagementMetadata(
  locale: Locale,
): Promise<Metadata> {
  const copy = pageCopy[locale];
  return buildPageMetadata({
    title: buildMetadataTitle({ pageTitle: copy.title }),
    description: copy.description,
    path: "/skill-learning/ai-prompt-management",
    locale: locale === "en" ? "en_US" : "zh_CN",
    localeKey: locale,
  });
}

export function AiPromptManagementPageShell({
  forceLocale,
}: {
  forceLocale: Locale;
}) {
  const copy = pageCopy[forceLocale];
  const path = buildLocalePath(
    "/skill-learning/ai-prompt-management",
    forceLocale,
  );
  const categories = aiPromptManagementManifest.categories[forceLocale];
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: copy.title,
      applicationCategory: "ProductivityApplication",
      operatingSystem: "Web",
      url: absoluteUrl(path),
      description: copy.description,
      inLanguage: forceLocale === "en" ? "en-US" : "zh-CN",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "CNY" },
      featureList: [
        `${aiPromptManagementManifest.total} prompts`,
        "Search",
        "Category filters",
        "Task context",
        "Copy",
      ],
    },
    buildBreadcrumbSchema({
      items: [
        {
          name: forceLocale === "en" ? "Home" : "首页",
          path: buildLocalePath("/", forceLocale),
        },
        {
          name: forceLocale === "en" ? "AI Skill Learning" : "AI技能学习",
          path: buildLocalePath("/skill-learning", forceLocale),
        },
        { name: copy.title, path },
      ],
    }),
    buildFaqSchema({ items: copy.faq }),
  ];

  return (
    <main>
      <StructuredData data={schema} />
      <Container className="py-10 sm:py-14">
        <section className="surface-panel p-6 sm:p-8">
          <p className="text-sm font-black text-[var(--marketing-accent)]">
            {copy.eyebrow}
          </p>
          <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(280px,0.55fr)] lg:items-end">
            <div>
              <h1 className="text-4xl font-black tracking-normal text-[var(--marketing-text)] md:text-5xl">
                {copy.heading}
              </h1>
              <p className="mt-4 max-w-3xl text-base font-medium leading-8 text-[var(--marketing-muted)]">
                {copy.intro}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <span className="rounded-lg border border-[var(--marketing-border)] bg-white/80 px-3 py-2 text-sm font-bold text-[#15171c]">
                {aiPromptManagementManifest.total}{" "}
                {forceLocale === "en" ? "prompts" : "条提示词"}
              </span>
              <span className="rounded-lg border border-[var(--marketing-border)] bg-white/80 px-3 py-2 text-sm font-bold text-[#15171c]">
                {categories.length}{" "}
                {forceLocale === "en" ? "categories" : "个分类"}
              </span>
              {categories.slice(0, 4).map((category) => (
                <span
                  key={category}
                  className="rounded-lg border border-[var(--marketing-border)] bg-white/80 px-3 py-2 text-sm font-bold text-[#15171c]"
                >
                  {category}
                </span>
              ))}
            </div>
          </div>
        </section>

        <AiPromptManagementWorkbench
          locale={forceLocale}
          datasetPath={aiPromptManagementManifest.paths[forceLocale]}
        />

        <section className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <article className="surface-panel-soft p-6">
            <h2 className="text-2xl font-black tracking-normal text-[var(--marketing-text)]">
              {copy.guideTitle}
            </h2>
            <p className="mt-3 text-base leading-8 text-[var(--marketing-muted)]">
              {copy.guide}
            </p>
          </article>
          <aside className="surface-panel-soft p-6">
            <h2 className="text-lg font-black tracking-normal text-[var(--marketing-text)]">
              {copy.related}
            </h2>
            <div className="mt-4 grid gap-3">
              {copy.relatedLinks.map((item) => (
                <Link
                  key={item.href}
                  href={buildLocalePath(item.href, forceLocale)}
            className="rounded-lg border border-[var(--marketing-border)] bg-white/80 px-4 py-3 text-sm font-bold text-[#15171c] transition-[border-color,color] hover:border-[var(--marketing-accent)] hover:text-[var(--marketing-accent)]"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </aside>
        </section>

        <section className="surface-panel-soft mt-8 p-6">
          <h2 className="text-2xl font-black tracking-normal text-[var(--marketing-text)]">
            FAQ
          </h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {copy.faq.map((item) => (
              <article
                key={item.question}
                className="rounded-lg border border-[var(--marketing-border)] bg-white/80 p-4"
              >
                <h3 className="text-base font-black text-[#15171c]">
                  {item.question}
                </h3>
                <p className="mt-2 text-sm leading-7 text-[#5d6675]">
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
