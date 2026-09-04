import type { Locale } from "@/lib/i18n";
import {
  hasAccountServiceRiskTerms,
  sanitizeAccountServiceCopy,
} from "@/lib/seo";

type ToolType = "software" | "online" | "skill_learning";

type LocalizedToolInput = {
  slug: string;
  name: string;
  englishName?: string | null;
  shortDescription?: string | null;
  content?: string | null;
  type: ToolType;
  categoryName?: string | null;
};

type LocalizedFaqInput = {
  id: string;
  question: string;
  answer: string;
};

type LocalizedTutorialInput = {
  id: string;
  title: string;
  content: string;
  notes?: string | null;
  commonErrors?: string | null;
  videoUrl?: string | null;
};

type LocalizedTagInput = {
  tag: {
    id: string;
    name: string;
  };
};

const englishWordOverrides: Record<string, string> = {
  ai: "AI",
  enhe: "ENHE",
  chatgpt: "ChatGPT",
  codex: "Codex",
  dalle: "DALL-E",
  gemini: "Gemini",
  gmail: "Gmail",
  tiktok: "TikTok",
  telegram: "Telegram",
  facebook: "Facebook",
  google: "Google",
  pro: "Pro",
  plus: "Plus",
  studio: "Studio",
  video: "Video",
  audio: "Audio",
};

const generatedSlugPatterns = [
  /^tool-[a-z0-9]{12,}$/i,
  /^auto-local-tool-\d+$/i,
  /^e2e-[a-z0-9-]+$/i,
] as const;

const englishToolContentOverrides: Record<
  string,
  { summary: string; content: string }
> = {
  "local-ai-voice-generator-for-voiceover-materials": {
    summary:
      "Local AI Voice Generator is an offline Windows desktop tool for text-to-speech, authorized voice cloning, voice design, multi-speaker dialogue, and reusable audio asset management.",
    content: [
      "Local AI Voice Generator is an offline Windows desktop application based on the open-source Qwen3-TTS project. It supports text-to-speech, authorized voice cloning, voice design, multi-speaker dialogue, voice management, and model fine-tuning for local audio-production workflows.",
      "Creators can use it to prepare short-video narration, course explanations, product demonstrations, corporate training material, dialogue prototypes, reading material, podcast drafts, and multilingual voice assets. Generated audio is stored in the local output directory, and the interface supports both Chinese and English.",
      "Voice cloning must only be used with audio and voices that you are authorized to process. Review the Windows environment requirements, model setup, storage needs, and delivery instructions before purchase or installation.",
    ].join("\n\n"),
  },
};

const cjkPattern = /[\u3400-\u9fff]/;
const latinWordPattern = /[A-Za-z][A-Za-z0-9'+-]*/g;
const sentenceBreakPattern = /[。！？!?；;\n]+/;

const localizedBlockPattern = /\[\[(zh|en)\]\]([\s\S]*?)\[\[\/\1\]\]/g;

function normalizeText(value: string | null | undefined) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function normalizeRichText(value: string | null | undefined) {
  return (
    value
      ?.replace(/\r\n?/g, "\n")
      .replace(/\u00a0/g, " ")
      .split("\n")
      .map((line) => line.replace(/[ \t]+/g, " ").trim())
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim() ?? ""
  );
}

function isPlaceholderSummary(value: string) {
  const normalized = normalizeText(value).toLowerCase();
  if (!normalized) return true;

  return [
    "draft",
    "tbd",
    "todo",
    "coming soon",
    "placeholder",
    "test",
    "n/a",
  ].includes(normalized);
}

function extractLocalizedBlocks(value: string | null | undefined) {
  const source = value ?? "";
  const blocks: Partial<Record<Locale, string>> = {};
  let hasMatch = false;

  for (const match of source.matchAll(localizedBlockPattern)) {
    const locale = match[1] as Locale;
    const content = match[2]?.trim() ?? "";
    if (!content) continue;
    blocks[locale] = content;
    hasMatch = true;
  }

  return {
    hasMatch,
    blocks,
  };
}

function extractImplicitLocalizedBlocks(value: string | null | undefined) {
  const source = normalizeRichText(value);
  const lines = source.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return null;

  const englishStart = lines.findIndex((line, index) => {
    if (index === 0 || hasCjk(line) || countLatinWords(line) < 6) return false;

    const chineseSection = lines.slice(0, index).join(" ");
    const englishSection = lines.slice(index).join(" ");
    return hasCjk(chineseSection) && !hasCjk(englishSection);
  });
  if (englishStart < 1) return null;

  return {
    zh: lines.slice(0, englishStart).join("\n\n"),
    en: lines.slice(englishStart).join("\n\n"),
  } satisfies Record<Locale, string>;
}

function resolveLocalizedInlineCopy(
  value: string | null | undefined,
  locale: Locale,
  normalizer: (value: string | null | undefined) => string,
) {
  const localized = extractLocalizedBlocks(value);
  if (!localized.hasMatch) {
    const implicit = extractImplicitLocalizedBlocks(value);
    return normalizer(implicit?.[locale] ?? value);
  }

  if (locale === "en") {
    return normalizer(localized.blocks.en);
  }

  return normalizer(localized.blocks.zh ?? localized.blocks.en);
}

function sanitizeAccountServiceRichCopy(
  value: string | null | undefined,
  locale: Locale,
) {
  const richText = normalizeRichText(value);
  if (!richText) return "";

  const compactText = normalizeText(value);
  const sanitized = sanitizeAccountServiceCopy(compactText, locale);
  return sanitized === compactText ? richText : sanitized;
}

function getDefaultToolLabel(type: ToolType, locale: Locale) {
  if (locale === "en") {
    if (type === "online") return "AI Account Service";
    if (type === "skill_learning") return "AI Skill Course";
    return "AI Software App";
  }

  if (type === "online") return "AI账号服务";
  if (type === "skill_learning") return "AI技能课程";
  return "AI软件应用";
}

function getEnglishSentenceToolLabel(type: ToolType) {
  if (type === "online") return "AI account service";
  if (type === "skill_learning") return "AI skill course";
  return "AI software app";
}

function hasCjk(value: string) {
  return cjkPattern.test(value);
}

function countLatinWords(value: string) {
  return value.match(latinWordPattern)?.length ?? 0;
}

function isEnglishLike(value: string, minimumWords = 2) {
  const normalized = normalizeText(value);
  if (!normalized) return false;

  const latinWords = countLatinWords(normalized);
  if (latinWords < minimumWords) return false;

  const hasMeaningfulCjk = hasCjk(normalized);
  if (!hasMeaningfulCjk) return true;

  const cjkChars = normalized.match(/[\u3400-\u9fff]/g)?.length ?? 0;
  const latinChars = normalized.match(/[A-Za-z]/g)?.length ?? 0;
  return latinChars > cjkChars * 2;
}

function isLocalizedEnglishCopy(value: string, minimumWords = 2) {
  const normalized = normalizeText(value);
  return (
    Boolean(normalized) &&
    !hasCjk(normalized) &&
    isEnglishLike(normalized, minimumWords)
  );
}

function buildEnglishSummaryFromContent(value: string | null | undefined) {
  const localizedContent = resolveLocalizedInlineCopy(
    value,
    "en",
    normalizeRichText,
  );
  if (!isLocalizedEnglishCopy(localizedContent, 12)) return "";

  const firstParagraph = localizedContent
    .split(/\n{2,}/)
    .map(normalizeText)
    .find((paragraph) => isLocalizedEnglishCopy(paragraph, 6));
  return firstParagraph ?? normalizeText(localizedContent);
}

function isPromotionalName(value: string) {
  const normalized = normalizeText(value);
  return normalized.length > 26 || /[，。,.;；!?！？]/.test(normalized);
}

function hasAccountServiceRiskCopy(value: string | null | undefined) {
  const normalized = normalizeText(value);
  return (
    Boolean(normalized) &&
    (sanitizeAccountServiceCopy(normalized, "zh") !== normalized ||
      hasAccountServiceRiskTerms(normalized))
  );
}

function hasAccountServiceCategoryRisk(value: string | null | undefined) {
  const normalized = normalizeText(value);
  return (
    /账号购买|账号代充|代充|官方代充|低价|永久可用|共享账号|破解|绕过限制|保证不封号|黑卡|免风控/i.test(
      normalized,
    ) || hasAccountServiceRiskTerms(normalized)
  );
}

function extractAccountServiceProductName(
  value: string | null | undefined,
  fallback: string,
) {
  const normalized = normalizeText(value);
  const productMatch = normalized.match(
    /(?:ChatGPT|Gemini|Claude|Midjourney|OpenAI|Google AI|Perplexity|Sora|Runway|Kling|Grok)(?:\s+(?:Plus|Pro|Team|Enterprise|API|Studio|Ultra|Max|Advanced|AI|Google AI Pro|3 Flash))*|[A-Za-z][A-Za-z0-9.+-]*(?:\s+[A-Za-z0-9.+-]+){0,3}/i,
  );
  const productName = normalizeText(productMatch?.[0] ?? "");
  return productName || fallback;
}

function buildAccountServiceEnglishName(
  value: string | null | undefined,
  fallback: string,
) {
  const productName = extractAccountServiceProductName(value, fallback);
  const normalizedProduct = normalizeText(productName);
  if (!normalizedProduct || normalizedProduct === fallback) {
    return "AI Account Service Guidance";
  }
  if (/account service guidance$/i.test(normalizedProduct)) {
    return normalizedProduct;
  }
  if (/account service$/i.test(normalizedProduct)) {
    return `${normalizedProduct} Guidance`;
  }
  if (/guidance$/i.test(normalizedProduct)) {
    return normalizedProduct;
  }
  return `${normalizedProduct} AI Account Service Guidance`;
}

function sanitizeAccountServiceName(
  value: string | null | undefined,
  locale: Locale,
  fallback: string,
) {
  const normalized = normalizeText(value);
  if (!normalized) return fallback;
  if (!hasAccountServiceRiskCopy(normalized)) return normalized;

  if (locale === "en") {
    return buildAccountServiceEnglishName(normalized, "AI");
  }

  return `${extractAccountServiceProductName(normalized, "AI工具")} AI账号服务咨询`;
}

function humanizeSlugWord(word: string) {
  const lower = word.toLowerCase();
  return (
    englishWordOverrides[lower] ??
    `${lower.slice(0, 1).toUpperCase()}${lower.slice(1)}`
  );
}

function humanizeSlug(slug: string) {
  const normalized = normalizeText(slug).replace(/^\/+|\/+$/g, "");
  if (
    !normalized ||
    generatedSlugPatterns.some((pattern) => pattern.test(normalized)) ||
    /\d{8,}/.test(normalized)
  ) {
    return "";
  }

  const parts = normalized.split("-").filter(Boolean);
  if (!parts.length || parts.some((part) => part.length > 24)) return "";

  return parts.map(humanizeSlugWord).join(" ");
}

function buildEnglishCategoryFromChinese(name: string, type: ToolType) {
  if (!name) return getDefaultToolLabel(type, "en");
  if (name.includes("办公效率")) return "Office Productivity Tools";
  if (name.includes("文件处理")) return "File Processing Tools";
  if (name.includes("系统实用")) return "System Utilities";
  if (name.includes("数据分析")) return "Data Analysis Tools";
  if (name.includes("提升效率")) return "Productivity Tools";
  if (name.includes("视频/图片处理")) return "Video/Image Processing";
  if (name.includes("图片")) return "AI Image Tool";
  if (name.includes("账号订购")) return "Account Subscription";
  if (name.includes("升级订阅")) return "Subscription Upgrade";
  if (name.includes("提示词")) return "AI Prompt";
  if (name.includes("副业变现")) return "AI Side Income";
  if (name.includes("智能体")) return "AI Agent";
  if (name.includes("自动化")) return "Automation Software";
  if (name.includes("电脑软件") || name.includes("桌面"))
    return "AI Desktop Software";
  if (name.includes("在线处理")) return "Online Processing";
  if (name.includes("账号购买")) return "AI Account Service";
  if (name.includes("代充")) return "AI Account Service";
  if (name.includes("在线") && name.includes("工具")) return "Online AI Tool";
  if (name.includes("视频")) return "AI Video Tool";
  if (name.includes("音频") || name.includes("语音")) return "AI Audio Tool";
  if (name.includes("课程") || name.includes("学习")) return "AI Skill Course";
  if (name.includes("实用")) return "Everyday AI Tool";
  return getDefaultToolLabel(type, "en");
}

function buildEnglishTagFromChinese(name: string) {
  if (!name) return "";
  if (name.includes("效率") || name.includes("办公")) return "Productivity";
  if (name.includes("自动化")) return "Automation";
  if (name.includes("写作") || name.includes("文案")) return "Writing";
  if (name.includes("运营")) return "Operations";
  if (name.includes("内容")) return "Content Creation";
  if (name.includes("视频")) return "Video";
  if (name.includes("图片") || name.includes("绘图") || name.includes("设计"))
    return "Image & Design";
  if (name.includes("语音") || name.includes("音频")) return "Audio";
  if (name.includes("账号")) return "Account Service";
  if (name.includes("课程") || name.includes("学习")) return "Learning";
  if (name.includes("代码") || name.includes("编程")) return "Coding";
  return "";
}

export function resolveLocalizedToolCategoryName(
  name: string | null | undefined,
  type: ToolType,
  locale: Locale,
) {
  const normalized = normalizeText(name);
  if (!normalized) return getDefaultToolLabel(type, locale);
  if (locale === "zh") {
    if (type === "online" && hasAccountServiceCategoryRisk(normalized))
      return "AI账号服务咨询";
    if (type === "online" && hasAccountServiceRiskCopy(normalized))
      return "AI账号服务咨询";
    return normalized;
  }
  if (!hasCjk(normalized) && isEnglishLike(normalized, 1)) return normalized;
  return buildEnglishCategoryFromChinese(normalized, type);
}

export function resolveLocalizedToolTagName(
  name: string | null | undefined,
  locale: Locale,
) {
  const normalized = normalizeText(name);
  if (!normalized) return "";
  if (locale === "zh") return normalized;
  if (!hasCjk(normalized) && isEnglishLike(normalized, 1)) return normalized;
  return buildEnglishTagFromChinese(normalized);
}

export function buildLocalizedToolTagItems(
  tagLinks: LocalizedTagInput[],
  locale: Locale,
) {
  return tagLinks
    .map(({ tag }) => ({
      id: tag.id,
      name: resolveLocalizedToolTagName(tag.name, locale),
    }))
    .filter((tag) => tag.name);
}

export function resolveLocalizedToolIdentity(
  tool: Pick<LocalizedToolInput, "slug" | "name" | "englishName" | "type">,
  locale: Locale,
) {
  const localizedFallbackName = getDefaultToolLabel(tool.type, locale);
  const name = normalizeText(tool.name);
  const englishName = normalizeText(tool.englishName);

  if (locale === "zh") {
    const primaryName =
      tool.type === "online"
        ? sanitizeAccountServiceName(
            name || englishName,
            "zh",
            localizedFallbackName,
          )
        : name || englishName || localizedFallbackName;
    const secondaryCandidate =
      englishName && englishName.toLowerCase() !== primaryName.toLowerCase()
        ? englishName
        : "";
    return {
      primaryName,
      secondaryName:
        tool.type === "online" && hasAccountServiceRiskCopy(secondaryCandidate)
          ? ""
          : secondaryCandidate,
    };
  }

  if (englishName && isEnglishLike(englishName, 1)) {
    const primaryName =
      tool.type === "online"
        ? sanitizeAccountServiceName(englishName, "en", localizedFallbackName)
        : englishName;
    const secondaryCandidate =
      name && name.toLowerCase() !== primaryName.toLowerCase() ? name : "";
    return {
      primaryName,
      secondaryName:
        tool.type === "online" && hasAccountServiceRiskCopy(secondaryCandidate)
          ? ""
          : secondaryCandidate,
    };
  }

  if (name && isEnglishLike(name, 1) && !isPromotionalName(name)) {
    return {
      primaryName:
        tool.type === "online"
          ? sanitizeAccountServiceName(name, "en", localizedFallbackName)
          : name,
      secondaryName: "",
    };
  }

  const humanizedSlug = humanizeSlug(tool.slug);
  if (humanizedSlug) {
    return {
      primaryName:
        tool.type === "online"
          ? buildAccountServiceEnglishName(humanizedSlug, "AI")
          : humanizedSlug,
      secondaryName:
        name && name.toLowerCase() !== humanizedSlug.toLowerCase() ? name : "",
    };
  }

  return {
    primaryName: localizedFallbackName,
    secondaryName:
      name && name.toLowerCase() !== localizedFallbackName.toLowerCase()
        ? name
        : "",
  };
}

function buildEnglishToolSentence(tool: LocalizedToolInput) {
  const localizedTool = resolveLocalizedToolIdentity(tool, "en");
  const categoryName = resolveLocalizedToolCategoryName(
    tool.categoryName,
    tool.type,
    "en",
  );
  const defaultLabel = getDefaultToolLabel(tool.type, "en");
  const primaryIsGeneric = localizedTool.primaryName === defaultLabel;
  const categoryIsGeneric = categoryName === defaultLabel;

  if (primaryIsGeneric && categoryIsGeneric) {
    if (tool.type === "online") {
      return "Review pricing, delivery notes, and access guidance for this AI account service on ENHE AI.";
    }

    if (tool.type === "skill_learning") {
      return "Review learning access, lesson structure, and current availability for this AI skill course on ENHE AI.";
    }

    return "Review pricing, version details, and download access for this AI software app on ENHE AI.";
  }

  if (tool.type === "online") {
    if (categoryIsGeneric) {
      return `${localizedTool.primaryName} provides AI tool subscription guidance, delivery notes, access support, and compliance guidance on ENHE AI. Review the official platform policy before using any third-party service.`;
    }

    return `${localizedTool.primaryName} provides ${categoryName.toLowerCase()} access support, delivery notes, and compliance guidance on ENHE AI. Review the official platform policy before using any third-party service.`;
  }

  if (tool.type === "skill_learning") {
    if (categoryIsGeneric) {
      return `${localizedTool.primaryName} is an AI skill course. Review learning access, lesson structure, and current availability on ENHE AI.`;
    }

    return `${localizedTool.primaryName} is an AI skill course for ${categoryName.toLowerCase()}. Review learning access, lesson structure, and current availability on ENHE AI.`;
  }

  if (categoryIsGeneric) {
    return `${localizedTool.primaryName} is an AI software app. Review pricing, version details, and download access on ENHE AI.`;
  }

  return `${localizedTool.primaryName} is an AI software app in ${categoryName.toLowerCase()}. Review pricing, version details, and download access on ENHE AI.`;
}

export function buildLocalizedToolSummary(
  tool: LocalizedToolInput,
  locale: Locale,
) {
  const englishOverride = englishToolContentOverrides[tool.slug];
  if (locale === "en" && englishOverride) return englishOverride.summary;

  const shortDescription = resolveLocalizedInlineCopy(
    tool.shortDescription,
    locale,
    normalizeText,
  );
  if (locale === "zh")
    return tool.type === "online"
      ? sanitizeAccountServiceCopy(shortDescription, "zh")
      : shortDescription;
  if (
    isLocalizedEnglishCopy(shortDescription, 4) &&
    !isPlaceholderSummary(shortDescription)
  ) {
    return shortDescription;
  }
  const contentSummary = buildEnglishSummaryFromContent(tool.content);
  if (contentSummary) return contentSummary;
  return buildEnglishToolSentence(tool);
}

export function buildLocalizedToolLongContent(
  tool: LocalizedToolInput,
  locale: Locale,
) {
  const englishOverride = englishToolContentOverrides[tool.slug];
  if (locale === "en" && englishOverride) return englishOverride.content;

  const content = normalizeRichText(tool.content);
  const localizedContent = resolveLocalizedInlineCopy(
    tool.content,
    locale,
    normalizeRichText,
  );
  if (locale === "zh")
    return tool.type === "online"
      ? sanitizeAccountServiceRichCopy(
          localizedContent ||
            resolveLocalizedInlineCopy(
              tool.shortDescription,
              "zh",
              normalizeRichText,
            ),
          "zh",
        )
      : localizedContent || content;
  if (isLocalizedEnglishCopy(localizedContent, 8)) return localizedContent;

  const summary = buildLocalizedToolSummary(tool, locale);
  return [
    summary,
    "This English page gives readers the core overview, access guidance, workflow context, and support guidance needed to evaluate the tool quickly.",
  ].join(" ");
}

export function shouldIndexEnglishToolPage(
  tool: Pick<
    LocalizedToolInput,
    "slug" | "name" | "englishName" | "shortDescription" | "content" | "type"
  >,
) {
  const localizedIdentity = resolveLocalizedToolIdentity(tool, "en");
  const localizedSummary = buildLocalizedToolSummary(tool, "en");
  const localizedContent = buildLocalizedToolLongContent(tool, "en");
  const englishOverride = englishToolContentOverrides[tool.slug];
  const sourceSummary =
    englishOverride?.summary ??
    resolveLocalizedInlineCopy(tool.shortDescription, "en", normalizeText);
  const sourceContent =
    englishOverride?.content ??
    resolveLocalizedInlineCopy(tool.content, "en", normalizeRichText);
  const defaultLabel = getDefaultToolLabel(tool.type, "en");
  const englishName = normalizeText(tool.englishName);
  const hasReadableEnglishName =
    localizedIdentity.primaryName !== defaultLabel ||
    isEnglishLike(englishName, 1);

  return (
    hasReadableEnglishName &&
    Boolean(englishName) &&
    (isLocalizedEnglishCopy(sourceSummary, 6) ||
      Boolean(englishOverride) ||
      Boolean(buildEnglishSummaryFromContent(tool.content))) &&
    isLocalizedEnglishCopy(sourceContent, 12) &&
    isLocalizedEnglishCopy(localizedSummary, 6) &&
    isLocalizedEnglishCopy(localizedContent, 12)
  );
}

export function isVisibleInEnglishContent(
  value: string | null | undefined,
  minimumWords = 3,
) {
  return isLocalizedEnglishCopy(
    resolveLocalizedInlineCopy(value, "en", normalizeText),
    minimumWords,
  );
}

export function buildLocalizedToolMetaHeading(
  tool: Pick<LocalizedToolInput, "slug" | "name" | "englishName" | "type">,
  locale: Locale,
) {
  const localizedTool = resolveLocalizedToolIdentity(tool, locale);
  const defaultToolLabel = getDefaultToolLabel(tool.type, locale);

  if (locale === "en") {
    return localizedTool.primaryName === defaultToolLabel
      ? defaultToolLabel
      : `${localizedTool.primaryName} - ${defaultToolLabel}`;
  }

  return localizedTool.primaryName;
}

export function buildLocalizedToolMetaDescription(
  tool: LocalizedToolInput,
  locale: Locale,
) {
  if (locale === "zh") {
    const description =
      resolveLocalizedInlineCopy(tool.shortDescription, "zh", normalizeText) ||
      resolveLocalizedInlineCopy(tool.content, "zh", normalizeText);
    return tool.type === "online"
      ? sanitizeAccountServiceCopy(description, "zh")
      : description;
  }

  return buildLocalizedToolSummary(tool, "en");
}

export function buildLocalizedToolPreviewText(
  tool: LocalizedToolInput,
  locale: Locale,
) {
  if (locale === "zh") {
    const preview = resolveLocalizedInlineCopy(
      tool.shortDescription,
      "zh",
      normalizeText,
    );
    return tool.type === "online"
      ? sanitizeAccountServiceCopy(preview, "zh")
      : preview;
  }

  const summary = buildLocalizedToolSummary(tool, "en");
  return summary.split(sentenceBreakPattern).find(Boolean)?.trim() ?? summary;
}

export function buildLocalizedToolOfferName(
  name: string | null | undefined,
  type: ToolType,
  locale: Locale,
  index: number,
) {
  const normalized = normalizeText(name);
  if (locale === "zh") {
    if (type === "online" && hasAccountServiceRiskCopy(normalized))
      return `AI账号服务咨询方案 ${index + 1}`;
    return normalized;
  }
  if (type === "online" && hasAccountServiceRiskCopy(normalized))
    return `Service option ${index + 1}`;
  if (isEnglishLike(normalized, 1) && !hasCjk(normalized)) return normalized;

  if (type === "skill_learning") return `Course option ${index + 1}`;
  if (type === "software") return `Download option ${index + 1}`;
  return `Service option ${index + 1}`;
}

function buildEnglishFaqFallback(
  tool: LocalizedToolInput,
): LocalizedFaqInput[] {
  const summary = buildLocalizedToolSummary(tool, "en");
  const typeLabel = getEnglishSentenceToolLabel(tool.type);

  return [
    {
      id: "localized-faq-overview",
      question: `What is this ${typeLabel} for?`,
      answer: summary,
    },
    {
      id: "localized-faq-access",
      question: "How do I access it after purchase?",
      answer:
        tool.type === "software"
          ? "After payment review, the related download-link content becomes available in your account center."
          : tool.type === "skill_learning"
            ? "After purchase, the course content and practical learning materials become available in your account center."
            : "After purchase and review, the service access notes, delivery scope, and compliance reminders become available in your account center.",
    },
  ];
}

function buildChineseFaqFallback(
  tool: LocalizedToolInput,
): LocalizedFaqInput[] {
  if (tool.type === "online") {
    return [
      {
        id: "localized-faq-service-scope",
        question: "这项AI账号服务主要提供什么支持？",
        answer:
          "该服务主要提供AI工具订阅与账号使用支持、访问建议、交付说明和售后边界说明。使用前请遵守对应平台规则；如涉及第三方平台，请以官方政策为准。",
      },
      {
        id: "localized-faq-compliance",
        question: "使用账号服务时需要注意什么？",
        answer:
          "请按对应平台规则合规使用，不承诺绕过平台限制，也不保证第三方平台政策长期不变。遇到访问、订阅或使用问题时，可联系ENHE AI客服获取使用建议。",
      },
    ];
  }

  if (tool.type === "skill_learning") {
    return [
      {
        id: "localized-faq-course-access",
        question: "购买课程后如何学习？",
        answer:
          "完成购买并通过审核后，可在用户中心查看课程内容、学习资料和相关使用说明。",
      },
      {
        id: "localized-faq-course-fit",
        question: "课程适合什么用户？",
        answer:
          "课程适合希望系统学习AI工具、提示词、自动化流程和实战方法的用户。建议先阅读课程介绍和目录，再决定是否购买。",
      },
    ];
  }

  return [
    {
      id: "localized-faq-software-access",
      question: "购买软件后如何获取下载内容？",
      answer:
        "完成购买并通过审核后，可在用户中心查看对应软件的下载链接、版本信息和使用说明。",
    },
    {
      id: "localized-faq-software-requirements",
      question: "使用前需要确认什么？",
      answer:
        "请先查看系统要求、版本记录、工具介绍和使用教程，确认软件适合你的设备环境和工作流程。",
    },
  ];
}

const minimumToolFaqCount = 5;

function buildGeneratedFaqQuestion(
  tool: LocalizedToolInput,
  locale: Locale,
  slot: number,
) {
  const zhName = normalizeText(tool.name || tool.englishName) || "该内容";
  const enName =
    resolveLocalizedToolIdentity(tool, "en").primaryName ||
    getDefaultToolLabel(tool.type, "en");

  if (locale === "en") {
    if (tool.type === "skill_learning") {
      return [
        `What is ${enName} for?`,
        `How do I access ${enName} after purchase?`,
        `Who is ${enName} suitable for?`,
        "Do I need prior experience before learning it?",
        "What result should I expect after learning it?",
      ][slot];
    }

    if (tool.type === "software") {
      return [
        `What is ${enName} used for?`,
        `How do I access ${enName} after purchase?`,
        "What should I check before using it?",
        "How should I use it in a real workflow?",
        "What support is available after purchase?",
      ][slot];
    }

    return [
      `What is this AI account service for?`,
      "How do I access it after purchase?",
      "What should I confirm before using it?",
      "Can I get support if I have questions?",
      "Will the service notes change over time?",
    ][slot];
  }

  if (tool.type === "skill_learning") {
    return [
      `${zhName}主要学习什么？`,
      "购买课程后如何开始学习？",
      `${zhName}适合哪些用户？`,
      "学习前需要具备基础吗？",
      "学完后可以获得什么结果？",
    ][slot];
  }

  if (tool.type === "software") {
    return [
      `${zhName}主要用来做什么？`,
      "购买软件后如何获取下载内容？",
      "使用前需要确认什么？",
      `${zhName}如何融入实际工作流？`,
      "遇到下载、安装或使用问题怎么办？",
    ][slot];
  }

  return [
    "这项AI账号服务主要提供什么支持？",
    "购买后如何查看服务说明？",
    "这类服务适合哪些使用场景？",
    "使用账号服务时需要注意什么？",
    "遇到访问或使用问题怎么办？",
  ][slot];
}

function buildGeneratedFaqAnswer(
  tool: LocalizedToolInput,
  locale: Locale,
  slot: number,
) {
  const zhName = normalizeText(tool.name || tool.englishName) || "该内容";
  const enName =
    resolveLocalizedToolIdentity(tool, "en").primaryName ||
    getDefaultToolLabel(tool.type, "en");
  const summary = buildLocalizedToolSummary(tool, locale);

  if (locale === "en") {
    if (slot === 0) return summary;

    if (tool.type === "skill_learning") {
      return [
        summary,
        `After purchase, ${enName} course content, practical materials, and learning notes become available in your account center after the order is reviewed.`,
        "It is suitable for users who want to learn AI tools, prompts, automation workflows, and practical methods through a structured learning path.",
        "Most lessons start from practical scenarios and operating steps. If the course involves specific software, accounts, or local deployment, review the preparation notes first.",
        "Use the course to understand the workflow, practice the key steps, and turn the method into a repeatable work, learning, or content-production outcome.",
      ][slot];
    }

    if (tool.type === "software") {
      return [
        summary,
        `After payment review, ${enName} download-link content, version notes, and usage guidance become available in your account center.`,
        "Check the system requirements, version notes, price, delivery scope, and whether the tool fits your device environment and current workflow.",
        "Start from a clear task, review the tool detail page and related tutorials, then test the output quality before using it in repeated work.",
        "You can review the current page notes and contact ENHE AI support for access, download, usage, or update-related guidance when needed.",
      ][slot];
    }

    return [
      summary,
      "After purchase and review, the service access notes, delivery scope, and compliance reminders become available in your account center.",
      "Review the service scope, delivery notes, platform rules, official platform policy, and support boundary before purchase or use.",
      "You can contact ENHE AI support for access guidance, usage suggestions, compliance guidance, and service-boundary clarification.",
      "ENHE AI may update page notes when platform policy, access conditions, delivery details, or support guidance changes.",
    ][slot];
  }

  if (tool.type === "skill_learning") {
    return [
      `${zhName}围绕 AI 工具使用、流程方法和实战落地展开，帮助你把学习内容转化为可执行的工作步骤。`,
      "完成购买并通过审核后，可在用户中心查看课程内容、学习资料、操作说明和相关补充信息。",
      "适合希望系统学习 AI 工具、提示词、自动化流程和实战方法的用户。建议先阅读课程介绍和目录，再判断是否符合当前目标。",
      "大多数内容会从实际场景和操作步骤切入。如果课程涉及特定软件、账号或本地部署环境，请先查看详情页中的适用条件和准备说明。",
      "你可以把课程中的方法用于内容创作、运营提效、工具配置或工作流搭建，并形成可复用的实践步骤。",
    ][slot];
  }

  if (tool.type === "software") {
    return [
      `${zhName}用于辅助完成 AI 工具应用、内容生产、流程处理或效率提升类任务。使用前建议结合详情页说明确认适用场景。`,
      "完成购买并通过审核后，可在用户中心查看对应软件的下载链接、版本信息和使用说明。",
      "请先查看系统要求、版本记录、工具介绍和使用教程，确认软件适合你的设备环境和工作流程。",
      "建议先明确要完成的任务，再按照详情页和教程进行小范围测试，确认输出质量、操作步骤和成本后再用于高频工作。",
      "可以先查看详情页、教程和版本说明；如果仍有问题，可联系 ENHE AI 客服获取下载、安装、使用或更新相关支持。",
    ][slot];
  }

  return [
    "该服务主要提供AI工具订阅与账号使用支持、访问建议、交付说明和售后边界说明。使用前请遵守对应平台规则。",
    "完成购买并通过审核后，可在用户中心查看对应服务说明、交付范围、使用建议和支持入口。",
    "适合需要了解AI工具访问、订阅方案、账号使用边界和合规注意事项的用户。涉及第三方平台时，请以对应平台官方政策为准。",
    "请按对应平台规则合规使用，不承诺绕过平台限制，也不保证第三方平台政策长期不变。",
    "可联系ENHE AI客服获取使用建议和服务边界说明。平台能力、订阅规则和访问条件可能变化，请以当前页面说明为准。",
  ][slot];
}

function ensureMinimumLocalizedFaqItems(
  faqs: LocalizedFaqInput[],
  tool: LocalizedToolInput,
  locale: Locale,
) {
  const existingQuestions = new Set(
    faqs.map((faq) => normalizeText(faq.question).toLowerCase()),
  );
  const completed = [...faqs];

  for (
    let slot = 0;
    completed.length < minimumToolFaqCount && slot < minimumToolFaqCount;
    slot += 1
  ) {
    const question = buildGeneratedFaqQuestion(tool, locale, slot);
    const answer = buildGeneratedFaqAnswer(tool, locale, slot);
    const normalizedQuestion = normalizeText(question).toLowerCase();
    if (!question || !answer || existingQuestions.has(normalizedQuestion))
      continue;
    existingQuestions.add(normalizedQuestion);
    completed.push({
      id: `localized-faq-generated-${slot + 1}`,
      question,
      answer,
    });
  }

  return completed.slice(0, Math.max(completed.length, minimumToolFaqCount));
}

export function buildLocalizedToolFaqItems(
  faqs: LocalizedFaqInput[],
  tool: LocalizedToolInput,
  locale: Locale,
) {
  const localizedFaqs = faqs.map((faq) => ({
    ...faq,
    question: resolveLocalizedInlineCopy(faq.question, locale, normalizeText),
    answer: resolveLocalizedInlineCopy(faq.answer, locale, normalizeRichText),
  }));

  if (locale === "zh") {
    if (!localizedFaqs.length)
      return ensureMinimumLocalizedFaqItems(
        buildChineseFaqFallback(tool),
        tool,
        locale,
      );
    if (tool.type !== "online")
      return ensureMinimumLocalizedFaqItems(localizedFaqs, tool, locale);

    return ensureMinimumLocalizedFaqItems(
      localizedFaqs.map((faq) => ({
        ...faq,
        answer: sanitizeAccountServiceCopy(faq.answer, "zh"),
      })),
      tool,
      locale,
    );
  }

  const visibleLocalizedFaqs = localizedFaqs.filter(
    (faq) =>
      isVisibleInEnglishContent(faq.question, 2) &&
      isVisibleInEnglishContent(faq.answer, 5),
  );

  return ensureMinimumLocalizedFaqItems(
    visibleLocalizedFaqs.length
      ? visibleLocalizedFaqs
      : buildEnglishFaqFallback(tool),
    tool,
    locale,
  );
}

function buildEnglishTutorialFallback(
  tool: LocalizedToolInput,
): LocalizedTutorialInput[] {
  const summary = buildLocalizedToolSummary(tool, "en");
  const accessText =
    tool.type === "software"
      ? "Check the version, system requirements, price, and download access before using it in your workflow."
      : tool.type === "skill_learning"
        ? "Check the course scope, purchase status, and lesson access before starting the learning path."
        : "Check the pricing, delivery notes, and account access details before using the service.";

  return [
    {
      id: "localized-tutorial-access",
      title: "Access and usage guide",
      content: `${summary} ${accessText}`,
      notes: null,
      commonErrors: null,
      videoUrl: null,
    },
  ];
}

export function buildLocalizedToolTutorialItems(
  tutorials: LocalizedTutorialInput[],
  tool: LocalizedToolInput,
  locale: Locale,
) {
  const localizedTutorials = tutorials.map((tutorial) => ({
    ...tutorial,
    title: resolveLocalizedInlineCopy(tutorial.title, locale, normalizeText),
    content: resolveLocalizedInlineCopy(
      tutorial.content,
      locale,
      normalizeRichText,
    ),
    notes: resolveLocalizedInlineCopy(
      tutorial.notes,
      locale,
      normalizeRichText,
    ),
    commonErrors: resolveLocalizedInlineCopy(
      tutorial.commonErrors,
      locale,
      normalizeRichText,
    ),
  }));

  if (locale === "zh") return localizedTutorials;

  const visibleLocalizedTutorials = localizedTutorials.filter(
    (tutorial) =>
      isVisibleInEnglishContent(tutorial.title, 2) &&
      isVisibleInEnglishContent(tutorial.content, 6),
  );

  return visibleLocalizedTutorials.length
    ? visibleLocalizedTutorials
    : buildEnglishTutorialFallback(tool);
}
