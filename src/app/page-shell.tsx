import type { Metadata } from "next";
import { connection } from "next/server";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  BookOpenCheck,
  BriefcaseBusiness,
  Building2,
  Clapperboard,
  FileSearch,
  GraduationCap,
  Languages,
  Newspaper,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { StructuredData } from "@/components/structured-data";
import { ASCIIHeroTitle } from "@/components/home/ascii-hero-title";
import BorderGlow from "@/components/home/border-glow";
import { HeroGradientSubtitle } from "@/components/home/hero-gradient-subtitle";
import { HomeParticlesBackground } from "@/components/home/home-particles-background";
import { ProductDemoCard } from "@/components/product-demo-card";
import { ButtonLink, Container } from "@/components/ui";
import { getDictionary, type Locale } from "@/lib/dictionaries";
import { getHomeProductDemos } from "@/lib/product-demos";
import {
  buildBreadcrumbSchema,
  buildFaqSchema,
  buildHomeMetaDescription,
  buildHomeMetadataTitle,
  buildLocalePath,
  buildPageEntityId,
  buildPageMetadata,
  absoluteUrl,
} from "@/lib/seo";
import { publicPageCacheSeconds } from "@/lib/public-routes";
import { getEffectiveLocalizedHomeHeroIntro, getSettingsMap } from "@/lib/settings";

export const publicPageRevalidate = publicPageCacheSeconds;

const homeFaqItems = {
  zh: [
    {
      question: "恩禾 ENHE AI 是什么？",
      answer:
        "ENHE AI 帮助用户把 AI 用到真实任务里：更快完成工作、创作内容、整理资料、学习技能、解决工具选择和使用问题。在需要处理敏感素材、长期稳定流程或隐私边界时，提供更可控的AI工具和路径。",
    },
    {
      question: "新用户应该从哪里开始使用 ENHE AI？",
      answer:
        "先从要完成的任务开始：提效、创作、整理资料、学习技能或处理敏感素材。任务明确后，再进入 AI软件应用、AI技能学习、AI前沿资讯或 AI账号服务页面选择合适路径。",
    },
    {
      question: "ENHE AI 为什么强调安全、隐私和稳定？",
      answer:
        "普通用户使用 AI 时，常会处理客户资料、创作素材、账号信息、内部文档和课程文件。ENHE AI 会把本地或更可控的 AI 路径解释成安全、隐私和稳定收益，帮助用户减少盲目上传和反复试错。",
    },
  ],
  en: [
    {
      question: "What is ENHE AI?",
      answer:
        "ENHE AI helps users apply AI to real tasks: work faster, create content, organize material, learn skills, and solve tool-selection and usage problems. When sensitive material, long-running workflows, or privacy boundaries matter, it provides more controllable AI tools and paths.",
    },
    {
      question: "Where should new users start on ENHE AI?",
      answer:
        "Start from the task: productivity, content creation, material organization, skill learning, or sensitive-material handling. Then choose AI software apps, AI skill learning, AI news, or account-service guidance as the matching path.",
    },
    {
      question: "Why does ENHE AI emphasize safety, privacy, and stability?",
      answer:
        "AI users often work with client files, creative assets, account information, internal documents, and course material. ENHE AI explains local or more controlled AI paths as safety, privacy, and stability benefits, not as abstract technical features.",
    },
  ],
} as const;

type HomeTrustSignal = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  rawHref?: boolean;
};

type HomeTaskOutcome = {
  id: string;
  title: string;
  description: string;
  linkLabel: string;
  href: string;
  image: string;
  imageAlt: string;
  icon: LucideIcon;
};

const homeTrustSignals: Record<Locale, HomeTrustSignal[]> = {
  zh: [
    {
      title: "中英双语路径",
      description: "首页、列表与核心内容提供可切换的中英文入口。",
      href: "/en",
      icon: Languages,
      rawHref: true,
    },
    {
      title: "公开 AI 阅读入口",
      description: "llms.txt 公开说明品牌、内容范围与机器可读入口。",
      href: "/llms.txt",
      icon: FileSearch,
      rawHref: true,
    },
    {
      title: "真实主体信息",
      description: "品牌档案、公司信息与联系方式均可公开核验。",
      href: "/about",
      icon: Building2,
    },
    {
      title: "清晰隐私边界",
      description: "在注册、订单与工具使用前先了解信息处理规则。",
      href: "/legal/privacy-policy",
      icon: ShieldCheck,
    },
  ],
  en: [
    {
      title: "Bilingual paths",
      description: "Switch between Chinese and English across core public routes.",
      href: "/",
      icon: Languages,
      rawHref: true,
    },
    {
      title: "Open AI guidance",
      description: "llms.txt documents the brand, content scope, and machine-readable entry points.",
      href: "/llms.txt",
      icon: FileSearch,
      rawHref: true,
    },
    {
      title: "Verifiable identity",
      description: "Review the public brand profile, company details, and contact channels.",
      href: "/about",
      icon: Building2,
    },
    {
      title: "Clear privacy boundaries",
      description: "Understand information handling before registration, orders, or tool use.",
      href: "/legal/privacy-policy",
      icon: ShieldCheck,
    },
  ],
};

const homeTaskOutcomes: Record<Locale, HomeTaskOutcome[]> = {
  zh: [
    {
      id: "productivity",
      title: "更快完成日常工作",
      description: "按办公、文件处理、自动化和本地 AI 场景筛选工具。",
      linkLabel: "进入效率工具路径",
      href: "/product-paths/work-efficiency",
      image: "/images/home/flowing-menu/productivity.webp",
      imageAlt: "AI 工作效率与自动化工作场景",
      icon: BriefcaseBusiness,
    },
    {
      id: "content-creation",
      title: "把创意变成内容成果",
      description: "查找图片、视频、音频和写作工具，并进入对应使用路径。",
      linkLabel: "进入内容创作路径",
      href: "/product-paths/media-generation",
      image: "/images/home/flowing-menu/content-creation.webp",
      imageAlt: "AI 图片、视频和音频内容创作场景",
      icon: Clapperboard,
    },
    {
      id: "ai-learning",
      title: "把教程练成可复用技能",
      description: "从工具入门到智能体、自动化工作流和本地部署逐步学习。",
      linkLabel: "进入 AI 学习路径",
      href: "/skill-learning",
      image: "/images/home/flowing-menu/ai-learning.webp",
      imageAlt: "AI 教程学习与实操场景",
      icon: GraduationCap,
    },
    {
      id: "ai-news",
      title: "把 AI 变化转成行动判断",
      description: "阅读工具更新、行业趋势与实用教程，再决定下一步行动。",
      linkLabel: "查看 AI 前沿资讯",
      href: "/ai-news",
      image: "/images/home/flowing-menu/ai-news.webp",
      imageAlt: "人工智能资讯与行业动态场景",
      icon: Newspaper,
    },
  ],
  en: [
    {
      id: "productivity",
      title: "Finish everyday work faster",
      description: "Filter tools for office work, files, automation, and local AI workflows.",
      linkLabel: "Explore productivity paths",
      href: "/product-paths/work-efficiency",
      image: "/images/home/flowing-menu/productivity.webp",
      imageAlt: "AI productivity and workflow automation",
      icon: BriefcaseBusiness,
    },
    {
      id: "content-creation",
      title: "Turn ideas into content outcomes",
      description: "Find image, video, audio, and writing tools with practical next steps.",
      linkLabel: "Explore creation paths",
      href: "/product-paths/media-generation",
      image: "/images/home/flowing-menu/content-creation.webp",
      imageAlt: "AI image, video and audio content creation",
      icon: Clapperboard,
    },
    {
      id: "ai-learning",
      title: "Build reusable AI skills",
      description: "Learn tools, agents, automation workflows, and local deployment step by step.",
      linkLabel: "Explore AI learning",
      href: "/skill-learning",
      image: "/images/home/flowing-menu/ai-learning.webp",
      imageAlt: "Practical AI tutorials and skills",
      icon: GraduationCap,
    },
    {
      id: "ai-news",
      title: "Turn AI change into decisions",
      description: "Review product updates, industry signals, and practical guidance before acting.",
      linkLabel: "Read AI news",
      href: "/ai-news",
      image: "/images/home/flowing-menu/ai-news.webp",
      imageAlt: "Artificial intelligence news and industry signals",
      icon: Newspaper,
    },
  ],
};

const homeWorkflowSteps = {
  zh: [
    { title: "从真实任务开始", description: "先明确要提升效率、创作内容、学习技能，还是处理隐私与稳定性要求。" },
    { title: "核对内容与边界", description: "查看演示、教程、平台规则、交付方式和隐私说明，排除不合适的路径。" },
    { title: "进入可执行路径", description: "进入工具、课程、资讯或账号服务页面，继续完成选择、学习或咨询。" },
  ],
  en: [
    { title: "Start with the real task", description: "Define whether you need productivity, creation, learning, or stronger privacy and stability." },
    { title: "Review evidence and boundaries", description: "Check demos, tutorials, platform rules, delivery details, and privacy guidance before choosing." },
    { title: "Follow the practical path", description: "Continue to the relevant tool, course, news, or account-service page to act." },
  ],
} as const;

const homeConversionCopy = {
  zh: {
    trustEyebrow: "可核验信息",
    trustTitle: "先确认来源与边界，再选择 AI 路径",
    trustIntro: "这些入口直接连接到站内公开页面，不使用无法核验的用户数量、客户 Logo 或评价。",
    taskTitle: "你想获得什么价值？",
    taskIntro: "从工作、创作、学习与资讯判断出发，进入对应的工具和内容路径。",
    workflowEyebrow: "三步完成选择",
    workflowTitle: "从需求到行动，不必先理解所有 AI 术语",
    workflowIntro: "先看任务，再核对证据和边界，最后进入真正可执行的页面。",
    finalTitle: "从一个真实任务开始使用 ENHE AI",
    finalIntro: "先找到适合的工具，或进入实战学习路径，把信息转成下一步行动。",
  },
  en: {
    trustEyebrow: "Verifiable information",
    trustTitle: "Check the source and boundaries before choosing an AI path",
    trustIntro: "Each signal links to a public page. No unverifiable user counts, customer logos, or testimonials are used.",
    taskTitle: "What outcome do you need?",
    taskIntro: "Start from work, creation, learning, or decision support, then follow the relevant tool and content path.",
    workflowEyebrow: "A three-step path",
    workflowTitle: "Move from need to action without learning every AI term first",
    workflowIntro: "Start with the task, review evidence and boundaries, then continue to a practical page.",
    finalTitle: "Start ENHE AI with one real task",
    finalIntro: "Find a suitable tool or follow a practical learning path to turn information into action.",
  },
} as const;

const homeSupportLinks = {
  zh: [
    { label: "价格与购买说明", href: "/pricing" },
    { label: "使用教程", href: "/tutorials" },
    { label: "AI 前沿资讯", href: "/ai-news" },
    { label: "AI 趋势分析", href: "/ai-trends" },
    { label: "AI 主题路径", href: "/ai-topics" },
    { label: "Build Your Own X", href: "/build-your-own-x" },
  ],
  en: [
    { label: "Pricing and purchase notes", href: "/pricing" },
    { label: "Tutorials", href: "/tutorials" },
    { label: "AI News", href: "/ai-news" },
    { label: "AI Trends", href: "/ai-trends" },
    { label: "AI topic paths", href: "/ai-topics" },
    { label: "Build Your Own X", href: "/build-your-own-x" },
  ],
} as const;

const homeTopicGrowthLinks = {
  zh: [
    {
      title: "AI 内容创作工具",
      description: "写作、视频、图片和发布工具路径。",
      href: "/ai-topics/ai-content-creation-tools",
    },
    {
      title: "本地 AI 部署",
      description: "适合重视隐私、离线和稳定工作流的用户。",
      href: "/ai-topics/local-ai-deployment",
    },
    {
      title: "AI 账号服务合规",
      description: "购买前先确认平台规则、交付边界和风险提示。",
      href: "/ai-topics/ai-account-service-compliance",
    },
    {
      title: "AI 技能学习路线",
      description: "把课程、工具和项目练习连接成可复用能力。",
      href: "/ai-topics/ai-skill-learning-path",
    },
  ],
  en: [
    {
      title: "AI content creation tools",
      description: "Writing, video, image, and publishing tool paths.",
      href: "/ai-topics/ai-content-creation-tools",
    },
    {
      title: "Local AI deployment",
      description: "For privacy, offline use, and stable workflows.",
      href: "/ai-topics/local-ai-deployment",
    },
    {
      title: "AI account service compliance",
      description: "Check platform rules, delivery scope, and risk notes before purchase.",
      href: "/ai-topics/ai-account-service-compliance",
    },
    {
      title: "AI skill learning path",
      description: "Connect courses, tools, and projects into reusable capability.",
      href: "/ai-topics/ai-skill-learning-path",
    },
  ],
} as const;

export async function generateHomePageMetadata(forceLocale: Locale): Promise<Metadata> {
  const settings = await getSettingsMap();
  const t = getDictionary(forceLocale);
  return buildPageMetadata({
    title: buildHomeMetadataTitle(forceLocale, t.brand),
    description: buildHomeMetaDescription(forceLocale, getEffectiveLocalizedHomeHeroIntro(settings, forceLocale, t.home.intro)),
    path: "/",
    locale: forceLocale === "en" ? "en_US" : "zh_CN",
    localeKey: forceLocale
  });
}

export async function HomePageShell({ forceLocale }: { forceLocale: Locale }) {
  await connection();
  const homeProductDemos = await getHomeProductDemos();
  const t = getDictionary(forceLocale);
  const conversionCopy = homeConversionCopy[forceLocale];
  const heroTitle =
    forceLocale === "en"
      ? "ENHE AI"
      : "ENHE AI";
  const heroIntro = t.home.intro;
  const homePath = buildLocalePath("/", forceLocale);
  const webPageId = buildPageEntityId(homePath);
  const breadcrumbId = buildPageEntityId(homePath, "breadcrumb");
  const taskCollectionId = buildPageEntityId(homePath, "task-collection");
  const taskListId = buildPageEntityId(homePath, "task-list");
  const breadcrumbSchema = {
    ...buildBreadcrumbSchema({
      items: [{ name: t.nav.home, path: homePath }],
    }),
    "@id": breadcrumbId,
  };
  const faqSchema = buildFaqSchema({ items: homeFaqItems[forceLocale] });
  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": webPageId,
    name: t.brand,
    description: t.home.positioning,
    url: absoluteUrl(homePath),
    inLanguage: forceLocale === "en" ? "en-US" : "zh-CN",
    isPartOf: {
      "@type": "WebSite",
      "@id": absoluteUrl("/#website"),
    },
    mainEntity: {
      "@type": "Organization",
      "@id": absoluteUrl("/#organization"),
      name: "ENHE AI",
    },
    breadcrumb: { "@id": breadcrumbId },
    hasPart: { "@id": taskCollectionId },
  };
  const taskCollectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": taskCollectionId,
    name: conversionCopy.taskTitle,
    description: conversionCopy.taskIntro,
    url: absoluteUrl(homePath),
    inLanguage: forceLocale === "en" ? "en-US" : "zh-CN",
    isPartOf: { "@id": webPageId },
    mainEntity: { "@id": taskListId },
  };
  const taskItemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": taskListId,
    name: conversionCopy.taskTitle,
    numberOfItems: homeTaskOutcomes[forceLocale].length,
    itemListElement: homeTaskOutcomes[forceLocale].map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.title,
      description: item.description,
      url: absoluteUrl(buildLocalePath(item.href, forceLocale)),
    })),
  };

  return (
    <main className="home-page-shell">
      <StructuredData data={[breadcrumbSchema, webPageSchema, taskCollectionSchema, taskItemListSchema, faqSchema]} />
      <div className="home-pointer-glow" aria-hidden="true" />
      <section className="home-hero-shell">
        <div className="home-hero-liquid-layer" aria-hidden="true">
          <HomeParticlesBackground />
        </div>
        <div className="home-hero-liquid-overlay" aria-hidden="true" />
        <div className="home-hero-liquid-vignette" aria-hidden="true" />
        <Container className="home-hero-reference-frame">
          <div className="home-hero-stage">
            <div className="home-hero-centered">
              <h1 className="sr-only">{heroTitle}</h1>
              <ASCIIHeroTitle text={heroTitle} />
              <p className="home-hero-positioning">
                <HeroGradientSubtitle>{heroIntro}</HeroGradientSubtitle>
              </p>

              <div className="home-hero-actions">
                <BorderGlow
                  variant="button"
                  className="home-hero-primary-glow"
                  edgeSensitivity={34}
                  glowColor="190 80 72"
                  borderRadius={9}
                  glowRadius={24}
                  glowIntensity={0.55}
                  coneSpread={18}
                  colors={["#56bfd0", "#41c5db", "#20bbd6"]}
                  fillOpacity={0.18}
                >
                  <ButtonLink
                    href={buildLocalePath("/software", forceLocale)}
                    variant="ghost"
                    className="home-hero-cta"
                    data-analytics-event="home_tool_finder_cta_click"
                    data-analytics-meta-target="software"
                    data-analytics-meta-placement="home-hero"
                  >
                    {forceLocale === "en" ? "Find the right AI tool" : "选择适合AI的工具"}
                  </ButtonLink>
                </BorderGlow>
                <>
                  <Link
                    href={buildLocalePath("/product-paths/work-efficiency", forceLocale)}
                    className="home-hero-route-cta"
                    data-analytics-event="home_productivity_path_click"
                    data-analytics-meta-target="work-efficiency"
                    data-analytics-meta-placement="home-hero"
                  >
                    {forceLocale === "en" ? "Boost work efficiency" : "提升工作效率"}
                    <ArrowUpRight size={16} aria-hidden="true" />
                  </Link>
                  <Link
                    href={buildLocalePath("/product-paths/media-generation", forceLocale)}
                    className="home-hero-route-cta"
                    data-analytics-event="home_content_creation_path_click"
                    data-analytics-meta-target="media-generation"
                    data-analytics-meta-placement="home-hero"
                  >
                    {forceLocale === "en" ? "Create content with AI" : "内容生成创作"}
                    <ArrowUpRight size={16} aria-hidden="true" />
                  </Link>
                </>
                <Link
                  href={buildLocalePath("/skill-learning", forceLocale)}
                  className="home-hero-secondary-link"
                  data-analytics-event="home_practical_ai_learning_click"
                  data-analytics-meta-target="skill-learning"
                  data-analytics-meta-placement="home-hero"
                >
                  {forceLocale === "en" ? "Explore practical AI learning" : "查看 AI 实战学习路径"}
                  <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="home-task-outcomes-shell" aria-labelledby="home-task-outcomes-title">
        <Container className="home-hero-reference-frame">
          <div className="home-section-heading">
            <h2 id="home-task-outcomes-title">{conversionCopy.taskTitle}</h2>
            <p>{conversionCopy.taskIntro}</p>
          </div>
          <div className="home-task-outcome-grid">
            {homeTaskOutcomes[forceLocale].map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  href={buildLocalePath(item.href, forceLocale)}
                  className="home-task-outcome-link cursor-target"
                  data-analytics-event="home_task_outcome_click"
                  data-analytics-meta-target={item.id}
                  data-analytics-meta-placement="home-task-outcomes"
                >
                  <span className="home-task-outcome-media">
                    <Image
                      src={item.image}
                      alt={item.imageAlt}
                      fill
                      sizes="(max-width: 720px) 100vw, (max-width: 1100px) 50vw, 25vw"
                      className="home-task-outcome-image"
                    />
                  </span>
                  <span className="home-task-outcome-copy">
                    <span className="home-task-outcome-title-row">
                      <span className="home-task-outcome-icon" aria-hidden="true">
                        <Icon size={19} strokeWidth={1.8} />
                      </span>
                      <strong>{item.title}</strong>
                    </span>
                    <span className="home-task-outcome-description">{item.description}</span>
                    <span className="home-task-outcome-action">
                      {item.linkLabel}
                      <ArrowUpRight size={16} aria-hidden="true" />
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </Container>
      </section>

      {homeProductDemos.length ? (
        <section className="home-product-demo-shell" aria-label={forceLocale === "en" ? "Product demos" : "产品演示"}>
          <Container className="home-hero-reference-frame">
            <div className="home-product-preview home-product-demo-panel backdrop-blur-xl backdrop-saturate-150">
              <div className="home-product-preview-header">
                <p className="home-product-demo-intro">
                  {forceLocale === "en"
                    ? "Quickly understand the real-world effect of AI tools."
                    : "快速了解 AI 工具的真实使用效果"}
                </p>
                <Link href={buildLocalePath("/product-demos", forceLocale)} className="home-preview-link rounded-full border px-4 py-2 text-sm font-semibold">
                  {forceLocale === "en" ? "View all demos" : "查看全部"}
                  <ArrowUpRight size={15} aria-hidden="true" />
                </Link>
              </div>
              <div className="home-product-demo-grid">
                {homeProductDemos.map((demo) => (
                  <ProductDemoCard key={demo.id} demo={demo} locale={forceLocale} variant="home" />
                ))}
              </div>
            </div>
          </Container>
        </section>
      ) : null}

      <section
        className="home-decision-card-shell"
        aria-label={forceLocale === "en" ? "Choose an ENHE AI path" : "选择 ENHE AI 路径"}
      >
        <Container className="home-hero-reference-frame">
          <details className="home-seo-disclosure home-decision-disclosure">
            <summary id="home-decision-summary">{conversionCopy.finalTitle}</summary>
            <div className="home-decision-card" aria-labelledby="home-decision-summary">
              <div className="home-decision-card-section" aria-labelledby="home-trust-title">
                <div className="home-section-heading">
                  <p className="home-section-eyebrow">{conversionCopy.trustEyebrow}</p>
                  <h2 id="home-trust-title">{conversionCopy.trustTitle}</h2>
                  <p>{conversionCopy.trustIntro}</p>
                </div>
                <ul className="home-trust-list">
                  {homeTrustSignals[forceLocale].map((item) => {
                    const Icon = item.icon;
                    const href = item.rawHref ? item.href : buildLocalePath(item.href, forceLocale);
                    return (
                      <li key={item.title}>
                        <Link href={href} className="home-trust-link">
                          <span className="home-trust-icon" aria-hidden="true">
                            <Icon size={20} strokeWidth={1.8} />
                          </span>
                          <span className="home-trust-copy">
                            <strong>{item.title}</strong>
                            <span>{item.description}</span>
                          </span>
                          <ArrowUpRight size={17} aria-hidden="true" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="home-decision-card-section" aria-labelledby="home-workflow-title">
                <div className="home-section-heading">
                  <p className="home-section-eyebrow">{conversionCopy.workflowEyebrow}</p>
                  <h2 id="home-workflow-title">{conversionCopy.workflowTitle}</h2>
                  <p>{conversionCopy.workflowIntro}</p>
                </div>
                <ol className="home-workflow-list">
                  {homeWorkflowSteps[forceLocale].map((step, index) => (
                    <li key={step.title}>
                      <span className="home-workflow-number" aria-hidden="true">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <h3>{step.title}</h3>
                        <p>{step.description}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="home-decision-card-section">
                <div className="home-final-cta-band">
                  <p>{conversionCopy.finalIntro}</p>
                  <div className="home-final-cta-actions">
                    <ButtonLink
                      href={buildLocalePath("/software", forceLocale)}
                      className="home-final-cta-primary"
                      data-analytics-event="home_tool_finder_cta_click"
                      data-analytics-meta-target="software"
                      data-analytics-meta-placement="home-final-cta"
                    >
                      {forceLocale === "en" ? "Find the right AI tool" : "选择适合AI的工具"}
                    </ButtonLink>
                    <Link
                      href={buildLocalePath("/skill-learning", forceLocale)}
                      className="home-final-cta-secondary"
                      data-analytics-event="home_practical_ai_learning_click"
                      data-analytics-meta-target="skill-learning"
                      data-analytics-meta-placement="home-final-cta"
                    >
                      <BookOpenCheck size={17} strokeWidth={1.8} aria-hidden="true" />
                      {forceLocale === "en" ? "Explore practical AI learning" : "查看 AI 实战学习路径"}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </details>
        </Container>
      </section>

      <section className="home-support-shell" aria-label={forceLocale === "en" ? "Supporting ENHE AI paths" : "ENHE AI 支撑路径"}>
        <Container className="home-hero-reference-frame">
          <details className="home-seo-disclosure">
            <summary>{forceLocale === "en" ? "More paths for research, tutorials, and project practice" : "查看更多资讯、教程和项目练习路径"}</summary>
            <div className="home-support-link-grid">
              {homeSupportLinks[forceLocale].map((item) => (
                <Link key={item.href} href={buildLocalePath(item.href, forceLocale)} className="home-support-link">
                  {item.label}
                  <ArrowUpRight size={15} aria-hidden="true" />
                </Link>
              ))}
            </div>
            <div
              className="home-topic-growth-grid"
              aria-label={forceLocale === "en" ? "AI topic growth paths" : "AI 主题增长路径"}
            >
              {homeTopicGrowthLinks[forceLocale].map((item) => (
                <Link key={item.href} href={buildLocalePath(item.href, forceLocale)} className="home-topic-growth-link">
                  <strong>{item.title}</strong>
                  <span>{item.description}</span>
                </Link>
              ))}
            </div>
          </details>
        </Container>
      </section>

    </main>
  );
}
