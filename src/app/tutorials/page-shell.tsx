import type { Metadata } from "next";
import Link from "next/link";
import { StructuredData } from "@/components/structured-data";
import { Container, SectionTitle } from "@/components/ui";
import {
  buildLocalizedTutorialPreviewTitle,
  buildLocalizedTutorialPreviewToolName,
} from "@/lib/ai-news-localization";
import { getDictionary, type Locale } from "@/lib/dictionaries";
import { getPublicTutorials } from "@/lib/public-content";
import { buildCanonicalToolPath } from "@/lib/public-slugs";
import { publicPageCacheSeconds } from "@/lib/public-routes";
import { buildBreadcrumbSchema, buildFaqSchema, buildListingMetadataTitle, buildListingMetaDescription, buildPageMetadata } from "@/lib/seo";

export const tutorialsPageRevalidate = publicPageCacheSeconds;
export const tutorialDetailGate = "BLOCKED_TUTORIAL_DETAIL_KEY";

export async function generateTutorialsPageMetadata(forceLocale: Locale): Promise<Metadata> {
  const t = getDictionary(forceLocale);
  const isDbFreePreview = !process.env.DATABASE_URL;
  const metadata = buildPageMetadata({
    title: buildListingMetadataTitle("tutorials", forceLocale, t.brand),
    description: isDbFreePreview
      ? forceLocale === "en"
        ? "English tutorial content is not available in this local preview."
        : "教程内容尚未核验，当前本地预览不提供可发布教程事实。"
      : buildListingMetaDescription("tutorials", forceLocale),
    path: "/tutorials",
    locale: forceLocale === "en" ? "en_US" : "zh_CN",
    localeKey: forceLocale,
  });
  if (isDbFreePreview) metadata.robots = { index: false, follow: true };
  return metadata;
}

export async function TutorialsPageShell({ forceLocale }: { forceLocale: Locale }) {
  const tutorials = await getPublicTutorials();
  const t = getDictionary(forceLocale);
  if (tutorials.length === 0) {
    return (
      <Container className="py-14">
        <main data-content-status="UNVERIFIED" className="surface-panel p-8">
          <SectionTitle as="h1" title={t.tutorials.title} intro={t.tutorials.intro} />
          <p className="mt-6 text-sm font-semibold leading-7 text-[var(--marketing-muted)]">
            {forceLocale === "en"
              ? "UNVERIFIED — English tutorial content is not available yet."
              : "UNVERIFIED — 教程内容尚未核验。"}
          </p>
        </main>
      </Container>
    );
  }
  const tutorialGuidance =
    forceLocale === "en"
      ? {
          title: "How to use ENHE AI tutorials",
          workflowSteps: "Start from the matching tool page, read the setup notes, follow the ordered steps, then return to the detail page for downloads, account guidance, or related courses.",
          commonErrors: "When a workflow behaves unexpectedly, check version requirements, login state, file permissions, model limits, and platform policy changes before retrying.",
          relatedTools: "Each tutorial connects back to related software, account guidance, or skill learning so users can move from learning to execution."
        }
      : {
          title: "如何使用 ENHE AI 教程",
          workflowSteps: "建议先从对应工具详情页开始，阅读安装与准备说明，再按教程步骤执行，最后回到详情页查看下载、账号服务建议或相关课程。",
          commonErrors: "如果流程执行不符合预期，优先检查版本要求、登录状态、文件权限、模型额度和平台政策变化，再决定是否重新操作。",
          relatedTools: "每篇教程都会关联对应的软件应用、账号服务或技能课程，方便你从学习自然进入实际使用。"
        };
  const breadcrumbSchema = buildBreadcrumbSchema({
    schemaType: "BreadcrumbList",
    items: [
      { name: t.nav.home, path: forceLocale === "en" ? "/en" : "/" },
      { name: t.tutorials.title, path: forceLocale === "en" ? "/en/tutorials" : "/tutorials" }
    ]
  });
  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: tutorialGuidance.title,
    description: t.tutorials.intro,
    inLanguage: forceLocale === "en" ? "en-US" : "zh-CN",
    step: [
      {
        "@type": "HowToStep",
        name: forceLocale === "en" ? "Choose the matching tool page" : "选择对应工具页",
        text: tutorialGuidance.workflowSteps
      },
      {
        "@type": "HowToStep",
        name: forceLocale === "en" ? "Follow the operating notes" : "按操作说明执行",
        text: tutorialGuidance.relatedTools
      },
      {
        "@type": "HowToStep",
        name: forceLocale === "en" ? "Check common errors" : "检查常见问题",
        text: tutorialGuidance.commonErrors
      }
    ]
  };
  const faqItems =
    forceLocale === "en"
      ? [
          {
            question: "How should I choose an ENHE AI tutorial?",
            answer:
              "Choose by the task you want to finish first, then open the related tool page to confirm setup notes, access requirements, pricing, and support boundaries.",
          },
          {
            question: "What should I check before following a tutorial?",
            answer:
              "Check the tool version, login state, file permissions, model limits, platform policy, and whether the workflow needs local software, account guidance, or a skill course.",
          },
          {
            question: "How do tutorials connect with ENHE AI products?",
            answer:
              "Tutorials point users back to related software, account-service guidance, and skill-learning pages so the learning step can become a real workflow.",
          },
        ]
      : [
          {
            question: "应该如何选择 ENHE AI 教程？",
            answer:
              "先按你要完成的真实任务选择教程，再进入关联工具详情页确认安装说明、访问要求、价格、交付方式和售后边界。",
          },
          {
            question: "跟着教程操作前需要检查什么？",
            answer:
              "建议先检查工具版本、登录状态、文件权限、模型额度、平台政策，以及该流程是否需要本地软件、账号服务或技能课程配合。",
          },
          {
            question: "教程如何连接 ENHE AI 产品？",
            answer:
              "教程会把用户带回相关软件、账号服务和技能学习页面，让学习步骤继续转化为实际可复用的工作流。",
          },
        ];
  const faqSchema = buildFaqSchema({ items: faqItems });

  return (
    <Container className="tutorials-page py-14">
      <StructuredData data={[breadcrumbSchema, howToSchema, faqSchema]} />
      <main>
      <SectionTitle as="h1" title={t.tutorials.title} intro={t.tutorials.intro} />
      <section className="surface-panel mb-8 p-6">
        <div className="rounded-2xl border border-[var(--marketing-accent)]/28 bg-[var(--marketing-accent)]/10 p-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--marketing-accent)]">
            {forceLocale === "en" ? "Use before purchase or deployment" : "购买或部署前先看"}
          </p>
          <h2 className="mt-3 text-2xl font-black leading-snug text-[var(--marketing-text)]">{tutorialGuidance.title}</h2>
          <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-[var(--marketing-muted)]">
            {forceLocale === "en"
              ? "Tutorials are meant to reduce trial-and-error before you buy, deploy, or request account guidance."
              : "使用教程的作用是减少购买、部署或咨询账号服务前的试错成本，让你先看清准备条件、操作步骤和常见问题。"}
          </p>
        </div>
        <details className="content-fold mt-5">
          <summary>
            <div className="content-fold-summary-copy">
              <h2 className="text-xl font-black text-[var(--marketing-text)]">
                {tutorialGuidance.title}
              </h2>
            </div>
          </summary>
          <div className="content-fold-body">
            <div className="grid gap-4 md:grid-cols-3">
          {[
            { title: forceLocale === "en" ? "Workflow steps" : "学习路径", text: tutorialGuidance.workflowSteps },
            { title: forceLocale === "en" ? "Common errors" : "常见问题", text: tutorialGuidance.commonErrors },
            { title: forceLocale === "en" ? "Related tools" : "关联工具", text: tutorialGuidance.relatedTools }
          ].map((item) => (
            <article key={item.title} className="rounded-2xl border border-white/10 bg-white/8 p-4">
              <h3 className="font-semibold text-[var(--marketing-text)]">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-[var(--marketing-muted)]">{item.text}</p>
            </article>
          ))}
            </div>
          </div>
        </details>
        <div className="mt-5 flex flex-wrap gap-3">
          {[
            { label: forceLocale === "en" ? "Choose software" : "选择 AI 软件", href: "/software" },
            { label: forceLocale === "en" ? "Learn skills" : "学习 AI 技能", href: "/skill-learning" },
            { label: forceLocale === "en" ? "Read AI news" : "阅读 AI 资讯", href: "/ai-news" },
          ].map((item) => (
            <Link
              key={item.href}
              href={forceLocale === "en" ? `/en${item.href}` : item.href}
              className="rounded-full border border-white/14 bg-white/7 px-4 py-2 text-sm font-bold text-[var(--marketing-text)] transition-[border-color,color] hover:border-[var(--marketing-accent)] hover:text-[var(--marketing-accent)]"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </section>
      <div className="grid gap-5 md:grid-cols-2">
        {tutorials.map((tutorial) => {
          const title = buildLocalizedTutorialPreviewTitle(tutorial.title, tutorial.tool, forceLocale);
          const toolName = buildLocalizedTutorialPreviewToolName(tutorial.tool, forceLocale);
          const previewText =
            forceLocale === "en"
              ? `Follow this guide to understand setup notes, operating steps, and common checks for ${toolName}. Open the related detail page before purchase or deployment.`
              : tutorial.content;

          return (
              <Link key={tutorial.id} href={buildCanonicalToolPath(tutorial.tool, forceLocale)} className="surface-panel p-6 transition-[border-color,transform] hover:-translate-y-1 hover:border-[var(--marketing-accent)]/45" data-analytics-event="content_to_product_click" data-analytics-entity-type="tool" data-analytics-entity-id={tutorial.tool.id} data-analytics-meta-source="tutorials">
              <p className="text-sm font-semibold text-[var(--marketing-accent)]">{toolName}</p>
              <h2 className="mt-2 text-2xl font-bold text-[var(--marketing-text)]">{title}</h2>
              <p className="mt-3 line-clamp-3 leading-7 text-[var(--marketing-muted)]">{previewText}</p>
            </Link>
          );
        })}
      </div>
      <details className="content-fold surface-panel mt-8">
        <summary>
          <div className="content-fold-summary-copy">
        <h2 className="text-2xl font-semibold text-[var(--marketing-text)]">
          {forceLocale === "en" ? "Tutorial FAQ" : "使用教程常见问题"}
        </h2>
          </div>
        </summary>
        <div className="content-fold-body">
        <div className="grid gap-4 md:grid-cols-3">
          {faqItems.map((item) => (
            <details key={item.question} className="content-fold">
              <summary>
                <h3 className="font-semibold leading-snug text-[var(--marketing-text)]">{item.question}</h3>
              </summary>
              <div className="content-fold-body">
                <p className="text-sm leading-7 text-[var(--marketing-muted)]">{item.answer}</p>
              </div>
            </details>
          ))}
        </div>
        </div>
      </details>
      </main>
    </Container>
  );
}
