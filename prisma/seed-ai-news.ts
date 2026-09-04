import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const categorySeeds = [
  ["AI快讯", "ai-news-flash", "快速了解 AI 工具、模型和平台的新变化。", 10],
  ["模型动态", "model-updates", "跟踪主流模型、智能体和推理能力更新。", 20],
  ["工具推荐", "tool-recommendations", "把 AI 新闻连接到可落地的工具选择。", 30],
  ["实战教程", "practical-tutorials", "围绕真实场景整理 AI 使用方法。", 40],
  ["趋势解读", "trend-insights", "从行业变化中提炼对个人和团队有用的判断。", 50],
  ["AI变现", "ai-monetization", "关注 AI 能力如何转化为业务、内容和服务机会。", 60]
] as const;

const tagSeeds = ["AI资讯", "趋势解读", "工具落地", "ENHE AI"];

function tagSlug(name: string) {
  const ascii = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return ascii || encodeURIComponent(name.trim()).replace(/%/g, "").toLowerCase();
}

async function main() {
  const categories = await Promise.all(
    categorySeeds.map(([name, slug, description, sortOrder]) =>
      prisma.newsCategory.upsert({
        where: { slug },
        update: { name, description, sortOrder, status: "active" },
        create: { name, slug, description, sortOrder, status: "active" }
      })
    )
  );
  const trendCategory = categories.find((category) => category.slug === "trend-insights") ?? categories[0];
  const tags = await Promise.all(
    tagSeeds.map((name) =>
      prisma.newsTag.upsert({
        where: { name },
        update: { status: "active" },
        create: { name, slug: tagSlug(name), status: "active" }
      })
    )
  );

  const starterNews = await prisma.newsArticle.upsert({
    where: { slug: "ai-news-trend-insights-launch" },
    update: {
      categoryId: trendCategory.id,
      status: "published",
      publishedAt: new Date("2026-06-18T08:00:00.000Z"),
      isFeatured: true,
      isPinned: true
    },
    create: {
      title: "AI资讯与趋势洞察上线：从信息看到行动",
      slug: "ai-news-trend-insights-launch",
      subtitle: "不只是看见 AI 变化，更要知道它能帮你做什么。",
      description: "恩禾 ENHE AI 工具站新增 AI 资讯与趋势洞察模块，帮助用户理解 AI 信息、判断趋势，并自然连接到站内工具和教程。",
      keywords: "AI资讯,AI趋势,AI工具,AI教程,ENHE AI",
      summary: "AI 信息每天都在更新，但真正有价值的不是追热点，而是把变化翻译成可执行的下一步。ENHE AI 资讯模块会围绕 AI 资讯、趋势解读、工具落地和站内引导组织内容，让你更快判断一条信息是否值得关注，以及可以如何用到工作、创作和学习中。",
      content: [
        "## 发生了什么？",
        "ENHE AI Tools 新增了 AI 资讯与趋势洞察页面。它不会只做新闻列表，而是把每条 AI 信息拆成背景、影响、使用场景和站内延伸内容。",
        "## 为什么重要？",
        "AI 工具和模型更新越来越快，普通用户最容易遇到的问题不是信息太少，而是不知道哪些变化与自己有关。资讯页面会把复杂变化转成更容易理解的行动线索。",
        "### 对普通用户有什么用？",
        "- 更快知道一条 AI 新闻是否值得投入时间",
        "- 从趋势中找到适合自己的工具和教程",
        "- 减少重复搜索，把注意力留给实际使用",
        "## 可以怎么用起来？",
        "你可以从 AI 资讯页浏览最新动态，也可以通过分类、标签和搜索找到与 AI 办公、AI 绘图、AI 视频、本地部署或 AI 变现相关的内容。",
        "> 建议把资讯当作决策入口，而不是信息流。看完后问自己：这件事能不能让我少做重复工作，或者更快完成一个成果？",
        "## 有哪些相关工具或教程？",
        "每篇资讯会尽量连接站内相关工具、教程或课程，让阅读自然延伸到实际操作。",
        "## 总结：下一步该如何行动？",
        "如果你正在关注 AI，但不想被碎片信息牵着走，可以从 AI 资讯页开始，把每一次阅读都变成一次更清晰的工具选择和行动判断。"
      ].join("\n\n"),
      author: "ENHE AI",
      status: "published",
      categoryId: trendCategory.id,
      publishedAt: new Date("2026-06-18T08:00:00.000Z"),
      readingTime: 5,
      isFeatured: true,
      isPinned: true,
      sortOrder: 10,
      seoTitle: "AI资讯与趋势洞察上线 | 恩禾 ENHE AI工具站",
      seoDescription: "ENHE AI Tools 新增 AI 资讯与趋势洞察模块，围绕 AI资讯、趋势解读、工具落地和站内引导，帮助用户从信息看到行动。",
      seoKeywords: "AI资讯,AI趋势,AI工具落地,AI教程,ENHE AI",
      keyTakeaways: [
        "AI资讯页不是单纯新闻列表，而是把信息转成行动建议。",
        "内容会围绕趋势解读、工具落地和站内延伸来组织。",
        "用户可以通过分类、标签和搜索找到适合自己的 AI 内容。",
        "每篇文章会尽量连接相关工具、教程或课程。"
      ],
      impactNotes: "对创作者来说，它能帮助你更快把热点转成选题和脚本。对电商与运营用户来说，它能帮助你判断哪些 AI 工具适合提高素材、文案和客服效率。对职场用户来说，它能减少重复搜索，把更多时间留给实际执行。",
      conclusion: "AI 的价值不在于知道更多名词，而在于更快完成真实任务。ENHE AI 资讯模块会持续把重要变化翻译成可理解、可落地、可继续探索的内容。",
      englishTitle: "AI News and Trend Insights: From Information to Action",
      englishSubtitle: "A practical AI news hub that explains what each update means and where to go next.",
      englishDescription: "ENHE AI Tools adds an AI news and trend insights module that connects AI updates with practical tools, tutorials, and next steps.",
      englishSummary: "AI updates arrive every day, but the real value is not chasing headlines. The new ENHE AI news module turns important AI information into context, practical meaning, tool guidance, and next-step reading paths so users can decide what matters and how to apply it.",
      englishContent: [
        "## What happened?",
        "ENHE AI Tools has added a dedicated AI news and trend insights page. It is designed as more than a news feed. Each article can explain the background, the practical impact, and the relevant tools or tutorials inside the ENHE site.",
        "## Why does it matter?",
        "AI models, agents, creative tools, and automation workflows are changing quickly. Many users do not need more noise. They need a clearer way to understand whether an update is useful for work, creation, learning, or small business operations.",
        "### What does this mean for everyday users?",
        "- Spend less time filtering fragmented AI information",
        "- Find tools and tutorials connected to real tasks",
        "- Turn one AI update into a practical next step",
        "## How can you use it?",
        "You can start from the AI News page, browse categories, use tags, or search topics such as AI office work, AI image generation, AI video, local deployment, and AI monetization.",
        "> Treat each article as a decision entry point. After reading, ask whether this update can reduce repetitive work or help you produce a visible result faster.",
        "## Related tools and tutorials",
        "Future articles will connect news items with relevant ENHE tools, tutorials, courses, and related reading so the reading path naturally moves toward action.",
        "## Summary",
        "The value of AI is not memorizing more buzzwords. It is learning how to use new capabilities to finish real tasks. ENHE AI News will keep translating important changes into practical, readable, and actionable insights."
      ].join("\n\n"),
      englishKeywords: "AI news,AI trends,AI tools,AI tutorials,ENHE AI",
      englishSeoTitle: "AI News and Trend Insights | ENHE AI Tools",
      englishSeoDescription: "ENHE AI Tools launches an AI news and trend insights module that connects AI updates with practical tools, tutorials, and clear next steps.",
      englishSeoKeywords: "AI news,AI trend insights,AI tools,AI tutorials",
      englishKeyTakeaways: [
        "The AI news page is built to turn information into practical decisions.",
        "Each article can connect trends with tools, tutorials, and site guidance.",
        "Users can browse by category, tag, and search intent.",
        "The goal is to reduce noise and make AI adoption easier."
      ],
      englishImpactNotes: "For creators, this helps turn AI developments into topics, scripts, and workflows. For operators and sellers, it helps evaluate tools for images, product copy, and customer support. For professionals, it helps reduce repeated searching and focus on execution.",
      englishConclusion: "AI becomes useful when it helps people finish real work. ENHE AI News is designed to make important changes easier to understand and easier to apply."
    }
  });

  await prisma.newsArticleTag.deleteMany({ where: { articleId: starterNews.id } });
  await Promise.all(tags.map((tag) => prisma.newsArticleTag.create({ data: { articleId: starterNews.id, tagId: tag.id } })));

  console.log(`AI news seed completed: ${starterNews.slug}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
