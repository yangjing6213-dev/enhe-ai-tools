import type {
  EbosExternalChannelPublishAsset,
  EbosExternalPublishingChannel,
  EbosExternalPublishingPack
} from "./external-publishing-types";

export const DEFAULT_EXTERNAL_PUBLISHING_CHANNELS: EbosExternalPublishingChannel[] = [
  "xianyu",
  "taobao",
  "whop",
  "xiaohongshu",
  "wechat",
  "manual_outreach"
];

const DEFAULT_VERIFIED_LANDING_PAGES = [
  "https://www.enhe-tech.com.cn/validation/ai-prompt-kit",
  "https://www.enhe-tech.com.cn/en/validation/ai-prompt-kit"
];

const DEFAULT_TARGET = "ENHE AI Prompt Kit";
const ZH_COMPLIANCE_NOTICE = "模板仅作为效率辅助，结果需要人工审核；不保证收入，不承诺平台流量、排名或订单。所有浏览、点击、咨询、订单、收入、退款和用户反馈都必须真实发生后再记录。";
const EN_COMPLIANCE_NOTICE = "Templates are productivity aids only and require human review. No income, traffic, ranking, or order guarantee is made. Record real clicks, inquiries, orders, revenue, refunds, and feedback only after they happen.";
const ZH_PRICE_SUGGESTION = "验证阶段价格测试：免费样例包 0 元，入门模板包 19 元，完整模板包 49 元，商业场景包 99 元。不是最终正式价格。";
const EN_PRICE_SUGGESTION = "Pricing validation: free sample pack CNY 0, starter CNY 19, full pack CNY 49, business scenario pack CNY 99. These are not final prices.";

export function buildExternalPublishingPack(options: {
  targetDate: string | Date;
  generatedAt?: string | Date;
  verifiedLandingPages?: string[];
  channels?: EbosExternalPublishingChannel[];
  targetProductOrDirection?: string;
}): EbosExternalPublishingPack {
  const channels = options.channels ?? DEFAULT_EXTERNAL_PUBLISHING_CHANNELS;
  const targetDate = toDateKey(options.targetDate);
  const generatedAt = toIso(options.generatedAt ?? new Date());
  const targetProductOrDirection = options.targetProductOrDirection ?? DEFAULT_TARGET;
  const verifiedLandingPages = options.verifiedLandingPages ?? DEFAULT_VERIFIED_LANDING_PAGES;
  const publishAssets = channels.map((channel) => buildChannelPublishAsset(channel, {
    targetProductOrDirection,
    verifiedLandingPages
  }));

  return {
    packType: "external_channel_publishing_pack",
    targetDate,
    generatedAt,
    verifiedLandingPages,
    channels,
    publishAssets,
    trackingFields: Object.fromEntries(channels.map((channel) => [channel, buildTrackingFields(channel)])) as Record<EbosExternalPublishingChannel, string[]>,
    userMinimumActions: [
      "Copy one channel asset into the matching external platform.",
      "Publish only after reviewing the platform rules and compliance wording.",
      "Record the real published URL if one exists.",
      "Keep every metric at 0 until it is observed in the platform or from a real user."
    ],
    codexAllowedActions: [
      "Generate copy-ready publishing assets.",
      "Generate local result-input templates.",
      "Validate user-filled results.",
      "Run dry-run backfill and apply only when real signals are present and --apply is used."
    ],
    safetyWarnings: [
      "Do not invent views, clicks, saves, messages, orders, revenue, refunds, or feedback.",
      "Do not mark published=true unless the user really published or contacted the channel.",
      "Do not bypass external platform rules.",
      "Do not read, print, or request account passwords, cookies, tokens, or secret values.",
      "Published=false and zero metrics are valid while waiting for real channel activity."
    ],
    nextCommands: [
      "npx tsx scripts/check-ebos-external-publish-results.ts --date 2026-07-03",
      "npx tsx scripts/backfill-ebos-external-channel-data.ts --date 2026-07-03"
    ]
  };
}

export function buildChannelPublishAsset(channel: EbosExternalPublishingChannel, options: {
  targetProductOrDirection?: string;
  verifiedLandingPages?: string[];
} = {}): EbosExternalChannelPublishAsset {
  const targetProductOrDirection = options.targetProductOrDirection ?? DEFAULT_TARGET;
  const pages = options.verifiedLandingPages ?? DEFAULT_VERIFIED_LANDING_PAGES;
  const zhUrl = pages.find((url) => !url.includes("/en/")) ?? pages[0] ?? DEFAULT_VERIFIED_LANDING_PAGES[0];
  const enUrl = pages.find((url) => url.includes("/en/")) ?? pages[1] ?? zhUrl;

  if (channel === "whop") {
    return {
      channel,
      targetProductOrDirection,
      language: "en",
      title: "AI Prompt Kit for product copy, SEO, listings, and AI tool planning",
      shortDescription: "Get five free sample prompts, then test the full 100+ template pack for digital product launches.",
      longDescription: [
        "This AI Prompt Kit helps creators and operators draft product copy, SEO/GEO content, product listings, AI tool requirements, and digital product launch notes.",
        "Free samples cover product intros, SEO metadata, social launch notes, product listings, and AI tool planning.",
        "The full validation offer tests 100+ bilingual prompt templates organized for Markdown, PDF, and Notion-ready delivery.",
        EN_COMPLIANCE_NOTICE
      ].join("\n\n"),
      priceSuggestion: EN_PRICE_SUGGESTION,
      urlToPromote: enUrl,
      tags: ["AI prompts", "SEO", "GEO", "digital products", "product listings"],
      callToAction: "Open the validation page and request the free sample prompts.",
      complianceNotice: EN_COMPLIANCE_NOTICE,
      publishSteps: [
        "Create a Whop product or waitlist entry manually.",
        "Paste the title, short description, long description, and validation URL.",
        "Keep checkout disabled unless delivery, support, and refund rules are ready.",
        "Record only real views, clicks, messages, paid orders, revenue, refunds, feedback, and evidence."
      ],
      dataFieldsToRecord: buildTrackingFields(channel),
      userMinimumAction: "Manually create or update the Whop listing and paste the live URL into the result input.",
      warnings: ["Codex must not log in to Whop or claim paid orders without user-provided evidence."]
    };
  }

  const byChannel: Record<Exclude<EbosExternalPublishingChannel, "whop">, Pick<EbosExternalChannelPublishAsset, "title" | "shortDescription" | "longDescription" | "tags" | "callToAction" | "publishSteps" | "userMinimumAction" | "warnings">> = {
    xianyu: {
      title: "AI Prompt 模板包，产品文案 SEO 上架副业都能用",
      shortDescription: "先免费领 5 个高频 Prompt 样例，再看是否需要完整 100+ 模板包。",
      longDescription: [
        "我整理了一套 AI Prompt 模板包，适合做 AI 工具站、数字产品、副业项目、闲鱼/淘宝上架和内容运营的人。",
        "免费样例包含：产品介绍 Prompt、SEO 标题/描述 Prompt、小红书种草笔记 Prompt、闲鱼商品文案 Prompt、AI 工具开发需求 Prompt。",
        "完整包计划包含 100+ Prompt 模板，中英文双语，覆盖内容创作、SEO/GEO、产品上架、AI 工具开发、私域运营和数字产品变现。",
        ZH_PRICE_SUGGESTION,
        ZH_COMPLIANCE_NOTICE
      ].join("\n\n"),
      tags: ["AI工具", "提示词", "副业", "产品文案", "SEO"],
      callToAction: "打开验证页，先免费领取 5 个 Prompt 样例。",
      publishSteps: [
        "手动创建闲鱼商品或草稿。",
        "粘贴标题、详情、验证页链接和合规说明。",
        "交付、退款和客服边界必须按平台规则写清楚。",
        "发布后只记录真实 views、messages、orders、paidOrders、revenue、refundCount 和 userFeedback。"
      ],
      userMinimumAction: "手动发布或保存闲鱼商品，并把真实链接和数据填回结果文件。",
      warnings: ["不要把未发生的咨询、收藏、订单或收入写入 EBOS。"]
    },
    taobao: {
      title: "AI Prompt 模板包，产品页 SEO FAQ 上架文案",
      shortDescription: "面向 AI 工具、数字产品和副业项目的可复制 Prompt 文档。",
      longDescription: [
        "这不是自动赚钱工具，而是一套帮你更快写产品页、FAQ、SEO/GEO、上架文案和 AI 工具需求的 Prompt 模板包。",
        "可先领取 5 个免费样例，再决定是否需要 19/49/99 元验证阶段包。",
        "完整包计划覆盖 100+ 模板，中英文双语，可整理为 Markdown、PDF 和 Notion 格式。",
        ZH_COMPLIANCE_NOTICE
      ].join("\n\n"),
      tags: ["AI", "Prompt", "运营模板", "产品页", "SEO"],
      callToAction: "打开验证页，确认是否需要免费样例或完整模板包。",
      publishSteps: [
        "按淘宝合规要求手动创建详情页。",
        "粘贴标题、详情、合规说明和验证页链接。",
        "确保交付、退款、客服和数字商品规则清晰。",
        "发布后记录真实 views、clicks、messages、orders、paidOrders、revenue 和 refundCount。"
      ],
      userMinimumAction: "手动创建淘宝商品或草稿，并把真实发布结果填入本地输入文件。",
      warnings: ["不要承诺收益、排名、自动增长或绕过平台规则。"]
    },
    xiaohongshu: {
      title: "我整理了 20 个能直接用的 AI 提示词，免费送",
      shortDescription: "不会写提示词？先领 5 个免费样例，看看能不能帮你写产品文案、SEO 和上架草稿。",
      longDescription: [
        "备选标题：",
        "1. 我整理了 20 个能直接用的 AI 提示词，免费送",
        "2. 不会写提示词？我做了一套可复制的 AI 模板",
        "3. 做副业/自媒体/产品上架，这些 Prompt 真的能省时间",
        "",
        "正文：",
        "我最近在整理一套 AI Prompt 模板包，目标很简单：帮做副业、自媒体、AI 工具、闲鱼/淘宝上架的人，少一点从 0 写文案的时间。",
        "现在先开放 5 个免费样例：产品介绍、SEO 标题/描述、小红书笔记、闲鱼商品文案、AI 工具开发需求。",
        "如果你也经常卡在不会写产品介绍、不会写 SEO/GEO 内容、不会写上架文案，或者不知道怎么把 AI 用到副业项目里，可以先看免费样例。",
        ZH_COMPLIANCE_NOTICE
      ].join("\n"),
      tags: ["AI提示词", "自媒体", "副业", "产品上架", "SEO"],
      callToAction: "想要样例的话，打开验证页或私信我。",
      publishSteps: [
        "从 3 个标题中选 1 个手动发布小红书笔记。",
        "正文说明适用人群、免费样例、完整包方向、限制和验证页链接。",
        "评论区或私信只记录真实咨询。",
        "回填 views、saves、shares、messages、leads 和 evidence。"
      ],
      userMinimumAction: "手动发布 1 篇小红书笔记，并记录真实浏览、收藏、分享、私信和线索。",
      warnings: ["不要刷量，不要把平台不可见数据写成已发生。"]
    },
    wechat: {
      title: "AI Prompt Kit：先免费领 5 个能直接用的提示词样例",
      shortDescription: "朋友圈/微信群文案，用于邀请真实朋友或运营者查看免费样例。",
      longDescription: [
        "我整理了一套 AI Prompt 模板包，想先验证一下真实需求。",
        "现在可以免费领取 5 个高频样例：产品介绍、SEO 标题/描述、小红书笔记、闲鱼商品文案、AI 工具开发需求。",
        "如果你正在做 AI 工具、数字产品、自媒体、副业项目或产品上架，可以先拿样例试用一下。如果你觉得有用，我再继续做完整 100+ 模板包。",
        "链接：{validation_url}",
        ZH_COMPLIANCE_NOTICE
      ].join("\n\n"),
      tags: ["AI工具", "Prompt", "副业", "私域"],
      callToAction: "有兴趣的话打开验证页，或直接微信回复我。",
      publishSteps: [
        "手动发朋友圈或微信群。",
        "附上验证页链接和明确 CTA：免费领取 5 个 Prompt 样例。",
        "只记录真实私信、正向回复、负向回复、订单和收入。",
        "不要导出或记录任何隐私敏感内容。"
      ],
      userMinimumAction: "手动发送到朋友圈或微信群，并只回填真实互动数据。",
      warnings: ["不要记录私人敏感内容，只写数量和匿名反馈摘要。"]
    },
    manual_outreach: {
      title: "AI Prompt Kit 私聊触达话术",
      shortDescription: "用于一对一触达真实潜在用户，重点是免费样例试用，不是让对方帮忙看看。",
      longDescription: "我整理了 5 个可以免费领取的 AI Prompt 样例，想送你试用一下。如果你觉得有用，我再做完整模板包。\n\n这几个样例主要解决产品介绍、SEO 标题/描述、小红书笔记、闲鱼商品文案和 AI 工具开发需求。你如果正在做副业、自媒体、AI 工具或产品上架，可以先试试看。\n\n我不会承诺收益、流量或订单，只想看真实样例是否有用。如果不需要也没关系，直接说不用就行。",
      tags: ["manual outreach", "AI prompts", "free sample"],
      callToAction: "回复 yes 我发验证页链接，或直接说不需要。",
      publishSteps: [
        "选择真实认识或明确可能需要的人，不群发骚扰。",
        "发送私聊话术和验证页链接。",
        "记录 messages、leads、positiveReplies、negativeReplies、orders、paidOrders、revenue 和 userFeedback。",
        "用户拒绝时停止继续触达。"
      ],
      userMinimumAction: "手动触达 10 个真实潜在用户，并回填真实回复和后续转化。",
      warnings: ["不要骚扰用户，不要把未回复当作正向线索。"]
    },
    other: {
      title: "AI Prompt Kit",
      shortDescription: "Reusable prompt templates for product copy, SEO, listings, and AI tool planning.",
      longDescription: "Use this asset only on a platform that allows this type of validation content. Keep unobserved metrics at 0.",
      tags: ["AI", "Prompt", "Operations"],
      callToAction: "Open the validation page and request the free sample prompts.",
      publishSteps: ["Review platform rules.", "Post manually.", "Record only observed metrics."],
      userMinimumAction: "Manually publish on a compliant channel and record real results.",
      warnings: ["Use only if the platform allows this content."]
    }
  };

  const preset = byChannel[channel];
  return {
    channel,
    targetProductOrDirection,
    language: "zh",
    title: preset.title,
    shortDescription: preset.shortDescription,
    longDescription: preset.longDescription.replace("{validation_url}", zhUrl),
    priceSuggestion: ZH_PRICE_SUGGESTION,
    urlToPromote: zhUrl,
    tags: preset.tags,
    callToAction: preset.callToAction,
    complianceNotice: ZH_COMPLIANCE_NOTICE,
    publishSteps: preset.publishSteps,
    dataFieldsToRecord: buildTrackingFields(channel),
    userMinimumAction: preset.userMinimumAction,
    warnings: preset.warnings
  };
}

export function buildTrackingFields(channel: EbosExternalPublishingChannel): string[] {
  if (channel === "xianyu") return ["published", "publishedUrl", "views", "messages", "orders", "paidOrders", "revenue", "refundCount", "userFeedback", "evidence"];
  if (channel === "taobao") return ["published", "publishedUrl", "views", "clicks", "messages", "orders", "paidOrders", "revenue", "refundCount", "evidence"];
  if (channel === "whop") return ["published", "publishedUrl", "views", "clicks", "messages", "paidOrders", "revenue", "refundCount", "evidence"];
  if (channel === "xiaohongshu") return ["published", "publishedUrl", "views", "saves", "shares", "messages", "leads", "evidence"];
  if (channel === "wechat") return ["published", "publishedAt", "messages", "leads", "positiveReplies", "orders", "paidOrders", "revenue", "userFeedback"];
  if (channel === "manual_outreach") return ["messages", "leads", "positiveReplies", "negativeReplies", "orders", "paidOrders", "revenue", "userFeedback"];
  return ["published", "publishedUrl", "views", "clicks", "messages", "orders", "revenue", "evidence"];
}

function toDateKey(value: string | Date) {
  if (typeof value === "string") return value.slice(0, 10);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function toIso(value: string | Date) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
