import type { Metadata } from "next";
import Link from "next/link";
import { BuildYourOwnXNavigator } from "@/components/build-your-own-x-navigator";
import { StructuredData } from "@/components/structured-data";
import { Container } from "@/components/ui";
import type { Locale } from "@/lib/dictionaries";
import {
  buildYourOwnXCategories,
  buildYourOwnXJsonLd,
  buildYourOwnXProjects,
  buildYourOwnXRoutes,
  buildYourOwnXSource,
  getBuildYourOwnXStats,
  getBuildYourOwnXTopLanguages,
} from "@/lib/build-your-own-x";
import {
  absoluteUrl,
  buildBreadcrumbSchema,
  buildFaqSchema,
  buildLocalePath,
  buildMetadataTitle,
  buildPageMetadata,
} from "@/lib/seo";

const pageText = {
  zh: {
    title: "Build Your Own X 项目导航器",
    metaTitle: "Build Your Own X 项目导航器",
    description:
      "免费开发者项目导航工具，按目标、语言、难度、时间和路线筛选从零实现类开源教程，生成可复制的 AI 学习计划 Prompt，帮助学习者把收藏的项目链接变成可执行的练习路线。",
    eyebrow: "免费开发者工具",
    heroTitle: "把 300+ 个硬核教程，变成今天就能开始的项目路线。",
    heroIntro:
      "少一点收藏夹焦虑，多一点可交付的进度。先选目标、时间和技术栈，再找到适合动手的 Build Your Own X 项目，用 AI 把它拆成 7 天或 14 天计划。",
    start: "开始筛选项目",
    quickStart: "按目标快速开始",
    source: "查看开源仓库",
    stats: {
      projects: "项目链接",
      categories: "技术分类",
      languages: "语言筛选",
      routes: "推荐路线",
    },
    answerTitle: "这个免费工具能解决什么问题？",
    answer:
      "Build Your Own X 项目导航器会把 codecrafters-io/build-your-own-x 仓库里的公开教程链接整理成可筛选索引。你可以按学习目标、编程语言、难度、时间预算和项目路线缩小范围，再复制一段 AI Prompt，让 AI 帮你生成个人项目计划。本站只做导航和学习规划，不复制第三方教程正文，也不向用户收费。",
    languageTitle: "热门语言入口",
    audienceTitle: "适合哪些人使用？",
    outcomesTitle: "你最终应该带走什么？",
    routeTitle: "先选路线，再选项目",
    routeIntro:
      "路线不是课程，而是减少选择成本的入口。每条路线都对应一组更适合连续学习的项目类型。",
    extractableTitle: "常见学习场景的直接答案",
    routeSeoTitle: "5 条项目路线怎么选",
    faqTitle: "常见问题",
    sourceTitle: "来源和合规说明",
    sourceIntro:
      "本页索引来自公开 GitHub 仓库，只保留项目标题、分类、语言、链接和本站原创的筛选标签。具体教程内容、授权和更新以原始链接为准。",
    relatedTitle: "下一步可以继续看",
    related: [
      { href: "/skill-learning", label: "AI 技能学习" },
      { href: "/tutorials", label: "实用教程" },
      { href: "/ai-news", label: "AI 前沿资讯" },
      { href: "/software", label: "AI 软件应用" },
    ],
  },
  en: {
    title: "Build Your Own X Navigator",
    metaTitle: "Build Your Own X Navigator",
    description:
      "A free navigator filtering Build Your Own X tutorials by goal, language, difficulty, time, and route, then creating an AI learning-plan prompt.",
    eyebrow: "Free developer tool",
    heroTitle: "Turn 300+ hard-core tutorials into a project route you can start today.",
    heroIntro:
      "Less bookmark anxiety, more visible progress. Choose your goal, time budget, and stack first, then use AI to turn the right Build Your Own X projects into a 7-day or 14-day plan.",
    start: "Start filtering",
    quickStart: "Quick start by goal",
    source: "View source repository",
    stats: {
      projects: "Project links",
      categories: "Tech categories",
      languages: "Language filters",
      routes: "Curated routes",
    },
    answerTitle: "What does this free tool solve?",
    answer:
      "Build Your Own X Navigator turns the public codecrafters-io/build-your-own-x repository into a searchable project index. You can filter by learning goal, programming language, difficulty, time budget, and route, then copy an AI prompt for a personal project plan. ENHE AI indexes links and adds original planning metadata. It does not republish third-party tutorial bodies or charge users.",
    languageTitle: "Popular language entry points",
    audienceTitle: "Who is this for?",
    outcomesTitle: "What should you leave with?",
    routeTitle: "Choose a route before choosing a project",
    routeIntro:
      "Routes are not courses. They reduce choice cost by grouping project types that work well as a continuous learning path.",
    extractableTitle: "Direct answers for common learning scenarios",
    routeSeoTitle: "How to choose the 5 project routes",
    faqTitle: "FAQ",
    sourceTitle: "Source and compliance note",
    sourceIntro:
      "This page indexes public GitHub links and stores only titles, categories, languages, URLs, and ENHE AI planning labels. Tutorial content, licenses, and updates remain with the original source links.",
    relatedTitle: "Useful next pages",
    related: [
      { href: "/skill-learning", label: "AI skill learning" },
      { href: "/tutorials", label: "Tutorials" },
      { href: "/ai-news", label: "AI news" },
      { href: "/software", label: "AI software" },
    ],
  },
} as const;

const quickStartCards = {
  zh: [
    {
      title: "新手入门",
      description: "从 Shell、Web Server、数据库这类可解释项目开始，先建立工程直觉。",
      href: "#route-computer-systems",
    },
    {
      title: "面试准备",
      description: "围绕后端、系统设计和 CS 基础，把项目做成可以讲清楚的技术经历。",
      href: "#route-backend-systems",
    },
    {
      title: "作品集项目",
      description: "选择有清晰产出的项目，让简历和个人网站不只停留在教程跟做。",
      href: "#navigator",
    },
    {
      title: "AI 工程",
      description: "从模型、RAG、搜索和 Bot 切入，把 AI 能力落到真实工程实现里。",
      href: "#route-ai-engineering",
    },
  ],
  en: [
    {
      title: "Beginner",
      description: "Start with Shell, Web Server, and Database projects to build engineering intuition.",
      href: "#route-computer-systems",
    },
    {
      title: "Interview prep",
      description: "Turn backend, system design, and CS fundamentals into stories you can explain.",
      href: "#route-backend-systems",
    },
    {
      title: "Portfolio",
      description: "Pick projects with visible outcomes so your resume is more than followed tutorials.",
      href: "#navigator",
    },
    {
      title: "AI engineering",
      description: "Use models, RAG, search, and bots to connect AI knowledge with real implementation.",
      href: "#route-ai-engineering",
    },
  ],
} as const;

const popularLanguageLinks = ["Python", "JavaScript", "C++", "Rust", "Go", "TypeScript"] as const;

const audienceItems = {
  zh: [
    "想补齐计算机基础，但不想只看书的开发者。",
    "准备后端、系统设计、前端原理或 AI 工程面试的人。",
    "需要作品集项目、开源练手项目和简历素材的学生或转型开发者。",
  ],
  en: [
    "Developers who want stronger CS fundamentals without only reading books.",
    "People preparing for backend, system design, frontend internals, or AI engineering interviews.",
    "Students and career switchers who need portfolio projects, open-source practice, and resume material.",
  ],
} as const;

const outcomeItems = {
  zh: [
    "一组适合当前阶段的候选项目。",
    "一份可复制到 ChatGPT、Claude、Gemini、DeepSeek 或 LumiOS 的学习计划 Prompt。",
    "可拆解为 7 天或 14 天任务的项目路线，以及最终可展示的作品集产出。",
  ],
  en: [
    "A shortlist of projects that match your current stage.",
    "A prompt you can paste into ChatGPT, Claude, Gemini, DeepSeek, or LumiOS.",
    "A 7-day or 14-day project route with a final portfolio outcome.",
  ],
} as const;

const answerBlocks = {
  zh: [
    {
      question: "适合新手的 Build Your Own X 项目有哪些？",
      answer:
        "新手更适合从 Shell、Web Server、数据库、命令行工具和模板引擎开始。这些项目反馈明确，范围可控，能帮助你理解输入输出、协议、状态、存储和错误处理，比一开始挑战编译器或操作系统更容易坚持。",
    },
    {
      question: "适合后端作品集的项目有哪些？",
      answer:
        "适合后端作品集的项目通常是 Web Server、Database、Cache、Docker、Git 和 Distributed Systems。它们能展示网络协议、数据建模、并发、可靠性和部署思路，也更容易在简历和面试中讲出取舍。",
    },
    {
      question: "如何用 Build Your Own X 准备技术面试？",
      answer:
        "先按岗位选择路线，再选 2 到 3 个能讲清楚原理的项目。每个项目都要沉淀四件事：为什么做、核心设计、遇到的问题、最终产出。最后用 AI Prompt 生成 7 天或 14 天复盘计划。",
    },
    {
      question: "如何把 GitHub 教程变成 7 天或 14 天计划？",
      answer:
        "先确定目标、语言和时间预算，再用本页筛选候选项目。复制 AI 学习计划 Prompt 后，让 AI 拆分每日任务、验收标准、关键概念、简历描述和面试讲解，这样教程链接会变成可执行路线。",
    },
  ],
  en: [
    {
      question: "Which Build Your Own X projects are good for beginners?",
      answer:
        "Beginners should start with Shell, Web Server, Database, Command-Line Tool, and Template Engine projects. They have clearer feedback loops and manageable scope, helping you learn input, output, protocols, state, storage, and error handling.",
    },
    {
      question: "Which projects are good backend portfolio pieces?",
      answer:
        "Strong backend portfolio projects usually include Web Server, Database, Cache, Docker, Git, and Distributed Systems. They demonstrate protocols, data modeling, concurrency, reliability, deployment thinking, and tradeoff awareness.",
    },
    {
      question: "How can I use Build Your Own X for technical interviews?",
      answer:
        "Choose a route based on the role, then finish 2 or 3 projects you can explain deeply. For each project, document why you built it, the core design, the problems you solved, and the final output. Then use the AI prompt for a 7-day or 14-day review plan.",
    },
    {
      question: "How do I turn GitHub tutorials into a 7-day or 14-day plan?",
      answer:
        "Define your goal, language, and time budget first, then filter candidate projects on this page. Copy the AI learning-plan prompt and ask your assistant to create daily tasks, acceptance criteria, key concepts, resume wording, and interview explanations.",
    },
  ],
} as const;

const faqItems = {
  zh: [
    {
      question: "Build Your Own X 项目导航器是免费的吗？",
      answer:
        "是。这个工具完全免费，不需要登录、订阅或付费。它的目标是帮助开发者更快找到适合自己的开源项目教程，同时为 ENHE AI 带来自然搜索流量。",
    },
    {
      question: "它和原始 GitHub 仓库是什么关系？",
      answer:
        "本页基于 codecrafters-io/build-your-own-x 的公开链接做导航索引，并保留原始教程链接。本站不复制教程正文，具体内容和授权以原仓库及教程来源为准。",
    },
    {
      question: "我应该怎么选择第一个项目？",
      answer:
        "先选学习目标，再选熟悉的语言和可投入时间。如果是补基础，优先选 Shell、数据库、Web Server 或解释器；如果是作品集，优先选能展示完整交付结果的项目。",
    },
    {
      question: "AI Prompt 生成器有什么用？",
      answer:
        "它会把你的筛选条件和候选项目整理成一段提示词。复制到常用 AI 助手后，可以生成个人学习计划、每日任务、简历描述和面试讲解思路。",
    },
  ],
  en: [
    {
      question: "Is Build Your Own X Navigator free?",
      answer:
        "Yes. It is free, does not require login, and does not sell a subscription. The goal is to help developers find suitable open-source project tutorials while bringing organic traffic to ENHE AI.",
    },
    {
      question: "How is it related to the original GitHub repository?",
      answer:
        "This page indexes public links from codecrafters-io/build-your-own-x and keeps users going to original tutorials. ENHE AI does not copy tutorial bodies. Content and licenses remain with each original source.",
    },
    {
      question: "How should I choose my first project?",
      answer:
        "Start with your learning goal, then choose a familiar language and realistic time budget. For fundamentals, start with Shell, Database, Web Server, or Interpreter. For portfolio work, choose projects with a clear final deliverable.",
    },
    {
      question: "What is the AI prompt generator for?",
      answer:
        "It converts your filters and candidate projects into a prompt you can paste into an AI assistant to get a personal learning plan, daily tasks, resume bullet, and interview explanation.",
    },
  ],
} as const;

export async function generateBuildYourOwnXPageMetadata(
  forceLocale: Locale,
): Promise<Metadata> {
  const text = pageText[forceLocale];
  return buildPageMetadata({
    title: buildMetadataTitle({
      pageTitle: text.metaTitle,
    }),
    description: text.description,
    path: "/build-your-own-x",
    locale: forceLocale === "en" ? "en_US" : "zh_CN",
    localeKey: forceLocale,
  });
}

export function BuildYourOwnXPageShell({ forceLocale }: { forceLocale: Locale }) {
  const text = pageText[forceLocale];
  const stats = getBuildYourOwnXStats();
  const jsonLd = buildYourOwnXJsonLd();
  const breadcrumbSchema = buildBreadcrumbSchema({
    items: [
      { name: forceLocale === "en" ? "Home" : "首页", path: buildLocalePath("/", forceLocale) },
      { name: text.title, path: buildLocalePath("/build-your-own-x", forceLocale) },
    ],
  });
  const faqSchema = buildFaqSchema({ items: [...answerBlocks[forceLocale], ...faqItems[forceLocale]] });
  const routeListSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: text.title,
    description: text.description,
    url: absoluteUrl(buildLocalePath("/build-your-own-x", forceLocale)),
    inLanguage: forceLocale === "en" ? "en-US" : "zh-CN",
    isAccessibleForFree: true,
    about: [
      "Build Your Own X",
      "developer projects",
      "computer science projects",
      "AI learning plan",
      "open source tutorials",
    ],
    citation: {
      "@type": "CreativeWork",
      name: buildYourOwnXSource.repository,
      url: buildYourOwnXSource.url,
    },
  };

  const statItems = [
    { value: stats.projectCount, label: text.stats.projects },
    { value: stats.categoryCount, label: text.stats.categories },
    { value: stats.languageCount, label: text.stats.languages },
    { value: stats.routeCount, label: text.stats.routes },
  ];

  const topLanguages = getBuildYourOwnXTopLanguages();

  return (
    <main className="enhe-editorial-page byox-page">
      <StructuredData data={[breadcrumbSchema, jsonLd.webApplication, jsonLd.itemList, routeListSchema, faqSchema]} />
      <Container className="byox-container">
        <section className="byox-hero">
          <div className="byox-hero-copy">
            <p className="byox-eyebrow">{text.eyebrow}</p>
            <h1>{text.heroTitle}</h1>
            <p>{text.heroIntro}</p>
            <div className="byox-hero-actions">
              <a href="#navigator" className="byox-primary-link">
                {text.start}
              </a>
              <a href={buildYourOwnXSource.url} target="_blank" rel="noreferrer" className="byox-secondary-link">
                {text.source}
              </a>
            </div>
          </div>
          <div className="byox-stat-grid" aria-label={forceLocale === "en" ? "Navigator stats" : "导航器数据"}>
            {statItems.map((item) => (
              <div key={item.label} className="byox-stat-card">
                <strong>{item.value}+</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="byox-quick-panel surface-panel">
          <div className="byox-quick-head">
            <h2>{text.quickStart}</h2>
            <div className="byox-language-chips" aria-label={text.languageTitle}>
              {popularLanguageLinks.map((language) => {
                const count = topLanguages.find((item) => item.name === language)?.count;
                return (
                  <a key={language} href="#navigator">
                    {language}
                    {count ? <span>{count}</span> : null}
                  </a>
                );
              })}
            </div>
          </div>
          <div className="byox-quick-grid">
            {quickStartCards[forceLocale].map((card) => (
              <a key={card.title} href={card.href} className="byox-quick-card">
                <strong>{card.title}</strong>
                <span>{card.description}</span>
              </a>
            ))}
          </div>
        </section>

        <section className="byox-answer surface-panel">
          <h2>{text.answerTitle}</h2>
          <p>{text.answer}</p>
        </section>

        <ContentFold title={text.audienceTitle} className="byox-fit-fold">
          <section className="byox-fit-grid">
            <article className="surface-panel-soft">
              <h2>{text.audienceTitle}</h2>
              <ul>
                {audienceItems[forceLocale].map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
            <article className="surface-panel-soft">
              <h2>{text.outcomesTitle}</h2>
              <ul>
                {outcomeItems[forceLocale].map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          </section>
        </ContentFold>

        <BuildYourOwnXNavigator
          locale={forceLocale}
          projects={buildYourOwnXProjects}
          routes={buildYourOwnXRoutes}
          categories={buildYourOwnXCategories}
          languages={topLanguages}
        />

        <ContentFold title={text.extractableTitle} className="byox-answer-blocks">
          <div className="byox-answer-grid">
            {answerBlocks[forceLocale].map((item) => (
              <article key={item.question} className="surface-panel-soft">
                <h3>{item.question}</h3>
                <p>{item.answer}</p>
              </article>
            ))}
          </div>
        </ContentFold>

        <ContentFold
          title={text.routeTitle}
          intro={text.routeIntro}
          className="byox-route-section"
        >
          <div className="byox-route-grid">
            {buildYourOwnXRoutes.map((route) => (
              <article key={route.slug} className="byox-route-card">
                <h3>{forceLocale === "en" ? route.titleEn : route.title}</h3>
                <p>{forceLocale === "en" ? route.summaryEn : route.summary}</p>
                <a href={`#route-${route.slug}`}>
                  {forceLocale === "en" ? "Use this route" : "使用这条路线"}
                </a>
              </article>
            ))}
          </div>
        </ContentFold>

        <ContentFold title={text.routeSeoTitle} className="byox-route-seo">
          <div className="byox-route-seo-list">
            {buildYourOwnXRoutes.map((route) => (
              <article key={route.slug} id={`learn-${route.slug}`}>
                <h3>{forceLocale === "en" ? route.titleEn : route.title}</h3>
                <p>{forceLocale === "en" ? route.summaryEn : route.summary}</p>
                <p>{forceLocale === "en" ? route.outcomeEn : route.outcome}</p>
              </article>
            ))}
          </div>
        </ContentFold>

        <section className="byox-support-grid">
          <ContentFold title={text.faqTitle} className="byox-support-card">
            <div className="byox-faq-list">
              {faqItems[forceLocale].map((item) => (
                <article key={item.question}>
                  <h3>{item.question}</h3>
                  <p>{item.answer}</p>
                </article>
              ))}
            </div>
          </ContentFold>
          <aside className="byox-support-card surface-panel-soft">
            <h2>{text.sourceTitle}</h2>
            <p>{text.sourceIntro}</p>
            <dl className="byox-source-list">
              <div>
                <dt>Repository</dt>
                <dd>
                  <a href={buildYourOwnXSource.url} target="_blank" rel="noreferrer">
                    {buildYourOwnXSource.repository}
                  </a>
                </dd>
              </div>
              <div>
                <dt>Snapshot</dt>
                <dd>{buildYourOwnXSource.snapshotDate}</dd>
              </div>
              <div>
                <dt>Scope</dt>
                <dd>{buildYourOwnXSource.licenseNote}</dd>
              </div>
            </dl>
            <h3>{text.relatedTitle}</h3>
            <div className="byox-related-links">
              {text.related.map((item) => (
                <Link key={item.href} href={buildLocalePath(item.href, forceLocale)}>
                  {item.label}
                </Link>
              ))}
            </div>
          </aside>
        </section>
      </Container>
    </main>
  );
}

function ContentFold({
  title,
  intro,
  className,
  children,
}: React.PropsWithChildren<{
  title: string;
  intro?: string;
  className?: string;
}>) {
  return (
    <details className={`content-fold ${className ?? ""}`}>
      <summary>
        <div className="content-fold-summary-copy">
          <h2>{title}</h2>
          {intro ? <p>{intro}</p> : null}
        </div>
      </summary>
      <div className="content-fold-body">{children}</div>
    </details>
  );
}
