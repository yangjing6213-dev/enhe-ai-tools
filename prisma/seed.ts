import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required when seeding.`);
  return value;
}

const superAdminPasswordHash = requiredEnv("SUPER_ADMIN_PASSWORD_HASH");

async function main() {
  const adminPassword = await bcrypt.hash(requiredEnv("ADMIN_SEED_PASSWORD"), 12);
  const userPassword = await bcrypt.hash(requiredEnv("USER_SEED_PASSWORD"), 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@enhe.ai" },
    update: {},
    create: {
      email: "admin@enhe.ai",
      passwordHash: adminPassword,
      nickname: "恩禾管理员",
      role: "admin"
    }
  });

  await prisma.user.upsert({
    where: { email: "Sadmin" },
    update: {
      passwordHash: superAdminPasswordHash,
      nickname: "Sadmin",
      role: "admin",
      status: "active"
    },
    create: {
      email: "Sadmin",
      passwordHash: superAdminPasswordHash,
      nickname: "Sadmin",
      role: "admin",
      status: "active"
    }
  });

  await prisma.user.upsert({
    where: { email: "user@enhe.ai" },
    update: {},
    create: {
      email: "user@enhe.ai",
      passwordHash: userPassword,
      nickname: "演示用户"
    }
  });

  const plans = [
    ["7天VIP", 7, "19.00", "29.00", false, 10],
    ["1个月VIP", 30, "49.00", "69.00", false, 20],
    ["6个月VIP", 180, "199.00", "299.00", true, 30],
    ["12个月VIP", 365, "299.00", "499.00", false, 40],
    ["永久VIP", 0, "699.00", "999.00", false, 50]
  ] as const;

  for (const [name, durationDays, price, originalPrice, isRecommended, sortOrder] of plans) {
    await prisma.vipPlan.upsert({
      where: { id: name },
      update: {},
      create: {
        id: name,
        name,
        durationDays,
        price,
        originalPrice,
        isRecommended,
        sortOrder,
        description: "开通后可下载会员本地应用并使用云端工具。"
      }
    });
  }

  const softwareCategoryData = {
    name: "自动化软件",
    type: "software" as const,
    description: "批量处理、桌面自动化、效率增强工具。",
    sortOrder: 10
  };
  const existingSoftwareCategory = await prisma.toolCategory.findFirst({
    where: { name: softwareCategoryData.name, type: softwareCategoryData.type }
  });
  const softwareCategory = existingSoftwareCategory
    ? await prisma.toolCategory.update({ where: { id: existingSoftwareCategory.id }, data: softwareCategoryData })
    : await prisma.toolCategory.create({ data: softwareCategoryData });

  const onlineCategoryData = {
    name: "在线处理",
    type: "online" as const,
    description: "浏览器内即可使用的轻量网页工具。",
    sortOrder: 10
  };
  const existingOnlineCategory = await prisma.toolCategory.findFirst({
    where: { name: onlineCategoryData.name, type: onlineCategoryData.type }
  });
  const onlineCategory = existingOnlineCategory
    ? await prisma.toolCategory.update({ where: { id: existingOnlineCategory.id }, data: onlineCategoryData })
    : await prisma.toolCategory.create({ data: onlineCategoryData });

  const softwareToolData = {
    name: "ENHE 批量文件重命名助手",
    slug: "enhe-batch-renamer",
    type: "software" as const,
    categoryId: softwareCategory.id,
    shortDescription: "一键批量重命名文件，支持规则模板与预览。",
    content: "面向资料整理、素材归档、项目交付场景的 Windows 桌面工具。",
    coverImage: "/images/products/enhe-visuals/enhe-batch-renamer/cover.png",
    screenshots: [
      "/images/products/enhe-visuals/enhe-batch-renamer/detail-01-benefit.png",
      "/images/products/enhe-visuals/enhe-batch-renamer/detail-02-mechanism.png",
      "/images/products/enhe-visuals/enhe-batch-renamer/detail-03-scenario.png",
      "/images/products/enhe-visuals/enhe-batch-renamer/detail-04-included.png",
      "/images/products/enhe-visuals/enhe-batch-renamer/detail-05-specs.png"
    ],
    version: "1.0.0",
    systemRequirement: "Windows 10/11",
    isVipRequired: true,
    isDownloadPaid: true,
    downloadPrice: "29.00",
    status: "published" as const,
    sortOrder: 10
  };
  await prisma.tool.upsert({
    where: { slug: softwareToolData.slug },
    update: softwareToolData,
    create: {
      ...softwareToolData,
      tutorials: {
        create: {
          title: "三步完成批量重命名",
          content: "选择目录，配置命名规则，预览无误后执行。",
          sortOrder: 10
        }
      }
    }
  });

  const onlineToolData = {
    name: "ENHE 文案清洗在线工具",
    slug: "enhe-copy-cleaner",
    type: "online" as const,
    categoryId: onlineCategory.id,
    shortDescription: "清理多余空格、换行和特殊符号，适合内容整理。",
    content: "把杂乱文本整理为适合发布、归档或二次处理的标准格式。",
    coverImage: "/images/products/enhe-visuals/enhe-copy-cleaner/cover.png",
    screenshots: [
      "/images/products/enhe-visuals/enhe-copy-cleaner/detail-01-benefit.png",
      "/images/products/enhe-visuals/enhe-copy-cleaner/detail-02-mechanism.png",
      "/images/products/enhe-visuals/enhe-copy-cleaner/detail-03-scenario.png",
      "/images/products/enhe-visuals/enhe-copy-cleaner/detail-04-included.png",
      "/images/products/enhe-visuals/enhe-copy-cleaner/detail-05-specs.png"
    ],
    onlineUrl: "https://example.com/tools/copy-cleaner",
    isVipRequired: true,
    status: "published" as const,
    sortOrder: 20
  };
  await prisma.tool.upsert({
    where: { slug: onlineToolData.slug },
    update: onlineToolData,
    create: {
      ...onlineToolData,
      tutorials: {
        create: {
          title: "快速清洗文本",
          content: "粘贴文本，选择清洗规则，点击处理并复制结果。",
          sortOrder: 10
        }
      }
    }
  });

  const defaults = [
    ["site_name", "恩禾 ENHE AI", "网站名称"],
    ["site_logo", "/images/enhe-logo.svg", "Logo 图片地址"],
    ["home_hero_title", "ENHE AI Tools", "首页主标题"],
    ["home_hero_subtitle", "驾驭 AI 智能，重塑你的人生", "首页副标题"],
    ["home_hero_intro", "用本地应用和云端工具放大你的行动力，把重复工作交给 AI 自动化，把时间留给成长、创造和更好的自己。", "首页介绍文案"],
    ["home_hero_subtitle_en", "Master AI intelligence and reshape your life", "首页英文副标题"],
    ["home_hero_intro_en", "Use desktop apps and web tools to amplify your execution, hand repetitive work to AI automation, and reclaim time for growth and creation.", "首页英文介绍文案"],
    ["footer_copyright", "© 2026 ENHE AI Tools HQW.", "页脚版权"],
    ["alipay_qr", "/images/payment/alipay-qr.jpg", "支付宝个人收款码"],
    ["wechat_qr", "/images/payment/wechat-qr.jpg", "微信个人收款码"],
    ["user_agreement", "注册即表示你同意遵守平台使用规则。", "用户协议"],
    ["privacy_policy", "我们仅收集提供服务所需的必要信息。", "隐私政策"],
    ["refund_policy", "虚拟会员服务开通后原则上不支持退款，特殊情况请联系管理员。", "退款规则"]
  ] as const;

  for (const [key, value, description] of defaults) {
    await prisma.siteSetting.upsert({
      where: { key },
      update: { value, description },
      create: { key, value, description }
    });
  }

  const v1 = await prisma.developmentVersion.upsert({
    where: { version: "V1.0" },
    update: {
      name: "商业闭环版",
      description: "围绕注册登录、VIP、订单支付、工具权限、文件上传、后台审核和部署配置的第一版可运营能力。",
      status: "active",
      sortOrder: 100
    },
    create: {
      version: "V1.0",
      name: "商业闭环版",
      description: "围绕注册登录、VIP、订单支付、工具权限、文件上传、后台审核和部署配置的第一版可运营能力。",
      status: "active",
      sortOrder: 100,
      startedAt: new Date("2026-05-18T00:00:00")
    }
  });

  const progressItems = [
    ["基础页面", "首页与工具入口", "completed", "medium", "src/app/page.tsx, src/app/software/page.tsx, src/app/online-tools/page.tsx", "首页、本地应用、云端工具入口已具备。", 10],
    ["用户与权限", "注册登录与用户中心", "completed", "high", "src/app/(auth), src/app/user/page.tsx, src/lib/auth.ts", "已支持注册、登录、退出、用户中心和会话安全。", 20],
    ["用户与权限", "管理员后台权限", "completed", "high", "src/app/admin/layout.tsx, src/lib/auth.ts", "普通用户不能进入后台，管理员可访问后台菜单。", 30],
    ["工具系统", "工具分类后台自定义", "completed", "high", "src/app/admin/categories/page.tsx", "本地应用与云端工具分类由后台维护。", 40],
    ["工具系统", "本地应用管理", "completed", "high", "src/app/admin/software/page.tsx, src/app/admin/software/[id]/page.tsx", "已支持清单、详情编辑、封面上传、下载文件绑定和上架检查。", 50],
    ["工具系统", "云端工具管理", "completed", "high", "src/app/admin/online-tools/page.tsx, src/app/admin/online-tools/[id]/page.tsx", "已支持在线地址、权限和上架管理。", 60],
    ["工具系统", "工具详情页与教程", "completed", "high", "src/app/tools/[slug]/page.tsx, src/app/admin/tutorials/page.tsx", "详情页已展示教程、截图、评论和相关推荐；教程支持注意事项与常见错误。", 70],
    ["VIP 与订单", "会员套餐管理", "completed", "high", "src/app/admin/plans/page.tsx, src/app/pricing/page.tsx", "后台可维护套餐，前台可创建会员订单。", 80],
    ["VIP 与订单", "订单创建与取消", "completed", "high", "src/app/actions.ts, src/app/user/page.tsx", "用户可创建订单，并可取消允许取消状态的订单。", 90],
    ["VIP 与订单", "个人收款码支付页", "completed", "high", "src/app/orders/[id]/pay/page.tsx, public/images/payment", "支付页已展示支付宝和微信收款码，并提示备注订单号。", 100],
    ["VIP 与订单", "付款截图上传与预览", "completed", "high", "src/app/api/uploads/payment-proof/route.ts, src/app/orders/[id]/page.tsx", "上传后进入订单详情并展示付款凭证预览。", 110],
    ["VIP 与订单", "后台支付审核自动开通权益", "completed", "high", "src/app/actions.ts, src/lib/membership.ts", "审核通过统一调用 membership 服务，VIP 与软件购买权益分流处理。", 120],
    ["权限控制", "VIP 软件下载权限", "completed", "high", "src/app/api/tools/[id]/download/route.ts, src/lib/access.ts", "下载权限在服务端校验。", 130],
    ["权限控制", "在线工具使用权限", "completed", "high", "src/app/api/tools/[id]/use/route.ts, src/lib/access.ts", "在线工具入口在服务端校验权限并记录使用日志。", 140],
    ["内容互动", "用户评论与后台审核", "completed", "medium", "src/app/tools/[slug]/page.tsx, src/app/admin/comments/page.tsx", "评论需后台审核，支持置顶和删除。", 150],
    ["文件与存储", "文件上传与 COS 闭环", "completed", "high", "src/lib/storage.ts, src/app/admin/files/page.tsx", "已支持本地上传、COS 环境变量自动切换、配置体检、远程对象删除和失败提示。", 160],
    ["售后与通知", "退款/售后记录", "completed", "medium", "src/app/orders/[id]/page.tsx, src/app/admin/orders/page.tsx", "用户可申请售后/退款，后台可处理并记录。", 170],
    ["售后与通知", "站内通知", "completed", "medium", "src/app/user/page.tsx, src/lib/notifications.ts", "支付审核、退款处理、VIP 调整已通知用户。", 180],
    ["部署运维", "Docker 与腾讯云部署配置", "completed", "high", "Dockerfile, deploy.sh, deploy/enhe-ai-tools", "已拆分独立部署文件，避免影响旧项目端口。", 190],
    ["安全与质量", "关键流程测试", "partial", "medium", "src/lib/*.test.ts, tests/e2e/commercial-flow.spec.ts", "核心单元测试和商业闭环 E2E 已存在；后续可补更多管理端浏览器回归。", 200],
    ["运营后台", "管理员消息中心", "completed", "medium", "src/app/admin/messages/page.tsx", "已集中展示待审核付款、退款申请、上传异常和 VIP 到期提醒。", 210],
    ["运营后台", "产品发布版本管理", "completed", "medium", "src/app/admin/releases/page.tsx", "已打通开发版本、产品版本、工具版本三层记录。", 220]
  ] as const;

  await prisma.developmentItem.deleteMany({
    where: {
      versionId: v1.id,
      name: { in: ["文件上传与 COS 预留", "后台消息中心与更细审计筛选"] }
    }
  });

  for (const [module, name, status, priority, relatedFiles, notes, sortOrder] of progressItems) {
    await prisma.developmentItem.upsert({
      where: { versionId_name: { versionId: v1.id, name } },
      update: { module, status, priority, relatedFiles, notes, sortOrder },
      create: {
        versionId: v1.id,
        module,
        name,
        status,
        priority,
        relatedFiles,
        notes,
        sortOrder
      }
    });
  }

  await prisma.productRelease.upsert({
    where: { version: "V1.0" },
    update: {
      name: "商业闭环版",
      description: "面向注册登录、VIP 会员、订单支付、人工审核、权限控制、文件上传和后台运营的第一版产品记录。",
      status: "active",
      developmentVersionId: v1.id,
      sortOrder: 100
    },
    create: {
      version: "V1.0",
      name: "商业闭环版",
      description: "面向注册登录、VIP 会员、订单支付、人工审核、权限控制、文件上传和后台运营的第一版产品记录。",
      status: "active",
      developmentVersionId: v1.id,
      sortOrder: 100
    }
  });

  const newsCategorySeeds = [
    ["AI快讯", "ai-news-flash", "快速了解 AI 工具、模型和平台的新变化。", 10],
    ["模型动态", "model-updates", "跟踪主流模型、智能体和推理能力更新。", 20],
    ["工具推荐", "tool-recommendations", "把 AI 新闻连接到可落地的工具选择。", 30],
    ["实战教程", "practical-tutorials", "围绕真实场景整理 AI 使用方法。", 40],
    ["趋势解读", "trend-insights", "从行业变化中提炼对个人和团队有用的判断。", 50],
    ["AI变现", "ai-monetization", "关注 AI 能力如何转化为业务、内容和服务机会。", 60]
  ] as const;

  const newsCategories = await Promise.all(
    newsCategorySeeds.map(([name, slug, description, sortOrder]) =>
      prisma.newsCategory.upsert({
        where: { slug },
        update: { name, description, sortOrder, status: "active" },
        create: { name, slug, description, sortOrder, status: "active" }
      })
    )
  );
  const trendCategory = newsCategories.find((category) => category.slug === "trend-insights") ?? newsCategories[0];
  const newsTagSeeds = ["AI资讯", "趋势解读", "工具落地", "ENHE AI"];
  const newsTags = await Promise.all(
    newsTagSeeds.map((name) =>
      prisma.newsTag.upsert({
        where: { name },
        update: { status: "active" },
        create: {
          name,
          slug: encodeURIComponent(name).replace(/%/g, "").toLowerCase(),
          status: "active"
        }
      })
    )
  );

  const starterNews = await prisma.newsArticle.upsert({
    where: { slug: "ai-news-trend-insights-launch" },
    update: {
      title: "AI资讯与趋势洞察上线：从信息看到行动",
      categoryId: trendCategory.id,
      status: "published",
      publishedAt: new Date("2026-06-18T08:00:00.000Z"),
      updatedAt: new Date("2026-06-18T08:00:00.000Z"),
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
  await Promise.all(
    newsTags.map((tag) =>
      prisma.newsArticleTag.create({
        data: {
          articleId: starterNews.id,
          tagId: tag.id
        }
      })
    )
  );

  console.log(`Seed completed. Admin accounts: ${admin.email}, Sadmin`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
