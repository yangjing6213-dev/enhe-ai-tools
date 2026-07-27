import { unstable_cache } from "next/cache";
import type { Prisma, ProductDemoCategory } from "@prisma/client";
import { enheOrganizationReference } from "@/lib/brand-entity";
import { prisma } from "@/lib/db";
import type { Locale } from "@/lib/dictionaries";
import { normalizeImageSrc } from "@/lib/media";
import { resolveProductVideoSrc } from "@/lib/product-video";
import { buildCanonicalToolPath } from "@/lib/public-slugs";
import {
  absoluteUrl,
  buildLocalePath,
  buildMetaDescription,
  buildMetadataTitle,
  siteName,
} from "@/lib/seo";

export const productDemoRevalidateSeconds = 300;

export const productDemoCategories = [
  "software",
  "skill_learning",
  "account_service",
] as const satisfies readonly ProductDemoCategory[];

export type ProductDemoFilter = (typeof productDemoCategories)[number] | "all";

export type ProductDemoFaqItem = {
  question: string;
  answer: string;
};

export type PublicProductDemo = Prisma.ProductDemoGetPayload<{
  include: {
    relatedProduct: {
      include: {
        category: true;
        priceSpecs: true;
        tutorials: true;
      };
    };
  };
}>;

function isRecoverableProductDemoReadError(error: unknown) {
  if (!(error instanceof Error)) return false;

  const errorWithCode = error as Error & { code?: unknown };
  const code = typeof errorWithCode.code === "string" ? errorWithCode.code : "";
  return (
    code === "P1001" ||
    /Can't reach database server/i.test(error.message) ||
    /ECONNREFUSED/i.test(error.message)
  );
}

export function normalizeProductDemoCategory(value?: string | null): ProductDemoFilter {
  if (value === "software" || value === "skill_learning" || value === "account_service") {
    return value;
  }
  if (value === "skill-learning") return "skill_learning";
  if (value === "account-service") return "account_service";
  return "all";
}

export function getProductDemoCategoryParam(category: ProductDemoFilter) {
  if (category === "skill_learning") return "skill-learning";
  if (category === "account_service") return "account-service";
  return category;
}

export function getProductDemoCategoryLabel(category: ProductDemoCategory, locale: Locale) {
  if (locale === "en") {
    if (category === "skill_learning") return "AI Skill Learning";
    if (category === "account_service") return "AI Account Service";
    return "AI Software App";
  }

  if (category === "skill_learning") return "AI技能学习";
  if (category === "account_service") return "AI账号服务";
  return "AI软件应用";
}

export function buildProductDemoPath(slug: string, locale: Locale) {
  return buildLocalePath(`/product-demos/${slug}`, locale);
}

export function buildProductDemoListingPath(locale: Locale, category: ProductDemoFilter = "all") {
  const basePath = buildLocalePath("/product-demos", locale);
  if (category === "all") return basePath;
  return `${basePath}?type=${getProductDemoCategoryParam(category)}`;
}

export function parseProductDemoFaq(value: unknown): ProductDemoFaqItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const question = String(record.question ?? "").trim();
      const answer = String(record.answer ?? "").trim();
      return question && answer ? { question, answer } : null;
    })
    .filter((item): item is ProductDemoFaqItem => Boolean(item));
}

const windowsAiVideoStudioEnglishFaq: ProductDemoFaqItem[] = [
  {
    question: "Does this AI video generation app require internet access?",
    answer:
      "The software runs through a local deployment. After the models are installed, it can generate videos locally without uploading source material to the cloud, supporting a more private and stable workflow.",
  },
  {
    question: "Which AI video generation features are supported?",
    answer:
      "It supports text-to-video, image-to-video, video enhancement, model management, task queues, and project management for common AI video creation workflows.",
  },
  {
    question: "What is included after purchase?",
    answer:
      "The purchase includes the software installer, deployment environment, setup guide, usage instructions, and related documentation. Included models and configuration notes depend on the selected product version.",
  },
];

export function getLocalizedProductDemoFaq(
  demo: Pick<PublicProductDemo, "slug" | "faq">,
  locale: Locale,
) {
  const faqItems = parseProductDemoFaq(demo.faq);
  if (locale === "zh") return faqItems;

  const localizedFaqItems = faqItems
    .map((item) => ({
      question: resolveLocalizedPlainCopy(item.question, "en"),
      answer: resolveLocalizedPlainCopy(item.answer, "en"),
    }))
    .filter(
      (item) =>
        isReadableEnglish(item.question, 3) &&
        isReadableEnglish(item.answer, 6),
    );

  if (localizedFaqItems.length) return localizedFaqItems;
  if (demo.slug === "windows-ai-video-studio") {
    return windowsAiVideoStudioEnglishFaq;
  }

  return [];
}

export function getProductDemoCoverImage(demo: Pick<PublicProductDemo, "coverImage">) {
  return normalizeImageSrc(demo.coverImage);
}

export function getProductDemoVideoUrl(demo: Pick<PublicProductDemo, "videoUrl">) {
  return resolveProductVideoSrc(demo.videoUrl);
}

export function getProductDemoRelatedProductHref(
  demo: Pick<PublicProductDemo, "relatedProductUrl" | "relatedProductSlug" | "relatedProduct">,
  locale: Locale,
) {
  if (demo.relatedProduct) return buildCanonicalToolPath(demo.relatedProduct, locale);
  if (demo.relatedProductUrl) return demo.relatedProductUrl;
  if (demo.relatedProductSlug) return buildLocalePath(`/software/${demo.relatedProductSlug}`, locale);
  return buildLocalePath("/software", locale);
}

const cjkPattern = /[\u3400-\u9fff]/;
const latinWordPattern = /[A-Za-z][A-Za-z0-9'+-]*/g;
const localizedBlockPattern = /\[\[(zh|en)\]\]([\s\S]*?)\[\[\/\1\]\]/g;

function normalizePlainText(value: string | null | undefined) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function hasCjk(value: string) {
  return cjkPattern.test(value);
}

function countLatinWords(value: string) {
  return value.match(latinWordPattern)?.length ?? 0;
}

function isReadableEnglish(value: string, minimumWords = 2) {
  const normalized = normalizePlainText(value);
  return Boolean(normalized) && !hasCjk(normalized) && countLatinWords(normalized) >= minimumWords;
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

  return { hasMatch, blocks };
}

function resolveLocalizedPlainCopy(value: string | null | undefined, locale: Locale) {
  const localized = extractLocalizedBlocks(value);
  if (!localized.hasMatch) return normalizePlainText(value);
  return normalizePlainText(locale === "en" ? localized.blocks.en : localized.blocks.zh ?? localized.blocks.en);
}

function humanizeDemoSlug(slug: string) {
  return normalizePlainText(slug)
    .replace(/^\/+|\/+$/g, "")
    .split("-")
    .filter(Boolean)
    .map((word) => {
      const lower = word.toLowerCase();
      if (lower === "ai") return "AI";
      if (lower === "enhe") return "ENHE";
      return `${lower.slice(0, 1).toUpperCase()}${lower.slice(1)}`;
    })
    .join(" ");
}

function getEnglishDemoBaseName(demo: PublicProductDemo) {
  const relatedEnglishName = normalizePlainText(demo.relatedProduct?.englishName);
  if (isReadableEnglish(relatedEnglishName, 1)) return relatedEnglishName;

  const relatedName = normalizePlainText(demo.relatedProduct?.name);
  if (isReadableEnglish(relatedName, 1)) return relatedName;

  const title = normalizePlainText(demo.title);
  if (isReadableEnglish(title, 1)) return title;

  return humanizeDemoSlug(demo.slug) || "ENHE AI Tool";
}

function translateChineseDemoSegment(value: string) {
  const text = normalizePlainText(value);
  if (!text) return "";
  if (!hasCjk(text)) return text;
  if (text.includes("AI生成视频")) return "AI Video Generation";
  if (text.includes("AI生成图片")) return "AI Image Generation";
  if (text.includes("智能体")) return "AI Agent";
  if (text.includes("图片换脸")) return "Image Face Swap";
  if (text.includes("视频换脸")) return "Video Face Swap";
  if (text.includes("换脸")) return "Face Swap";
  if (text.includes("人像") && text.includes("处理")) return "AI Portrait Editing";
  if (text.includes("图片") && text.includes("处理")) return "AI Image Editing";
  if (text.includes("视频") && text.includes("处理")) return "AI Video Editing";
  if (text.includes("工作流")) return "AI Workflow";
  return "";
}

function uniqueStrings(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = normalizePlainText(value);
    if (!normalized || seen.has(normalized.toLowerCase())) continue;
    seen.add(normalized.toLowerCase());
    result.push(normalized);
  }

  return result;
}

function splitDemoKeywordList(value: string) {
  return value
    .split(/[|｜,，、/]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getLocalizedProductDemoTitle(demo: PublicProductDemo, locale: Locale) {
  const title = resolveLocalizedPlainCopy(demo.title, locale);
  if (locale === "zh") return title || demo.title;
  if (isReadableEnglish(title, 1)) return title;

  const baseName = getEnglishDemoBaseName(demo);
  return /demo$/i.test(baseName) ? baseName : `${baseName} Demo`;
}

export function getLocalizedProductDemoDescription(demo: PublicProductDemo, locale: Locale) {
  const source = demo.seoDescription || demo.description;
  const description = resolveLocalizedPlainCopy(source, locale);
  if (locale === "zh") return description || demo.description;
  if (isReadableEnglish(description, 3)) return description;

  const baseName = getEnglishDemoBaseName(demo);
  return `Watch a practical ENHE AI demo for ${baseName}, including workflow, key features, usage scenarios, and product fit before purchase.`;
}

export function getLocalizedProductDemoProductType(demo: PublicProductDemo, locale: Locale) {
  const productType = resolveLocalizedPlainCopy(demo.productType, locale);
  if (!productType) return "";
  if (locale === "zh") return productType;
  if (isReadableEnglish(productType, 1)) return productType;

  const translated = uniqueStrings(splitDemoKeywordList(productType).map(translateChineseDemoSegment));
  return translated.length ? translated.join(" / ") : getProductDemoCategoryLabel(demo.category, locale);
}

export function getLocalizedProductDemoTags(demo: PublicProductDemo, locale: Locale) {
  if (locale === "zh") return demo.tags.map((tag) => resolveLocalizedPlainCopy(tag, locale)).filter(Boolean);

  return uniqueStrings(
    demo.tags.flatMap((tag) => {
      const localizedTag = resolveLocalizedPlainCopy(tag, locale);
      if (isReadableEnglish(localizedTag, 1)) return [localizedTag];
      return splitDemoKeywordList(localizedTag).map(translateChineseDemoSegment);
    }),
  );
}

export function getLocalizedProductDemoCoverAlt(demo: PublicProductDemo, locale: Locale) {
  const coverAlt = resolveLocalizedPlainCopy(demo.coverAlt, locale);
  if (locale === "zh") return coverAlt || getLocalizedProductDemoTitle(demo, locale);
  if (isReadableEnglish(coverAlt, 2)) return coverAlt;
  return `${getLocalizedProductDemoTitle(demo, "en")} cover image`;
}

export function getProductDemoTitle(demo: Pick<PublicProductDemo, "title">) {
  return demo.title;
}

export function getProductDemoDescription(demo: Pick<PublicProductDemo, "description" | "seoDescription">) {
  return demo.seoDescription || demo.description;
}

export function buildProductDemoMetadataTitle(demo: PublicProductDemo, locale: Locale) {
  const localizedSeoTitle = resolveLocalizedPlainCopy(demo.seoTitle, locale);
  if (
    localizedSeoTitle &&
    (locale === "zh" || isReadableEnglish(localizedSeoTitle, 1))
  ) {
    return buildMetadataTitle({
      pageTitle: localizedSeoTitle,
      brand: siteName,
    });
  }
  const title = getLocalizedProductDemoTitle(demo, locale);
  return buildMetadataTitle({
    pageTitle: locale === "en" ? (/demo$/i.test(title) ? title : `${title} Demo`) : `${title} 视频演示`,
    brand: siteName,
  });
}

function normalizeProductDemoSchemaDate(value: unknown) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function getProductDemoSchemaUploadDate(
  demo: Pick<PublicProductDemo, "uploadDate" | "publishedAt" | "createdAt">,
) {
  return (
    normalizeProductDemoSchemaDate(demo.uploadDate) ??
    normalizeProductDemoSchemaDate(demo.publishedAt) ??
    normalizeProductDemoSchemaDate(demo.createdAt) ??
    new Date(0).toISOString()
  );
}

export function buildProductDemoVideoObjectSchema(demo: PublicProductDemo, locale: Locale) {
  const demoPath = buildProductDemoPath(demo.slug, locale);
  const thumbnailUrl = getProductDemoCoverImage(demo);
  const contentUrl = getProductDemoVideoUrl(demo);

  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: getLocalizedProductDemoTitle(demo, locale),
    description: buildMetaDescription(getLocalizedProductDemoDescription(demo, locale)),
    thumbnailUrl: thumbnailUrl ? [absoluteUrl(thumbnailUrl)] : undefined,
    uploadDate: getProductDemoSchemaUploadDate(demo),
    ...(demo.videoDuration ? { duration: demo.videoDuration } : {}),
    ...(contentUrl ? { contentUrl: absoluteUrl(contentUrl) } : {}),
    publisher: enheOrganizationReference,
    url: absoluteUrl(demoPath),
    inLanguage: locale === "en" ? "en-US" : "zh-CN",
  };
}

export function buildProductDemoBreadcrumbItems(demo: PublicProductDemo, locale: Locale) {
  return [
    { name: locale === "en" ? "Home" : "首页", path: buildLocalePath("/", locale) },
    {
      name: locale === "en" ? "Tool Function Demos" : "工具功能演示",
      path: buildLocalePath("/product-demos", locale),
    },
    { name: getLocalizedProductDemoTitle(demo, locale), path: buildProductDemoPath(demo.slug, locale) },
  ];
}

const productDemoInclude = {
  relatedProduct: {
    include: {
      category: true,
      priceSpecs: {
        where: { status: "active" },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
      tutorials: {
        where: { status: "active" },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
    },
  },
} satisfies Prisma.ProductDemoInclude;

const productDemoOrderBy = [
  { sortOrder: "asc" },
  { publishedAt: "desc" },
  { createdAt: "desc" },
] satisfies Prisma.ProductDemoOrderByWithRelationInput[];

const getCachedHomeProductDemos = unstable_cache(
  async () => {
    try {
      return await prisma.productDemo.findMany({
        where: {
          status: "published",
          isFeaturedOnHome: true,
        },
        include: productDemoInclude,
        orderBy: productDemoOrderBy,
        take: 3,
      });
    } catch (error) {
      if (isRecoverableProductDemoReadError(error)) return [];
      throw error;
    }
  },
  ["public-home-product-demos"],
  {
    revalidate: productDemoRevalidateSeconds,
    tags: ["public-product-demos", "public-home"],
  },
);

const getCachedPublicProductDemos = unstable_cache(
  async (category: ProductDemoFilter) => {
    try {
      return await prisma.productDemo.findMany({
        where: {
          status: "published",
          ...(category !== "all" ? { category } : {}),
        },
        include: productDemoInclude,
        orderBy: productDemoOrderBy,
      });
    } catch (error) {
      if (isRecoverableProductDemoReadError(error)) return [];
      throw error;
    }
  },
  ["public-product-demos-listing"],
  {
    revalidate: productDemoRevalidateSeconds,
    tags: ["public-product-demos"],
  },
);

const getCachedPublicProductDemoBySlug = unstable_cache(
  async (slug: string) => {
    try {
      return await prisma.productDemo.findFirst({
        where: { slug, status: "published" },
        include: productDemoInclude,
      });
    } catch (error) {
      if (isRecoverableProductDemoReadError(error)) return null;
      throw error;
    }
  },
  ["public-product-demo-by-slug"],
  {
    revalidate: productDemoRevalidateSeconds,
    tags: ["public-product-demos"],
  },
);

export async function getHomeProductDemos() {
  return getCachedHomeProductDemos();
}

export async function getPublicProductDemos(category: ProductDemoFilter = "all") {
  return getCachedPublicProductDemos(category);
}

export async function getPublicProductDemoBySlug(slug: string) {
  return getCachedPublicProductDemoBySlug(slug);
}
