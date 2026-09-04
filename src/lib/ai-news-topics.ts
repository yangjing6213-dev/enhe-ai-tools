import type { Locale } from "@/lib/dictionaries";

export type AiNewsTopicSlug =
  | "ai-agent"
  | "local-ai"
  | "open-source-models"
  | "ai-tools"
  | "ai-tutorials"
  | "ai-account-service"
  | "ai-regulation";

type TopicCopy = {
  title: string;
  description: string;
  intro: string;
  answer: string;
  searchQuery: string;
  keywords: string[];
  whyItMatters: string[];
  actionLinks: Array<{
    label: string;
    href: string;
  }>;
  faqs: Array<{
    question: string;
    answer: string;
  }>;
};

export type AiNewsTopic = {
  slug: AiNewsTopicSlug;
  updatedAt: string;
  zh: TopicCopy;
  en: TopicCopy;
  sourceLinks: Array<{
    title: string;
    url: string;
  }>;
};

export const aiNewsTopics: AiNewsTopic[] = [
  {
    slug: "ai-agent",
    updatedAt: "2026-06-24T00:00:00.000Z",
    zh: {
      title: "AI智能体趋势专题",
      description:
        "追踪全球AI Agent、Agentic AI、工作流自动化和企业智能体落地资讯，帮助用户判断哪些智能体工具、教程和应用值得优先关注。",
      intro:
        "AI智能体正在从聊天助手走向可执行任务的工作流，ENHE AI会把模型更新、平台发布、企业案例和站内工具教程连接起来。",
      answer:
        "AI智能体专题适合关注自动执行、工具调用、多步骤任务和企业工作流自动化的用户。优先阅读这类内容，可以判断哪些Agent能力已经能落地，哪些仍停留在演示阶段，并自然跳转到相关软件、教程和资讯。",
      searchQuery: "AI智能体",
      keywords: ["AI智能体", "AI Agent", "Agentic AI", "工作流自动化"],
      whyItMatters: [
        "判断AI是否能从回答问题升级为执行任务。",
        "发现适合内容、运营、销售、研发和办公自动化的工具。",
        "把资讯转化为可学习的教程和可购买的软件服务。",
      ],
      actionLinks: [
        { label: "查看AI软件应用", href: "/software" },
        { label: "学习AI技能课程", href: "/skill-learning" },
        { label: "查看AI趋势分析", href: "/ai-trends" },
      ],
      faqs: [
        {
          question: "AI智能体和普通AI聊天工具有什么区别？",
          answer:
            "普通聊天工具主要回答问题，AI智能体更强调目标拆解、工具调用、多步骤执行和结果回传。选择时应看它是否能稳定完成真实任务，而不只是展示对话能力。",
        },
        {
          question: "AI智能体资讯如何转化为行动？",
          answer:
            "先判断该资讯影响的是模型能力、工具生态还是企业流程，再选择对应的软件应用、技能课程或自动化案例，最后用小任务验证是否能稳定节省时间。",
        },
      ],
    },
    en: {
      title: "AI Agent Trends",
      description:
        "Track global AI Agent, Agentic AI, workflow automation, and enterprise agent news with practical links to ENHE AI tools, tutorials, and implementation paths.",
      intro:
        "AI agents are moving from chat into executable workflows. ENHE AI connects model updates, platform launches, enterprise cases, and practical site resources.",
      answer:
        "The AI Agent topic helps users follow autonomous workflows, tool use, multi-step execution, and enterprise automation. It clarifies which agent capabilities are ready for practical use, which remain demos, and what tools or tutorials to explore next.",
      searchQuery: "AI Agent",
      keywords: ["AI Agent", "Agentic AI", "workflow automation", "AI tools"],
      whyItMatters: [
        "Understand whether AI can move from answers to execution.",
        "Find useful tools for content, operations, sales, coding, and office workflows.",
        "Turn news into tutorials, software choices, and implementation plans.",
      ],
      actionLinks: [
        { label: "Explore AI software apps", href: "/software" },
        { label: "Learn AI skill courses", href: "/skill-learning" },
        { label: "View AI trends", href: "/ai-trends" },
      ],
      faqs: [
        {
          question: "How is an AI agent different from a chatbot?",
          answer:
            "A chatbot mainly answers questions. An AI agent is judged by goal decomposition, tool use, multi-step execution, and result delivery. Evaluate whether it can complete a real task reliably.",
        },
        {
          question: "How should AI agent news become an action?",
          answer:
            "Identify whether the news changes model capability, tool ecosystems, or business workflows. Then test a related app, tutorial, or automation case with a small practical task.",
        },
      ],
    },
    sourceLinks: [
      {
        title: "OpenAI platform documentation",
        url: "https://platform.openai.com/docs/",
      },
      {
        title: "Google Agentspace",
        url: "https://cloud.google.com/products/agentspace",
      },
    ],
  },
  {
    slug: "local-ai",
    updatedAt: "2026-06-24T00:00:00.000Z",
    zh: {
      title: "本地部署AI专题",
      description:
        "关注Local AI、Private AI Deployment、端侧AI和企业私有化部署，帮助用户理解成本、隐私、硬件、模型选择和落地路径。",
      intro:
        "本地部署AI关系到数据隐私、推理成本、稳定性和团队控制权，适合需要长期使用AI能力的个人、团队和企业。",
      answer:
        "本地部署AI专题帮助用户判断是否需要私有化模型、端侧推理或局域网AI工具。重点看数据是否敏感、任务频率是否高、硬件是否足够、团队是否需要长期可控的AI工作流。",
      searchQuery: "本地部署AI",
      keywords: ["本地部署AI", "Local AI", "Private AI", "端侧AI"],
      whyItMatters: [
        "降低对单一在线平台的依赖。",
        "在隐私、成本和稳定性之间做清晰取舍。",
        "把模型部署、软件工具和教程学习连接成完整路径。",
      ],
      actionLinks: [
        { label: "查看本地部署软件", href: "/software" },
        { label: "学习部署教程", href: "/skill-learning" },
        { label: "阅读AI前沿资讯", href: "/ai-news" },
      ],
      faqs: [
        {
          question: "什么情况下适合本地部署AI？",
          answer:
            "当任务涉及敏感数据、高频调用、稳定可控或团队内部流程时，本地部署AI更值得评估。若只是轻量体验，在线工具往往成本更低。",
        },
        {
          question: "本地部署AI最需要先确认什么？",
          answer:
            "先确认硬件配置、模型授权、推理速度、数据安全边界和维护能力，再决定采用桌面软件、局域网服务还是企业私有化方案。",
        },
      ],
    },
    en: {
      title: "Local AI Deployment",
      description:
        "Follow Local AI, Private AI Deployment, on-device AI, and enterprise private deployment news with practical guidance for cost, privacy, hardware, and workflows.",
      intro:
        "Local AI affects privacy, inference cost, reliability, and team control. It is especially relevant for users planning repeated or sensitive AI workflows.",
      answer:
        "The Local AI topic helps users decide whether private models, on-device inference, or LAN-based AI tools fit their work. The key checks are data sensitivity, task frequency, hardware readiness, and long-term workflow control.",
      searchQuery: "Local AI",
      keywords: ["Local AI", "Private AI Deployment", "On-device AI", "Edge AI"],
      whyItMatters: [
        "Reduce reliance on a single online platform.",
        "Balance privacy, cost, performance, and maintenance clearly.",
        "Connect deployment choices with software tools and tutorials.",
      ],
      actionLinks: [
        { label: "View local AI software", href: "/software" },
        { label: "Learn deployment courses", href: "/skill-learning" },
        { label: "Read AI news", href: "/ai-news" },
      ],
      faqs: [
        {
          question: "When is local AI worth considering?",
          answer:
            "Local AI is worth evaluating when data is sensitive, usage is frequent, stability matters, or the workflow must stay under team control. Lightweight experiments may still be cheaper online.",
        },
        {
          question: "What should I check before deploying local AI?",
          answer:
            "Check hardware, model license, inference speed, data boundary, and maintenance capacity before choosing a desktop app, LAN service, or private enterprise deployment.",
        },
      ],
    },
    sourceLinks: [
      {
        title: "Hugging Face open models",
        url: "https://huggingface.co/models",
      },
      {
        title: "NVIDIA AI software",
        url: "https://www.nvidia.com/en-us/ai-data-science/software/",
      },
    ],
  },
  {
    slug: "open-source-models",
    updatedAt: "2026-06-24T00:00:00.000Z",
    zh: {
      title: "开源大模型专题",
      description:
        "跟踪开源大模型、Open-weight Model、模型许可证、微调和部署生态，帮助用户选择适合自己的模型和工具路线。",
      intro:
        "开源大模型决定了本地部署、二次开发、行业微调和低成本推理的可能性，也影响软件和课程的选型。",
      answer:
        "开源大模型专题适合想了解模型能力、许可证、部署成本和可商用边界的用户。阅读时应同时关注参数规模、上下文长度、推理成本、社区生态和是否适合自己的实际任务。",
      searchQuery: "开源大模型",
      keywords: ["开源大模型", "Open-source LLM", "Open-weight Model", "模型许可证"],
      whyItMatters: [
        "判断模型是否适合本地部署或企业私有化。",
        "理解不同许可证对商业使用的影响。",
        "找到与软件应用、课程学习和教程实践的连接点。",
      ],
      actionLinks: [
        { label: "查看AI软件应用", href: "/software" },
        { label: "学习模型应用课程", href: "/skill-learning" },
        { label: "查看本地AI趋势", href: "/ai-trends" },
      ],
      faqs: [
        {
          question: "开源大模型等于可以随便商用吗？",
          answer:
            "不一定。需要查看具体许可证、模型权重条款、训练数据声明和平台限制。商业使用前应以官方许可证和发布说明为准。",
        },
        {
          question: "如何选择开源大模型？",
          answer:
            "从任务类型、中文能力、上下文长度、硬件要求、推理速度、工具生态和许可证边界出发评估，不建议只看排行榜分数。",
        },
      ],
    },
    en: {
      title: "Open-source LLMs",
      description:
        "Track open-source LLMs, open-weight models, model licenses, fine-tuning, and deployment ecosystems for practical model selection.",
      intro:
        "Open-source models shape local deployment, customization, industry fine-tuning, and lower-cost inference decisions.",
      answer:
        "The Open-source LLM topic helps users evaluate model capability, license boundaries, deployment cost, and commercial suitability. Key checks include parameter size, context length, inference cost, ecosystem support, and real task fit.",
      searchQuery: "open-source LLM",
      keywords: ["open-source LLM", "open-weight model", "model license", "fine-tuning"],
      whyItMatters: [
        "Decide whether a model fits local or private deployment.",
        "Understand commercial-use implications before adopting a model.",
        "Connect model news with software choices and practical courses.",
      ],
      actionLinks: [
        { label: "Explore AI software apps", href: "/software" },
        { label: "Learn model workflows", href: "/skill-learning" },
        { label: "View AI trends", href: "/ai-trends" },
      ],
      faqs: [
        {
          question: "Does open-source mean free commercial use?",
          answer:
            "Not always. Review the specific license, weight terms, data notes, and platform restrictions. For commercial use, official license text should prevail.",
        },
        {
          question: "How should I choose an open-source LLM?",
          answer:
            "Evaluate the task, language ability, context length, hardware requirements, inference speed, ecosystem, and license boundary instead of relying only on leaderboard scores.",
        },
      ],
    },
    sourceLinks: [
      { title: "Hugging Face models", url: "https://huggingface.co/models" },
      { title: "Meta AI models", url: "https://ai.meta.com/models/" },
    ],
  },
  {
    slug: "ai-tools",
    updatedAt: "2026-06-24T00:00:00.000Z",
    zh: {
      title: "AI工具专题",
      description:
        "覆盖AI效率工具、内容创作工具、编程工具、搜索工具和多模态工具，帮助用户从资讯发现可落地的软件应用。",
      intro:
        "AI工具更新很快，真正有价值的不是看到更多工具，而是判断它能否解决自己的高频任务。",
      answer:
        "AI工具专题帮助用户把新闻里的工具发布转化为选择依据。优先看工具解决的任务、输入输出质量、价格、学习成本、数据安全和是否能与现有工作流连接。",
      searchQuery: "AI工具",
      keywords: ["AI工具", "AI效率工具", "AI Productivity Tools", "AI软件应用"],
      whyItMatters: [
        "减少盲目追新，把注意力放在可复用工作流。",
        "把工具能力与课程、教程和账号访问支持连接起来。",
        "帮助用户比较不同工具适合的任务场景。",
      ],
      actionLinks: [
        { label: "查看AI软件应用", href: "/software" },
        { label: "阅读工具教程", href: "/tutorials" },
        { label: "查看AI账号服务", href: "/account-services" },
      ],
      faqs: [
        {
          question: "如何判断一个AI工具是否值得尝试？",
          answer:
            "先看它是否解决高频任务，再看输出质量、价格、学习成本、隐私边界和是否能稳定接入你的现有流程。",
        },
        {
          question: "为什么AI工具资讯要连接站内软件页面？",
          answer:
            "资讯告诉你发生了什么，软件页面帮助你比较功能、价格、使用说明和教程入口，能把阅读转化为行动。",
        },
      ],
    },
    en: {
      title: "AI Tools",
      description:
        "Follow AI productivity tools, content tools, coding tools, AI search, and multimodal apps so tool news becomes practical software selection.",
      intro:
        "AI tools change quickly. The value is not seeing more tools, but knowing which ones solve repeated tasks.",
      answer:
        "The AI Tools topic turns product news into selection criteria. Evaluate the task solved, input-output quality, pricing, learning curve, data boundary, and whether the tool fits an existing workflow.",
      searchQuery: "AI tools",
      keywords: ["AI tools", "AI productivity tools", "AI software apps", "workflow tools"],
      whyItMatters: [
        "Reduce tool-chasing and focus on reusable workflows.",
        "Connect tool capability with courses, tutorials, and account guidance.",
        "Help users compare which tasks each tool is best for.",
      ],
      actionLinks: [
        { label: "Explore AI software apps", href: "/software" },
        { label: "Read tool tutorials", href: "/tutorials" },
        { label: "View account service guidance", href: "/account-services" },
      ],
      faqs: [
        {
          question: "How do I judge whether an AI tool is worth trying?",
          answer:
            "Start with the repeated task it solves, then check output quality, price, learning curve, privacy boundary, and whether it integrates with your current workflow.",
        },
        {
          question: "Why should AI tool news link to software pages?",
          answer:
            "News explains what changed. Software pages help users compare features, pricing, usage notes, and tutorials so reading becomes action.",
        },
      ],
    },
    sourceLinks: [
      { title: "Product Hunt AI products", url: "https://www.producthunt.com/topics/artificial-intelligence" },
      { title: "GitHub Trending", url: "https://github.com/trending" },
    ],
  },
  {
    slug: "ai-tutorials",
    updatedAt: "2026-06-24T00:00:00.000Z",
    zh: {
      title: "AI技能教程专题",
      description:
        "聚焦Prompt Engineering、AI工具实战、本地部署教程、自动化流程和内容创作技能，让资讯变成可学习的方法。",
      intro:
        "AI技能教程连接资讯和结果：知道趋势之后，还需要知道怎样操作、怎样复用、怎样避免常见错误。",
      answer:
        "AI技能教程专题适合希望把AI资讯转化为实际能力的用户。建议先明确要完成的任务，再学习提示词、工具操作、本地部署或自动化流程，并用小案例验证结果。",
      searchQuery: "AI技能教程",
      keywords: ["AI技能教程", "Prompt Engineering", "AI Tutorial", "AI课程"],
      whyItMatters: [
        "把资讯里的新能力拆成可学习步骤。",
        "帮助用户形成稳定的AI工作流。",
        "连接教程、软件、账号服务和AI资讯内容。",
      ],
      actionLinks: [
        { label: "进入AI技能学习", href: "/skill-learning" },
        { label: "查看AI软件应用", href: "/software" },
        { label: "阅读AI前沿资讯", href: "/ai-news" },
      ],
      faqs: [
        {
          question: "AI技能教程应该从哪里开始学？",
          answer:
            "先从自己的高频任务开始，例如写作、视频、办公、编程或自动化。明确目标后再学习对应工具和提示词，比泛泛学习更容易产生结果。",
        },
        {
          question: "如何判断教程是否有价值？",
          answer:
            "有价值的教程应包含适用场景、操作步骤、常见错误、输出示例和相关工具链接，而不是只介绍概念。",
        },
      ],
    },
    en: {
      title: "AI Tutorials",
      description:
        "Follow prompt engineering, practical AI tool workflows, local deployment tutorials, automation, and content creation skills.",
      intro:
        "AI tutorials connect news with results: after understanding a trend, users still need steps, repeatable methods, and error avoidance.",
      answer:
        "The AI Tutorials topic helps users turn AI news into practical capability. Start with a task, then learn prompts, tool operations, local deployment, or automation workflows, and validate the result with a small case.",
      searchQuery: "AI tutorial",
      keywords: ["AI tutorial", "prompt engineering", "AI skill course", "workflow tutorial"],
      whyItMatters: [
        "Turn new AI capabilities into learnable steps.",
        "Help users build repeatable AI workflows.",
        "Connect tutorials with software, account support, and AI news.",
      ],
      actionLinks: [
        { label: "Enter AI skill learning", href: "/skill-learning" },
        { label: "Explore AI software apps", href: "/software" },
        { label: "Read AI news", href: "/ai-news" },
      ],
      faqs: [
        {
          question: "Where should I start learning AI skills?",
          answer:
            "Start from a repeated task such as writing, video, office work, coding, or automation. Learning around a clear goal produces results faster than broad theory.",
        },
        {
          question: "What makes an AI tutorial valuable?",
          answer:
            "A useful tutorial includes scenarios, steps, common mistakes, output examples, and related tool links, not just concepts.",
        },
      ],
    },
    sourceLinks: [
      { title: "OpenAI prompting guide", url: "https://platform.openai.com/docs/guides/prompt-engineering" },
      { title: "Google AI for Developers", url: "https://ai.google.dev/" },
    ],
  },
  {
    slug: "ai-account-service",
    updatedAt: "2026-06-24T00:00:00.000Z",
    zh: {
      title: "AI账号服务合规专题",
      description:
        "围绕AI工具订阅、账号使用支持、平台政策、访问方式和合规边界，帮助用户理解账号服务该如何安全使用。",
      intro:
        "AI账号服务需要强调咨询、订阅支持、访问说明和平台规则，而不是绕过限制或替代官方政策。",
      answer:
        "AI账号服务专题帮助用户理解订阅、访问、交付说明和合规使用边界。涉及第三方平台时，应以对应平台官方政策为准，避免承诺绕过限制、共享账号或永久可用等高风险表达。",
      searchQuery: "AI账号服务",
      keywords: ["AI账号服务", "AI工具订阅", "账号合规使用", "Account Security"],
      whyItMatters: [
        "降低账号、订阅和第三方平台政策风险。",
        "帮助用户在购买前确认服务范围和售后边界。",
        "把账号服务与软件应用、教程学习和资讯解读连接起来。",
      ],
      actionLinks: [
        { label: "查看AI账号服务", href: "/account-services" },
        { label: "查看AI软件应用", href: "/software" },
        { label: "查看服务规则", href: "/legal/user-agreement" },
      ],
      faqs: [
        {
          question: "AI账号服务应该如何合规使用？",
          answer:
            "应围绕订阅咨询、访问说明、账号使用建议和平台规则提醒展开。涉及第三方平台时，请以官方政策为准。",
        },
        {
          question: "账号服务页面应避免哪些说法？",
          answer:
            "应避免官方代充、共享账号、破解、绕过限制、保证不封号、永久可用等高风险表达，改用订阅支持和合规使用建议。",
        },
      ],
    },
    en: {
      title: "AI Account Service Compliance",
      description:
        "Understand AI tool subscriptions, account usage support, platform policies, access methods, and compliance boundaries before using account services.",
      intro:
        "AI account services should emphasize subscription guidance, access notes, usage support, and platform rules, not bypassing restrictions.",
      answer:
        "The AI Account Service topic helps users understand subscription, access, delivery notes, and compliant usage boundaries. For third-party platforms, official platform policy should prevail, and risky claims such as shared accounts, bypassing limits, or permanent availability should be avoided.",
      searchQuery: "AI account service",
      keywords: ["AI account service", "subscription support", "account security", "platform policy"],
      whyItMatters: [
        "Reduce account, subscription, and third-party platform risk.",
        "Help users confirm service scope and support boundaries before purchase.",
        "Connect account guidance with software, tutorials, and AI news.",
      ],
      actionLinks: [
        { label: "View account services", href: "/account-services" },
        { label: "Explore AI software apps", href: "/software" },
        { label: "Read service rules", href: "/legal/user-agreement" },
      ],
      faqs: [
        {
          question: "How should AI account services be used compliantly?",
          answer:
            "They should focus on subscription guidance, access notes, usage suggestions, and platform policy reminders. For third-party platforms, official policy should prevail.",
        },
        {
          question: "What wording should account service pages avoid?",
          answer:
            "Avoid risky claims such as official recharge, shared accounts, cracked access, bypassing limits, guaranteed no-ban, or permanent availability. Use subscription support and compliance guidance instead.",
        },
      ],
    },
    sourceLinks: [
      { title: "OpenAI policies", url: "https://openai.com/policies/" },
      { title: "Google Terms of Service", url: "https://policies.google.com/terms" },
    ],
  },
  {
    slug: "ai-regulation",
    updatedAt: "2026-06-24T00:00:00.000Z",
    zh: {
      title: "AI监管与安全专题",
      description:
        "关注EU AI Act、中国AI政策、平台政策、AI安全和全球监管变化，帮助用户判断工具使用、内容发布和企业落地边界。",
      intro:
        "AI监管影响模型发布、账号订阅、内容生成、数据处理和企业采用。用户需要把政策变化转化为实际边界。",
      answer:
        "AI监管专题帮助用户理解全球AI政策、平台规则和安全要求对实际使用的影响。重点关注数据、版权、账号、内容生成、模型部署和企业使用边界，避免把未核实信息作为决策依据。",
      searchQuery: "AI监管",
      keywords: ["AI监管", "AI Safety", "EU AI Act", "中国AI政策"],
      whyItMatters: [
        "帮助用户识别高风险内容和使用场景。",
        "把政策变化连接到工具、教程、账号服务和企业流程。",
        "提升站内内容的可信度和可引用性。",
      ],
      actionLinks: [
        { label: "阅读AI前沿资讯", href: "/ai-news" },
        { label: "查看账号服务合规说明", href: "/account-services" },
        { label: "查看免责声明", href: "/legal/disclaimer" },
      ],
      faqs: [
        {
          question: "AI监管资讯为什么重要？",
          answer:
            "它会影响平台政策、模型能力开放、内容生成边界、数据处理方式和企业采用路径。越是长期使用AI，越需要关注监管和平台规则。",
        },
        {
          question: "如何阅读AI政策类新闻？",
          answer:
            "优先查看官方文件、发布时间和适用范围，再结合实际场景判断是否影响工具使用、账号服务、内容发布或本地部署。",
        },
      ],
    },
    en: {
      title: "AI Regulation and Safety",
      description:
        "Follow the EU AI Act, China AI policy, platform policies, AI safety, and global regulatory changes with practical implications for ENHE AI users.",
      intro:
        "AI regulation affects model releases, subscriptions, content generation, data handling, and enterprise adoption.",
      answer:
        "The AI Regulation topic helps users understand how global AI policy, platform rules, and safety requirements affect practical use. Focus on data, copyright, account use, generated content, model deployment, and enterprise boundaries.",
      searchQuery: "AI regulation",
      keywords: ["AI regulation", "AI safety", "EU AI Act", "China AI policy"],
      whyItMatters: [
        "Identify high-risk content and usage scenarios.",
        "Connect policy changes with tools, tutorials, account services, and enterprise workflows.",
        "Improve trust and citation quality across site content.",
      ],
      actionLinks: [
        { label: "Read AI news", href: "/ai-news" },
        { label: "View account compliance notes", href: "/account-services" },
        { label: "Read disclaimer", href: "/legal/disclaimer" },
      ],
      faqs: [
        {
          question: "Why does AI regulation news matter?",
          answer:
            "It can affect platform policy, model access, content boundaries, data handling, and enterprise adoption. Long-term AI users should track regulation and platform rules.",
        },
        {
          question: "How should I read AI policy news?",
          answer:
            "Prioritize official documents, dates, and scope. Then judge whether the change affects tool use, account services, content publishing, or local deployment.",
        },
      ],
    },
    sourceLinks: [
      { title: "EU Artificial Intelligence Act", url: "https://artificialintelligenceact.eu/" },
      { title: "Cyberspace Administration of China", url: "https://www.cac.gov.cn/" },
    ],
  },
];

export const aiNewsTopicSlugs = aiNewsTopics.map((topic) => topic.slug);

export function getAiNewsTopic(slug: string) {
  return aiNewsTopics.find((topic) => topic.slug === slug) ?? null;
}

export function getAiNewsTopicCopy(topic: AiNewsTopic, locale: Locale) {
  return locale === "en" ? topic.en : topic.zh;
}

export function getAiNewsTopicPath(slug: AiNewsTopicSlug, locale: Locale) {
  return `${locale === "en" ? "/en" : ""}/ai-news/topics/${slug}`;
}
