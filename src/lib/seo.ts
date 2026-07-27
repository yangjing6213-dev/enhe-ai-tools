import type { Metadata } from "next";
import type { Locale } from "@/lib/dictionaries";
import { localeSwitchQueryName } from "@/lib/locale-routing";

export const fallbackSiteBaseUrl = "https://www.enhe-tech.com.cn";
export const siteName = "ENHE AI";
export const defaultSiteDescription =
  "ENHE AI helps users apply AI to real tasks: work faster, create content, organize material, learn skills, and choose safer AI paths.";
export const defaultBrandIcon = "/images/brand/enhe-icon-gradient-white-bg-cropped.png";
export const defaultOgImage = "/images/brand/enhe-ai-og-1200x630.png";

type PageMetadataInput = {
  title: string;
  description?: string | null;
  path?: string;
  image?: string | null;
  locale?: "zh_CN" | "en_US";
  type?: "website" | "article";
  localeKey?: Locale;
  languageAlternates?: Record<string, string>;
};

type MetadataTitleInput = {
  pageTitle: string;
  brand?: string;
  maxLength?: number;
};

type BuildTitleInput = {
  name: string;
  englishName?: string | null;
  brand?: string;
  maxLength?: number;
  locale?: Locale;
};

type ToolMetaDescriptionInput = {
  name: string;
  englishName?: string | null;
  description?: string | null;
  brand?: string;
  locale?: Locale;
  type?: "software" | "online" | "skill_learning";
  maxLength?: number;
};

export type ListingMetadataKind =
  | "software"
  | "account-services"
  | "skill-learning"
  | "ai-news"
  | "pricing"
  | "tutorials";

type TopicMetaDescriptionInput = {
  title: string;
  description?: string | null;
  locale: Locale;
  kind?: "ai-topic" | "ai-news-topic";
  maxLength?: number;
};

type OrganizationSchemaInput = {
  id?: string;
  name: string;
  alternateName?: string[];
  logo?: string | null;
  url?: string;
  description?: string | null;
  sameAs?: string[];
  knowsAbout?: string[];
  subjectOf?: Array<{
    name: string;
    url: string;
    encodingFormat?: string;
  }>;
  contactPoint?: {
    email: string;
    contactType?: string;
    availableLanguage?: string[];
  } | null;
  schemaType?: "Organization";
};

type WebSiteSchemaInput = {
  id?: string;
  name: string;
  description?: string | null;
  url?: string;
  inLanguage?: string;
  searchPathTemplate?: string | null;
  publisherId?: string;
  schemaType?: "WebSite";
};

export type BreadcrumbItem = {
  name: string;
  path: string;
};

type BreadcrumbSchemaInput = {
  items: BreadcrumbItem[];
  schemaType?: "BreadcrumbList";
};

type FaqSchemaInput = {
  items: ReadonlyArray<{
    question: string;
    answer: string;
  }>;
  schemaType?: "FAQPage";
};

type OfferSpecInput = {
  name: string;
  price: number;
};

type ToolStructuredDataInput = {
  schemaType: "SoftwareApplication" | "Service" | "Course";
  name: string;
  description?: string | null;
  url: string;
  image?: string | null;
  brand?: string;
  category?: string | null;
  operatingSystem?: string | null;
  locale?: string;
  price?: number | null;
  currency?: string;
  softwareVersion?: string | null;
  priceSpecs?: OfferSpecInput[];
  aggregateRating?: {
    ratingValue: number;
    reviewCount: number;
  } | null;
};

type ProductStructuredDataInput = {
  name: string;
  description?: string | null;
  url: string;
  image?: string | null;
  brand?: string;
  category?: string | null;
  price?: number | null;
  currency?: string;
  priceSpecs?: OfferSpecInput[];
};

export function getSiteBaseUrl() {
  return (
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    fallbackSiteBaseUrl
  ).replace(/\/+$/, "");
}

export function absoluteUrl(path = "/") {
  if (/^https?:\/\//i.test(path)) return path;
  return `${getSiteBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

export function buildPageEntityId(path = "/", fragment = "webpage") {
  const canonical = absoluteUrl(path).split("#", 1)[0];
  return `${canonical}#${fragment}`;
}

export function stripLocalePrefix(path: string) {
  if (!path || path === "/") return "/";
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return normalized === "/en"
    ? "/"
    : normalized.replace(/^\/en(?=\/|$)/, "") || "/";
}

export function buildLocalePath(path: string, locale: Locale) {
  const normalized = stripLocalePrefix(path);
  if (/^\/(?:admin|orders)(?:\/|$)/.test(normalized)) {
    return normalized;
  }
  if (locale === "en") {
    return normalized === "/" ? "/en" : `/en${normalized}`;
  }
  return normalized;
}

const localizedPublicRoutePatterns = [
  /^\/$/,
  /^\/login$/,
  /^\/register$/,
  /^\/user$/,
  /^\/about$/,
  /^\/build-your-own-x$/,
  /^\/ai-topics$/,
  /^\/ai-topics\/.+$/,
  /^\/software$/,
  /^\/software\/.+$/,
  /^\/account-services$/,
  /^\/account-services\/.+$/,
  /^\/skill-learning$/,
  /^\/skill-learning\/.+$/,
  /^\/search$/,
  /^\/product-paths\/.+$/,
  /^\/product-demos$/,
  /^\/product-demos\/.+$/,
  /^\/ai-news$/,
  /^\/ai-news\/.+$/,
  /^\/ai-news\/topics\/.+$/,
  /^\/ai-trends$/,
  /^\/ai-trends\/daily$/,
  /^\/ai-trends\/daily\/.+$/,
  /^\/pricing$/,
  /^\/tutorials$/,
  /^\/tools\/.+$/,
  /^\/legal\/.+$/,
] as const;

export function isLocalizedPublicPath(path: string) {
  const normalized = stripLocalePrefix(path);
  return localizedPublicRoutePatterns.some((pattern) =>
    pattern.test(normalized),
  );
}

export function buildLanguageSwitcherHref(path: string, locale: Locale) {
  const normalized = stripLocalePrefix(path);
  const isEnglishPath = path === "/en" || path.startsWith("/en/");
  const aiNewsPageMatch = normalized.match(/^\/ai-news\/page\/(\d+)$/);
  const withLocaleSwitch = (href: string) =>
    `${href}${href.includes("?") ? "&" : "?"}${localeSwitchQueryName}=${locale}`;

  if (/^\/(?:admin|orders)(?:\/|$)/.test(normalized)) {
    return withLocaleSwitch(normalized);
  }

  if (!isLocalizedPublicPath(path)) {
    return withLocaleSwitch(buildLocalePath("/", locale));
  }

  if (
    locale === "en" &&
    !isEnglishPath &&
    aiNewsPageMatch &&
    Number.parseInt(aiNewsPageMatch[1], 10) > 1
  ) {
    return buildLocalePath("/ai-news", locale);
  }

  return buildLocalePath(path, locale);
}

export function buildLanguageAlternates(path = "/") {
  return {
    "x-default": absoluteUrl(stripLocalePrefix(path)),
    "zh-CN": absoluteUrl(buildLocalePath(path, "zh")),
    "en-US": absoluteUrl(buildLocalePath(path, "en")),
  } as const;
}

export function buildAvailableLanguageAlternates(
  path = "/",
  locales: Locale[] = ["zh", "en"],
) {
  const normalized = stripLocalePrefix(path);
  return {
    "x-default": absoluteUrl(normalized),
    ...(locales.includes("zh")
      ? { "zh-CN": absoluteUrl(buildLocalePath(normalized, "zh")) }
      : {}),
    ...(locales.includes("en")
      ? { "en-US": absoluteUrl(buildLocalePath(normalized, "en")) }
      : {}),
  };
}

export function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function truncateText(value: string, maxLength: number) {
  const normalized = normalizeWhitespace(value)
    .replace(/\.{3,}|…+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (normalized.length <= maxLength) return normalized;
  if (maxLength <= 0) return "";

  const candidate = normalized.slice(0, maxLength).trimEnd();
  const lastNaturalBreak = Math.max(
    candidate.lastIndexOf(" "),
    candidate.lastIndexOf(","),
    candidate.lastIndexOf(";"),
    candidate.lastIndexOf("，"),
    candidate.lastIndexOf("；"),
    candidate.lastIndexOf("。"),
  );

  return lastNaturalBreak >= Math.floor(maxLength * 0.6)
    ? candidate.slice(0, lastNaturalBreak).trimEnd()
    : candidate;
}

export function truncateDescription(value: string, maxLength = 160) {
  return truncateText(value, maxLength);
}

function trimTrailingTitlePunctuation(value: string) {
  return value
    .replace(/[\s|,;:\u2013\u2014\uFF0C\uFF1B\uFF1A-]+$/u, "")
    .trimEnd();
}

export function buildMetaDescription(
  value: string | null | undefined,
  fallback = defaultSiteDescription,
  maxLength = 160,
) {
  const preferred = normalizeWhitespace(value ?? "");
  const fallbackValue = normalizeWhitespace(fallback);
  return truncateDescription(preferred || fallbackValue, maxLength);
}

export function buildMetadataTitle({
  pageTitle,
  brand = siteName,
  maxLength = 68,
}: MetadataTitleInput) {
  const normalizedPageTitle = normalizeWhitespace(pageTitle);
  const normalizedBrand = normalizeWhitespace(brand);
  const pageTitleLower = normalizedPageTitle.toLowerCase();
  const brandLower = normalizedBrand.toLowerCase();

  if (!normalizedPageTitle) return normalizedBrand;
  if (pageTitleLower === brandLower) return normalizedBrand;
  if (brandLower.includes(pageTitleLower)) return normalizedBrand;

  for (const separator of [" | ", " - ", " — ", " – "]) {
    const brandSuffix = `${separator}${normalizedBrand}`.toLowerCase();
    if (pageTitleLower.endsWith(brandSuffix)) {
      const baseTitle = normalizedPageTitle
        .slice(
          0,
          normalizedPageTitle.length -
            separator.length -
            normalizedBrand.length,
        )
        .trim();
      return baseTitle ? `${baseTitle} | ${normalizedBrand}` : normalizedBrand;
    }
  }

  if (pageTitleLower.includes(brandLower)) {
    return normalizedPageTitle;
  }

  const fullTitle = `${normalizedPageTitle} | ${normalizedBrand}`;
  if (fullTitle.length <= maxLength) return fullTitle;

  const reservedLength = ` | ${normalizedBrand}`.length;
  const truncatedPageTitle = trimTrailingTitlePunctuation(
    truncateText(
      normalizedPageTitle,
      Math.max(12, maxLength - reservedLength),
    ),
  );
  return `${truncatedPageTitle} | ${normalizedBrand}`;
}

export function buildListingMetadataTitle(
  kind: ListingMetadataKind,
  locale: Locale,
  brand = siteName,
) {
  const zhTitles: Record<ListingMetadataKind, string> = {
    software: "最热门AI工具、热门AI软件与高频效率产品",
    "account-services": "AI账号服务咨询、订阅说明与合规边界",
    "skill-learning": "AI教程与实战指南、AI工具与本地部署教程",
    "ai-news": "AI资讯、趋势解读与工具落地指南",
    pricing: "AI工具报价、购买流程与交付说明",
    tutorials: "AI工具教程、软件配置与使用指南",
  };
  const enTitles: Record<ListingMetadataKind, string> = {
    software: "Most Popular AI Tools And Productivity Software",
    "account-services": "AI Account Service Guidance and Compliance",
    "skill-learning": "Practical AI Tutorials and Guides",
    "ai-news": "AI News, Trend Insights, and Tool Decisions",
    pricing: "AI Tool Pricing, Purchase, and Delivery Guide",
    tutorials: "AI Tool Tutorials, Setup, and Workflow Guides",
  };

  return buildMetadataTitle({
    pageTitle: locale === "en" ? enTitles[kind] : zhTitles[kind],
    brand,
    maxLength: 68,
  });
}

export function buildHomeMetadataTitle(locale: Locale, brand = siteName) {
  const scope =
    locale === "en"
      ? "AI Tools, News, Account Services & Courses"
      : "AI工具、AI资讯、账号服务与技能课程";
  return truncateText(
    `${normalizeWhitespace(brand)} | ${scope}`,
    locale === "en" ? 62 : 64,
  );
}

export function buildHomeMetaDescription(
  locale: Locale,
  customIntro?: string | null,
) {
  const intro = normalizeWhitespace(customIntro ?? "");
  const defaultBrandSentence = normalizeWhitespace(defaultSiteDescription);
  const hasExplicitBrand = /enhe/i.test(intro) || (locale === "zh" && intro.includes("恩禾"));
  const hasExplicitCategory =
    locale === "en" ? /\bAI (?:tools?|software|apps?)\b/i.test(intro) : /AI\s*(?:工具|软件|应用)/i.test(intro);
  const shouldUseTemplate =
    !intro ||
    intro === defaultBrandSentence ||
    intro.length < (locale === "en" ? 100 : 50) ||
    !hasExplicitBrand ||
    !hasExplicitCategory;

  if (!shouldUseTemplate) {
    return buildMetaDescription(
      intro,
      defaultSiteDescription,
      locale === "en" ? 155 : 150,
    );
  }

  if (locale === "en") {
    return "ENHE AI helps users apply AI to real tasks: work faster, create content, organize material, learn skills, choose tools, and keep privacy clearer.";
  }

  return "ENHE AI 帮助用户把 AI 工具用到真实任务里：更快完成工作、创作内容、整理资料、学习技能和解决工具选择问题；需要处理敏感素材、长期流程或隐私边界时，优先提供安全、隐私和稳定的可控路径。";
}

const revenuePageSeoTitles = {
  "ultimate-edition-ai-video-generation-suite": {
    zh: "Ultimate Edition 本地AI视频生成",
    en: "Ultimate Edition Local AI Video Generator",
  },
  "infinitetalk-ai": {
    zh: "InfiniteTalk AI数字人口播",
    en: "InfiniteTalk AI Talking Avatar Generator",
  },
  "ai-prompt-management-system-418-bilingual-prompts-for-writing-seo-and-ai-creation": {
    zh: "418双语提示词 AI提示词管理工具",
    en: "418 Bilingual AI Prompt Management Tool",
  },
  "ai-prompt-management": {
    zh: "AI提示词管理教程",
    en: "AI Prompt Management Guide",
  },
  "high-frequency-ai-prompts-for-work-learning-and-teaching": {
    zh: "高频AI提示词模板",
    en: "AI Prompt Templates for Work and Learning",
  },
  "chatgpt-plus-100": {
    zh: "ChatGPT Plus订阅指南",
    en: "ChatGPT Plus Subscription Guide",
  },
  "chatgpt-codex-dalle": {
    zh: "ChatGPT Codex与DALL-E指南",
    en: "ChatGPT Codex and DALL-E Guide",
  },
  "ai-monetization-side-hustle-course": {
    zh: "AI副业课程",
    en: "AI Side Hustle Course",
  },
  "local-ai-voice-generator-for-voiceover-materials": {
    zh: "本地AI配音工具",
    en: "Local AI Voice Generator",
  },
  "faceswap-studio-ai": {
    zh: "FaceSwap Studio 本地AI人像合成",
    en: "FaceSwap Studio Local AI Portrait Tool",
  },
  "windows-ai": {
    zh: "Windows AI桌面助手",
    en: "Windows AI Desktop Assistant",
  },
} as const;

export function getRevenuePageSeoTitle(slug: string, locale: Locale) {
  return revenuePageSeoTitles[
    slug as keyof typeof revenuePageSeoTitles
  ]?.[locale];
}

export function buildListingMetaDescription(
  kind: ListingMetadataKind,
  locale: Locale,
) {
  const zhDescriptions = {
    software:
      "浏览最热门AI工具和高频效率软件，按办公效率、文件处理、系统实用、数据分析、本地AI应用等场景筛选产品，比较价格、教程、案例、交付方式和适用边界，快速找到适合日常工作流的可靠工具。",
    "account-services":
      "了解AI工具访问方式、订阅咨询、账号使用支持、交付边界和平台规则。先确认任务、服务范围、价格、售后、合规提醒、使用风险和替代路径，再决定是否咨询或购买，避免把服务当成绕过规则的捷径。",
    "skill-learning":
      "阅读ENHE AI教程与实战指南，覆盖AI工具使用、视频图片语音生成、AI智能体、自动化工作流、本地部署、ComfyUI及常用模型操作，按真实任务查找已发布教程和课程，并结合操作步骤、常见问题和适用边界减少试错。",
    "ai-news":
      "阅读AI前沿资讯和趋势解读，理解工具、模型和平台变化对工作效率、内容创作、资料整理、学习技能和安全使用的实际影响。结合来源、时间、相关工具和下一步行动，判断这条信息是否值得普通AI用户跟进。",
    pricing:
      "查看ENHE AI软件、课程与账号服务报价结构、购买流程、权益说明、支付审核、交付方式、售后边界、退款规则、适合人群和服务范围，购买前先确认价格、使用方式、交付条件、风险提醒和是否适合当前任务。",
    tutorials:
      "阅读ENHE AI工具教程、软件使用指南、AI技能实战步骤、常见问题和工作流案例，快速掌握下载、配置、使用和复盘方法，把工具能力转化为可执行成果，减少购买、部署或学习前的试错时间成本。",
  } as const;
  const enDescriptions = {
    software:
      "Browse popular AI software tools for office workflows, file processing, system utilities, data analysis, and local AI apps. Compare fit.",
    "account-services":
      "Browse AI account service guidance for subscriptions, access notes, compliance reminders, delivery scope, support boundaries, pricing, and safer use.",
    "skill-learning":
      "Read practical ENHE AI tutorials for tools, media generation, AI agents, automation workflows, local deployment, ComfyUI, and widely used AI models.",
    "ai-news":
      "Follow global AI agents, open models, local deployment, AI tools, tutorials, and industry trends so creators can turn AI changes into productivity.",
    pricing:
      "Review ENHE AI software, course, and account service pricing, payment review, delivery boundaries, support scope, and refund rules before purchase.",
    tutorials:
      "Read ENHE AI tutorials, software guides, workflow steps, setup notes, and troubleshooting tips to turn AI tools into repeatable creator outcomes.",
  } as const;

  return locale === "en" ? enDescriptions[kind] : zhDescriptions[kind];
}

export function buildTopicMetaDescription({
  title,
  description,
  locale,
  kind = "ai-topic",
  maxLength = 150,
}: TopicMetaDescriptionInput) {
  const normalizedDescription = normalizeWhitespace(description ?? "");
  const normalizedTitle = normalizeWhitespace(title);
  const minLength = locale === "en" ? 110 : 80;

  if (normalizedDescription.length >= minLength) {
    return buildMetaDescription(normalizedDescription, defaultSiteDescription, maxLength);
  }

  const fallbackSource =
    normalizedDescription ||
    (locale === "en"
      ? `${normalizedTitle || "AI topic"} guide.`
      : `${normalizedTitle || "AI主题"}指南。`);

  if (locale === "en") {
    const suffix =
      kind === "ai-news-topic"
        ? "On ENHE AI, review sources, dates, related news, tools, tutorials, and next steps so everyday AI users can judge the practical impact."
        : "On ENHE AI, review use cases, decision criteria, FAQs, related tools, courses, and next steps before choosing a practical AI workflow.";

    return buildMetaDescription(`${fallbackSource} ${suffix}`, defaultSiteDescription, maxLength);
  }

  const suffix =
    kind === "ai-news-topic"
      ? "在 ENHE AI 查看来源、时间、相关资讯、工具、教程和下一步行动建议，判断它对工作效率、内容创作、学习或账号合规是否有影响。"
      : "在 ENHE AI 查看适用场景、对比维度、常见问题、相关工具、课程和下一步路径，先判断它是否能解决当前工作、创作或学习任务。";

  return buildMetaDescription(`${fallbackSource} ${suffix}`, defaultSiteDescription, maxLength);
}

const accountServiceRiskWords =
  /(账号购买|账号代充|代充需求|官方代充|低价稳定|永久可用|共享账号|破解|绕过限制|保证不封号|黑卡|免风控)/i;

const accountServiceRiskTermPatterns = [
  /\u5b98\u65b9\u4ee3\u5145/i,
  /\u4ee3\u5145(?:\u9700\u6c42|\u670d\u52a1|\u5957\u9910)?/i,
  /\u5145\u503c/i,
  /\u4f4e\u4ef7(?:\u7a33\u5b9a)?/i,
  /\u7a33\u5b9a(?:\u6536\u53d1|\u4f7f\u7528|\u53ef\u7528|\u4f1a\u5458)?/i,
  /\u6c38\u4e45\u53ef\u7528/i,
  /\u5171\u4eab\u8d26\u53f7/i,
  /\u5171\u4eab/i,
  /\u72ec\u4eab\u8d26\u53f7/i,
  /\u72ec\u4eab/i,
  /\u7834\u89e3/i,
  /\u7ed5\u8fc7\u9650\u5236/i,
  /\u4fdd\u8bc1\u4e0d\u5c01\u53f7/i,
  /\u4e0d\u5c01\u53f7/i,
  /\u9ed1\u5361/i,
  /\u514d\u98ce\u63a7/i,
  /\u8d28\u4fdd/i,
  /\u6210\u54c1\u53f7/i,
  /\u5b66\u751f\u53f7/i,
  /\u975e\u5b66\u751f/i,
  /\u4fdd\u53f7/i,
  /\u5b98\u65b9\s*(?:Gemini|ChatGPT|Claude|OpenAI|Google|Gmail|Perplexity|Sora|Midjourney|AI|\u8d26\u53f7)/i,
  /official\s+(?:account|recharge|top[-\s]?up|subscription)/i,
  /exclusive\s+account/i,
  /shared\s+account/i,
  /cracked|bypass|black\s*card|no\s*ban|guaranteed|warranty\s+included|stable\s+membership/i,
  /top[-\s]?up|recharge/i,
] as const;

const safeZhAccountServiceCopy =
  "AI\u5de5\u5177\u8ba2\u9605\u4e0e\u8d26\u53f7\u4f7f\u7528\u652f\u6301\uff0c\u63d0\u4f9b\u8ba2\u9605\u54a8\u8be2\u3001\u8d26\u53f7\u4f7f\u7528\u5efa\u8bae\u3001\u4ea4\u4ed8\u8bf4\u660e\u4e0e\u552e\u540e\u8fb9\u754c\u3002\u4f7f\u7528\u524d\u8bf7\u9075\u5b88\u5bf9\u5e94\u5e73\u53f0\u89c4\u5219\uff1b\u5982\u6d89\u53ca\u7b2c\u4e09\u65b9\u5e73\u53f0\uff0c\u8bf7\u4ee5\u5b98\u65b9\u653f\u7b56\u4e3a\u51c6\u3002";
const safeEnAccountServiceCopy =
  "AI tool subscription and account usage support with access guidance, delivery notes, and compliance reminders. Please follow the rules of each platform; for third-party services, the official policy should prevail.";

export function hasAccountServiceRiskTerms(value: string | null | undefined) {
  const normalized = normalizeWhitespace(value ?? "");
  return (
    Boolean(normalized) &&
    accountServiceRiskTermPatterns.some((pattern) => pattern.test(normalized))
  );
}

export function sanitizeAccountServiceCopy(
  value: string | null | undefined,
  locale: Locale = "zh",
) {
  const normalized = normalizeWhitespace(value ?? "");
  const riskyPattern =
    /(官方代充|代充需求|代充|低价稳定|永久可用|共享账号|破解|绕过限制|保证不封号|黑卡|免风控|无封号|掉订阅|账号\s*\+\s*密码|提供账号|充值|recharge|shared account|cracked|bypass|black card|no ban|guaranteed|质保|成品号|非学生|学生号|学生|保号|售后保障|membership access|warranty included|stable membership)/i;

  if (!normalized) return "";
  if (
    !riskyPattern.test(normalized) &&
    !accountServiceRiskWords.test(normalized) &&
    !hasAccountServiceRiskTerms(normalized)
  )
    return normalized;

  if (locale === "en") {
    return safeEnAccountServiceCopy;
  }

  return safeZhAccountServiceCopy;
}

function isGenericAccountServiceMetaDescription(
  value: string,
  locale: Locale,
) {
  if (locale === "en") {
    return (
      value === safeEnAccountServiceCopy ||
      /^AI tool subscription and account usage support\b/i.test(value)
    );
  }

  return (
    value === safeZhAccountServiceCopy ||
    (value.includes("\u8ba2\u9605\u54a8\u8be2") &&
      value.includes("\u5e73\u53f0\u89c4\u5219"))
  );
}

function buildUniqueAccountServiceMetaDescription(
  primaryName: string,
  locale: Locale,
) {
  if (locale === "en") {
    return `${primaryName} account service guidance: review access paths, delivery notes, support boundaries, pricing context, and platform-policy reminders before use.`;
  }

  return `${primaryName} AI\u8d26\u53f7\u670d\u52a1\u54a8\u8be2\uff1a\u63d0\u4f9bAI\u5de5\u5177\u8ba2\u9605\u4e0e\u8d26\u53f7\u4f7f\u7528\u652f\u6301\uff0c\u5305\u542b\u8bbf\u95ee\u8def\u5f84\u3001\u4ea4\u4ed8\u8bf4\u660e\u3001\u4ef7\u683c\u8303\u56f4\u3001\u552e\u540e\u8fb9\u754c\u3001\u5e73\u53f0\u89c4\u5219\u548c\u5408\u89c4\u63d0\u9192\uff0c\u8d2d\u4e70\u6216\u54a8\u8be2\u524d\u5148\u5224\u65ad\u662f\u5426\u9002\u5408\u5f53\u524d\u4efb\u52a1\u3002`;
}

function resolveToolTitleNames(
  name: string,
  englishName: string | null | undefined,
  locale: Locale,
) {
  const normalizedName = normalizeWhitespace(name);
  const normalizedEnglishName = normalizeWhitespace(englishName ?? "");
  const hasDistinctEnglishName =
    normalizedEnglishName &&
    normalizedEnglishName.toLowerCase() !== normalizedName.toLowerCase() &&
    !normalizedName
      .toLowerCase()
      .includes(normalizedEnglishName.toLowerCase()) &&
    !normalizedEnglishName.toLowerCase().includes(normalizedName.toLowerCase());

  if (locale === "en") {
    return {
      primaryName: normalizedEnglishName || normalizedName,
      secondaryName: hasDistinctEnglishName ? normalizedName : "",
    };
  }

  return {
    primaryName: normalizedName || normalizedEnglishName,
    secondaryName: hasDistinctEnglishName ? normalizedEnglishName : "",
  };
}

function splitToolTypeFromName(name: string) {
  const normalized = normalizeWhitespace(name);
  const separatorMatch = normalized.match(
    /^(.+?)\s[-|]\s(AI (?:Software App|Account Service|Skill Course))$/i,
  );

  if (!separatorMatch) {
    return {
      toolName: normalized,
      typeName: "",
    };
  }

  return {
    toolName: normalizeWhitespace(separatorMatch[1]),
    typeName: normalizeWhitespace(separatorMatch[2]),
  };
}

function resolveToolTypeLabel(
  type: ToolMetaDescriptionInput["type"],
  locale: Locale,
) {
  if (locale === "en") {
    if (type === "online") return "AI account service";
    if (type === "skill_learning") return "AI skill course";
    return "AI software app";
  }

  if (type === "online") return "AI账号服务";
  if (type === "skill_learning") return "AI技能课程";
  return "AI软件应用";
}

function hasControlledAiWorkflowCue(value: string) {
  return /本地部署|私有化|不受限制|无限制|随心所欲|随时所欲|离线|隐私|敏感素材|private|local deployment|unrestricted/i.test(
    value,
  );
}

function buildControlledAiWorkflowDescription(
  primaryName: string,
  brand: string,
  locale: Locale,
) {
  if (locale === "en") {
    return `${primaryName} helps users build safer, more private, stable, and controlled AI workflows. Review pricing, tutorials, delivery scope, and system requirements on ${brand} before use.`;
  }

  return `${primaryName}，适合需要安全、隐私、稳定、可控 AI 流程的用户。购买前在 ${brand} 确认价格、教程、交付方式、设备要求和隐私边界。`;
}

function ensureChineseSentence(value: string) {
  const normalized = normalizeWhitespace(value);
  if (!normalized || /[。！？!?；;.]$/u.test(normalized)) return normalized;
  return `${normalized.replace(/[，,：:\s]+$/u, "")}。`;
}

export function buildToolMetadataTitle({
  name,
  englishName,
  brand = siteName,
  maxLength,
  locale = "zh",
}: BuildTitleInput) {
  const targetMaxLength = maxLength ?? (locale === "en" ? 58 : 42);
  const { primaryName, secondaryName } = resolveToolTitleNames(
    name,
    englishName,
    locale,
  );
  const splitTitle =
    locale === "en"
      ? splitToolTypeFromName(primaryName)
      : { toolName: primaryName, typeName: "" };

  if (locale === "en" && splitTitle.typeName) {
    const pageTitleWithType = `${splitTitle.toolName} | ${splitTitle.typeName}`;
    if (`${pageTitleWithType} | ${brand}`.length <= targetMaxLength) {
      return buildMetadataTitle({
        pageTitle: pageTitleWithType,
        brand,
        maxLength: targetMaxLength,
      });
    }
  }

  const primaryTitle = splitTitle.toolName || primaryName;
  const preferredTitle = secondaryName
    ? `${primaryTitle} (${secondaryName})`
    : primaryTitle;
  const compactTitle = buildMetadataTitle({
    pageTitle: primaryTitle,
    brand,
    maxLength: targetMaxLength,
  });
  const fullTitle = buildMetadataTitle({
    pageTitle: preferredTitle,
    brand,
    maxLength: targetMaxLength,
  });

  if (
    secondaryName &&
    fullTitle !== compactTitle &&
    preferredTitle.length + ` | ${brand}`.length > targetMaxLength
  ) {
    return compactTitle;
  }

  if (fullTitle.length <= targetMaxLength) return fullTitle;
  if (compactTitle.length <= targetMaxLength) return compactTitle;

  const reservedLength = ` | ${brand}`.length;
  return `${trimTrailingTitlePunctuation(
    truncateText(primaryTitle, Math.max(12, targetMaxLength - reservedLength)),
  )} | ${brand}`;
}

export function buildToolMetaDescription({
  name,
  englishName,
  description,
  brand = siteName,
  locale = "zh",
  type = "software",
  maxLength = 150,
}: ToolMetaDescriptionInput) {
  const normalizedDescription =
    type === "online"
      ? sanitizeAccountServiceCopy(description, locale)
      : normalizeWhitespace(description ?? "");
  const { primaryName } = resolveToolTitleNames(name, englishName, locale);
  const typeLabel = resolveToolTypeLabel(type, locale);
  const targetMaxLength = Math.min(maxLength, locale === "en" ? 135 : 120);
  const shortDescriptionLimit = locale === "en" ? 95 : 90;
  const shouldNameGenericAccountServiceCopy =
    type === "online" &&
    normalizedDescription &&
    isGenericAccountServiceMetaDescription(normalizedDescription, locale);

  if (locale === "en") {
    if (normalizedDescription) {
      if (hasControlledAiWorkflowCue(normalizedDescription)) {
        return buildMetaDescription(
          buildControlledAiWorkflowDescription(primaryName, brand, locale),
          defaultSiteDescription,
          targetMaxLength,
        );
      }

      if (
        !shouldNameGenericAccountServiceCopy &&
        normalizedDescription.length < shortDescriptionLimit
      ) {
        return buildMetaDescription(
          `${normalizedDescription} On ${brand}, review ${primaryName} features, pricing, tutorials, access notes, and creator workflow fit before use.`,
          defaultSiteDescription,
          targetMaxLength,
        );
      }

      return buildMetaDescription(
        shouldNameGenericAccountServiceCopy
          ? buildUniqueAccountServiceMetaDescription(primaryName, locale)
          : normalizedDescription,
        defaultSiteDescription,
        targetMaxLength,
      );
    }

    return buildMetaDescription(
      `${primaryName}: ${typeLabel} on ${brand}. Review features, pricing, tutorials, and access.`,
      defaultSiteDescription,
      targetMaxLength,
    );
  }

  if (normalizedDescription) {
    if (shouldNameGenericAccountServiceCopy) {
      return buildMetaDescription(
        buildUniqueAccountServiceMetaDescription(primaryName, locale),
        defaultSiteDescription,
        targetMaxLength,
      );
    }

    if (hasControlledAiWorkflowCue(normalizedDescription)) {
      return buildMetaDescription(
        buildControlledAiWorkflowDescription(primaryName, brand, locale),
        defaultSiteDescription,
        targetMaxLength,
      );
    }

    const naturalDescription = ensureChineseSentence(normalizedDescription);
    const compactDescription =
      normalizedDescription.length < 48
        ? `${naturalDescription}相关价格、教程、交付方式、隐私边界与适用任务可在 ${brand} 核对，便于购买前判断是否符合当前创作或效率工作流。`
        : naturalDescription;

    return buildMetaDescription(
      compactDescription,
      defaultSiteDescription,
      targetMaxLength,
    );
  }

  return buildMetaDescription(
    `了解${primaryName}的价格、教程、交付方式、使用边界与适用任务，并结合当前需求判断这款${typeLabel}是否适合；相关信息可在 ${brand} 核对。`,
    defaultSiteDescription,
    targetMaxLength,
  );
}

export function buildPageMetadata({
  title,
  description,
  path = "/",
  image,
  locale = "zh_CN",
  type = "website",
  localeKey = locale === "en_US" ? "en" : "zh",
  languageAlternates,
}: PageMetadataInput): Metadata {
  const finalDescription = buildMetaDescription(
    description,
    defaultSiteDescription,
    150,
  );
  const canonicalPath = buildLocalePath(path, localeKey);
  const canonical = absoluteUrl(canonicalPath);
  const imagePath = image ?? defaultOgImage;
  const imageUrl = absoluteUrl(imagePath);
  const isDefaultOgImage = imagePath === defaultOgImage;

  return {
    title,
    description: finalDescription,
    other: {
      "content-language": locale === "en_US" ? "en-US" : "zh-CN",
    },
    alternates: {
      canonical,
      languages: languageAlternates ?? buildLanguageAlternates(path),
    },
    openGraph: {
      title,
      description: finalDescription,
      url: canonical,
      siteName,
      images: [
        {
          url: imageUrl,
          alt: title,
          ...(isDefaultOgImage ? { width: 1200, height: 630 } : {}),
        },
      ],
      locale,
      type,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: finalDescription,
      images: [imageUrl],
    },
  };
}

export function buildOrganizationSchema({
  id,
  name,
  alternateName = [],
  logo,
  url = absoluteUrl("/"),
  description,
  sameAs = [],
  knowsAbout = [],
  subjectOf = [],
  contactPoint,
  schemaType = "Organization",
}: OrganizationSchemaInput) {
  const organizationId = absoluteUrl("/#organization");
  const siteHost = new URL(getSiteBaseUrl()).hostname.replace(/^www\./, "");
  const externalSameAs = sameAs.filter((profileUrl) => {
    try {
      const profileHost = new URL(profileUrl).hostname.replace(/^www\./, "");
      return profileHost !== siteHost;
    } catch {
      return false;
    }
  });

  return {
    "@context": "https://schema.org",
    "@type": schemaType,
    "@id": id ?? organizationId,
    name,
    ...(alternateName.length ? { alternateName } : {}),
    url,
    ...(description ? { description: buildMetaDescription(description) } : {}),
    ...(logo ? { logo: absoluteUrl(logo) } : {}),
    ...(externalSameAs.length ? { sameAs: externalSameAs } : {}),
    ...(knowsAbout.length ? { knowsAbout } : {}),
    ...(subjectOf.length
      ? {
          subjectOf: subjectOf.map((resource) => ({
            "@type": "CreativeWork",
            name: resource.name,
            url: absoluteUrl(resource.url),
            ...(resource.encodingFormat
              ? { encodingFormat: resource.encodingFormat }
              : {}),
          })),
        }
      : {}),
    ...(contactPoint?.email
      ? {
          contactPoint: {
            "@type": "ContactPoint",
            email: contactPoint.email,
            contactType: contactPoint.contactType ?? "customer support",
            availableLanguage: contactPoint.availableLanguage ?? [
              "zh-CN",
              "en-US",
            ],
          },
        }
      : {}),
  };
}

export function buildWebsiteSchema({
  id,
  name,
  description,
  url = absoluteUrl("/"),
  inLanguage = "zh-CN",
  searchPathTemplate = null,
  publisherId,
  schemaType = "WebSite",
}: WebSiteSchemaInput) {
  return {
    "@context": "https://schema.org",
    "@type": schemaType,
    ...(id ? { "@id": id } : {}),
    name,
    url,
    description: buildMetaDescription(description),
    inLanguage,
    publisher: {
      "@type": "Organization",
      "@id": publisherId ?? absoluteUrl("/#organization"),
      name,
    },
    ...(searchPathTemplate
      ? {
          potentialAction: {
            "@type": "SearchAction",
            target: absoluteUrl(searchPathTemplate),
            "query-input": "required name=search_term_string",
          },
        }
      : {}),
  };
}

export function buildBreadcrumbSchema({
  items,
  schemaType = "BreadcrumbList",
}: BreadcrumbSchemaInput) {
  return {
    "@context": "https://schema.org",
    "@type": schemaType,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function buildFaqSchema({
  items,
  schemaType = "FAQPage",
}: FaqSchemaInput) {
  return {
    "@context": "https://schema.org",
    "@type": schemaType,
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

function buildOfferData(
  url: string,
  currency: string,
  priceSpecs: OfferSpecInput[],
) {
  const normalizedSpecs = priceSpecs
    .map((spec) => ({
      ...spec,
      price: Number(spec.price),
    }))
    .filter((spec) => Number.isFinite(spec.price) && spec.price > 0);

  if (!normalizedSpecs.length) return {};

  if (normalizedSpecs.length === 1) {
    return {
      offers: {
        "@type": "Offer",
        name: normalizedSpecs[0].name,
        price: normalizedSpecs[0].price.toFixed(2),
        priceCurrency: currency,
        availability: "https://schema.org/InStock",
        url: absoluteUrl(url),
      },
    };
  }

  const prices = normalizedSpecs.map((spec) => spec.price);

  return {
    offers: {
      "@type": "AggregateOffer",
      lowPrice: Math.min(...prices).toFixed(2),
      highPrice: Math.max(...prices).toFixed(2),
      offerCount: String(normalizedSpecs.length),
      priceCurrency: currency,
      availability: "https://schema.org/InStock",
      url: absoluteUrl(url),
    },
  };
}

export function buildToolStructuredData({
  schemaType,
  name,
  description,
  url,
  image,
  brand = siteName,
  category,
  operatingSystem,
  locale = "zh-CN",
  price,
  currency = "CNY",
  softwareVersion,
  priceSpecs = [],
  aggregateRating = null,
}: ToolStructuredDataInput) {
  const normalizedPriceSpecs = priceSpecs
    .map((spec) => ({
      name: normalizeWhitespace(spec.name),
      price: Number(spec.price),
    }))
    .filter(
      (spec) => spec.name && Number.isFinite(spec.price) && spec.price > 0,
    );
  const baseSchema = {
    "@context": "https://schema.org",
    "@type": schemaType,
    name,
    description: buildMetaDescription(description),
    url: absoluteUrl(url),
    inLanguage: locale,
    ...(image ? { image: absoluteUrl(image) } : {}),
    ...(aggregateRating &&
    Number.isFinite(aggregateRating.ratingValue) &&
    Number.isFinite(aggregateRating.reviewCount) &&
    aggregateRating.reviewCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: aggregateRating.ratingValue.toFixed(1),
            reviewCount: String(aggregateRating.reviewCount),
          },
        }
      : {}),
  };

  const offer =
    typeof price === "number"
      ? {
          offers: {
            "@type": "Offer",
            price: price.toFixed(2),
            priceCurrency: currency,
            availability: "https://schema.org/InStock",
            url: absoluteUrl(url),
          },
        }
      : {};
  const structuredOffers = normalizedPriceSpecs.length
    ? buildOfferData(url, currency, normalizedPriceSpecs)
    : offer;

  if (schemaType === "SoftwareApplication") {
    return {
      ...baseSchema,
      applicationCategory: category ?? "BusinessApplication",
      operatingSystem: operatingSystem ?? "Web",
      ...(softwareVersion ? { softwareVersion } : {}),
      brand: {
        "@type": "Brand",
        name: brand,
      },
      ...structuredOffers,
    };
  }

  if (schemaType === "Service") {
    return {
      ...baseSchema,
      serviceType: category ?? "AI account service",
      provider: {
        "@type": "Organization",
        name: brand,
      },
      areaServed: "CN",
      ...(normalizedPriceSpecs.length
        ? {
            hasOfferCatalog: {
              "@type": "OfferCatalog",
              name: `${name} offers`,
              itemListElement: normalizedPriceSpecs.map((spec) => ({
                "@type": "Offer",
                name: spec.name,
                price: spec.price.toFixed(2),
                priceCurrency: currency,
                availability: "https://schema.org/InStock",
                url: absoluteUrl(url),
              })),
            },
          }
        : {}),
      ...structuredOffers,
    };
  }

  return {
    ...baseSchema,
    provider: {
      "@type": "Organization",
      name: brand,
    },
    educationalLevel: category ?? "Professional",
    courseMode: "online",
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "online",
      inLanguage: locale,
      ...structuredOffers,
    },
    ...structuredOffers,
  };
}

export function buildProductStructuredData({
  name,
  description,
  url,
  image,
  brand = siteName,
  category,
  price,
  currency = "CNY",
  priceSpecs = [],
}: ProductStructuredDataInput) {
  const normalizedPriceSpecs = priceSpecs
    .map((spec) => ({
      name: normalizeWhitespace(spec.name),
      price: Number(spec.price),
    }))
    .filter(
      (spec) => spec.name && Number.isFinite(spec.price) && spec.price > 0,
    );
  const offer =
    typeof price === "number" && Number.isFinite(price) && price > 0
      ? {
          offers: {
            "@type": "Offer",
            price: price.toFixed(2),
            priceCurrency: currency,
            availability: "https://schema.org/InStock",
            url: absoluteUrl(url),
          },
        }
      : {};

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description: buildMetaDescription(description),
    url: absoluteUrl(url),
    ...(image ? { image: absoluteUrl(image) } : {}),
    ...(category ? { category } : {}),
    brand: {
      "@type": "Brand",
      name: brand,
    },
    ...(normalizedPriceSpecs.length
      ? buildOfferData(url, currency, normalizedPriceSpecs)
      : offer),
  };
}

export function stringifyStructuredData(data: Record<string, unknown>) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
