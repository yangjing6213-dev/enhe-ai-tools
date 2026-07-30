import { unstable_cache } from "next/cache";
import type { Locale } from "@/lib/dictionaries";
import { prisma } from "@/lib/db";
import { publicPageCacheSeconds } from "@/lib/public-routes";
import {
  buildLocalizedToolOfferName,
  buildLocalizedToolSummary,
  resolveLocalizedToolCategoryName,
  resolveLocalizedToolIdentity,
} from "@/lib/tool-localization";

type PricingOfferCopy = {
  name: string;
  description: string;
  category: string;
  delivery: string;
};

export type PricingCatalogTool = {
  slug: string;
  name: string;
  englishName: string | null;
  type: "software" | "online" | "skill_learning" | "ai_skill";
  status: "draft" | "published" | "offline";
  shortDescription: string;
  content: string;
  category: { name: string } | null;
  isDownloadPaid: boolean;
  downloadPrice: unknown;
  tutorials: Array<{ status: "active" | "disabled" }>;
  priceSpecs: Array<{
    id: string;
    name: string;
    price: unknown;
    sortOrder: number;
    status: "active" | "disabled";
  }>;
};

export type PricingOffer = {
  id: string;
  name: string;
  price: number;
};

export type PricingOfferItem = {
  slug: string;
  path: string;
  price: number;
  offers: PricingOffer[];
  type: "software" | "account_service" | "course" | "ai_skill";
  localized: PricingOfferCopy;
};

const siteBaseUrl = "https://www.enhe-tech.com.cn";

function toFinitePrice(value: unknown) {
  const price = Number(value ?? 0);
  return Number.isFinite(price) && price > 0 ? price : 0;
}

function getCatalogType(type: PricingCatalogTool["type"]): PricingOfferItem["type"] {
  if (type === "online") return "account_service";
  if (type === "skill_learning") return "course";
  if (type === "ai_skill") return "ai_skill";
  return "software";
}

function getCatalogPath(type: PricingCatalogTool["type"], slug: string) {
  if (type === "online") return `/account-services/${slug}`;
  if (type === "skill_learning") return `/skill-learning/${slug}`;
  if (type === "ai_skill") return `/ai-skills/${slug}`;
  return `/software/${slug}`;
}

function getDefaultOfferName(
  type: PricingCatalogTool["type"],
  locale: Locale,
  isFree: boolean,
) {
  if (locale === "en") {
    if (isFree) return "Free access";
    if (type === "online") return "Service access";
    if (type === "skill_learning") return "Course access";
    return "Download access";
  }

  if (isFree) return "免费获取";
  if (type === "online") return "服务方案";
  if (type === "skill_learning") return "课程权限";
  return "下载权限";
}

function buildOffers(tool: PricingCatalogTool, locale: Locale): PricingOffer[] {
  const activeSpecs = tool.priceSpecs
    .filter((spec) => spec.status === "active" && toFinitePrice(spec.price) > 0)
    .sort((left, right) => left.sortOrder - right.sortOrder);

  const isDownloadProduct = tool.type === "software" || tool.type === "ai_skill";
  const usesPaidAccess = !isDownloadProduct || tool.isDownloadPaid;
  if (usesPaidAccess && activeSpecs.length) {
    return activeSpecs.map((spec, index) => ({
      id: spec.id,
      name: buildLocalizedToolOfferName(spec.name, tool.type, locale, index),
      price: toFinitePrice(spec.price),
    }));
  }

  const legacySoftwarePrice =
    isDownloadProduct && tool.isDownloadPaid
      ? toFinitePrice(tool.downloadPrice)
      : 0;

  return [
    {
      id: `${tool.slug}-default`,
      name: getDefaultOfferName(tool.type, locale, legacySoftwarePrice === 0),
      price: legacySoftwarePrice,
    },
  ];
}

function containsFreeClaim(value: string) {
  return /\bfree\b/i.test(value) || value.includes("免费");
}

function buildAccurateDescription(
  tool: PricingCatalogTool,
  locale: Locale,
  name: string,
  offers: PricingOffer[],
) {
  const localizedInput = {
    slug: tool.slug,
    name: tool.name,
    englishName: tool.englishName,
    shortDescription: tool.shortDescription,
    content: tool.content,
    type: tool.type,
    categoryName: tool.category?.name,
  };
  const description = buildLocalizedToolSummary(localizedInput, locale);
  const isPaid = offers.some((offer) => offer.price > 0);

  if (!isPaid || !containsFreeClaim(description)) return description;

  if (locale === "en") {
    if (tool.type === "online") {
      return `${name} is currently a paid AI account service. Review the available service options, delivery notes, and support boundaries before purchase.`;
    }
    if (tool.type === "skill_learning") {
      return `${name} is currently a paid AI skill course. Review the course access, lesson scope, and delivery notes before purchase.`;
    }
    if (tool.type === "ai_skill") {
      return `${name} is currently a paid AI Skill. Review supported agents, package access, and setup notes before purchase.`;
    }
    return `${name} is currently a paid AI software app. Review the available download options, delivery notes, and system requirements before purchase.`;
  }

  if (tool.type === "online") {
    return `${name} 当前为付费 AI 账号服务，请在购买前核对服务方案、交付说明和支持边界。`;
  }
  if (tool.type === "skill_learning") {
    return `${name} 当前为付费 AI 技能课程，请在购买前核对课程权限、学习范围和交付说明。`;
  }
  if (tool.type === "ai_skill") {
    return `${name} 当前为付费 AI Skill，请在购买前核对支持智能体、ZIP 交付包和安装说明。`;
  }
  return `${name} 当前为付费 AI 软件，请在购买前核对下载方案、交付说明和系统要求。`;
}

function buildDeliveryCopy(
  type: PricingCatalogTool["type"],
  locale: Locale,
  isFree: boolean,
) {
  if (locale === "en") {
    if (type === "online") {
      return isFree
        ? "Free service access from the detail page"
        : "Service notes and support entry after payment review";
    }
    if (type === "skill_learning") {
      return isFree
        ? "Free course access"
        : "Course access after payment review";
    }
    return isFree
      ? "Free download or access from the detail page"
      : "Download and setup notes after payment review";
  }

  if (type === "online") {
    return isFree ? "从详情页免费获取服务" : "付款审核后开放服务说明与支持入口";
  }
  if (type === "skill_learning") {
    return isFree ? "免费获取课程内容" : "付款审核后开放课程权限";
  }
  return isFree ? "从详情页免费下载或获取" : "付款审核后开放下载与使用说明";
}

export function buildPricingOfferItems(
  tools: PricingCatalogTool[],
  locale: Locale,
): PricingOfferItem[] {
  return tools
    .filter(
      (tool) =>
        tool.status === "published" &&
        (tool.type !== "skill_learning" ||
          tool.tutorials.some((tutorial) => tutorial.status === "active")),
    )
    .map((tool) => {
      const localizedInput = {
        slug: tool.slug,
        name: tool.name,
        englishName: tool.englishName,
        shortDescription: tool.shortDescription,
        content: tool.content,
        type: tool.type,
        categoryName: tool.category?.name,
      };
      const localizedName = resolveLocalizedToolIdentity(
        localizedInput,
        locale,
      ).primaryName;
      const offers = buildOffers(tool, locale);
      const isFree = offers.every((offer) => offer.price === 0);
      const path = getCatalogPath(tool.type, tool.slug);

      return {
        slug: tool.slug,
        path: locale === "en" ? `/en${path}` : path,
        price: offers[0]?.price ?? 0,
        offers,
        type: getCatalogType(tool.type),
        localized: {
          name: localizedName,
          description: buildAccurateDescription(
            tool,
            locale,
            localizedName,
            offers,
          ),
          category: resolveLocalizedToolCategoryName(
            tool.category?.name,
            tool.type,
            locale,
          ),
          delivery: buildDeliveryCopy(tool.type, locale, isFree),
        },
      };
    });
}

export async function loadPublicPricingCatalogTools(): Promise<
  PricingCatalogTool[]
> {
  return prisma.tool.findMany({
    where: {
      status: "published",
      type: { in: ["software", "online", "skill_learning", "ai_skill"] },
    },
    select: {
      slug: true,
      name: true,
      englishName: true,
      type: true,
      status: true,
      shortDescription: true,
      content: true,
      category: { select: { name: true } },
      isDownloadPaid: true,
      downloadPrice: true,
      tutorials: {
        where: { status: "active" },
        select: { status: true },
      },
      priceSpecs: {
        where: { status: "active" },
        select: {
          id: true,
          name: true,
          price: true,
          sortOrder: true,
          status: true,
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
    },
    orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
  });
}

const getCachedPublicPricingCatalogTools = unstable_cache(
  loadPublicPricingCatalogTools,
  ["public-pricing-catalog-tools"],
  {
    revalidate: publicPageCacheSeconds,
    tags: ["public-tools"],
  },
);

export async function getPricingOfferItems(locale: Locale) {
  const tools = await getCachedPublicPricingCatalogTools();
  return buildPricingOfferItems(tools, locale);
}

function getMarkdownType(type: PricingOfferItem["type"]) {
  if (type === "account_service") return "AI account service guidance";
  if (type === "course") return "AI skill course";
  return "AI software app";
}

function formatPrice(price: number) {
  return price.toFixed(2);
}

export function renderPricingMarkdown(items: PricingOfferItem[]) {
  const offerSections = items.map((item) => {
    const priceLines =
      item.offers.length === 1
        ? [`- Price: CNY ${formatPrice(item.offers[0].price)}`]
        : item.offers.map(
            (offer) =>
              `- Offer: ${offer.name} | CNY ${formatPrice(offer.price)}`,
          );

    return [
      `### ${item.localized.name}`,
      "",
      `- Type: ${getMarkdownType(item.type)}`,
      ...priceLines,
      `- URL: ${siteBaseUrl}${item.path.replace(/^\/en(?=\/)/, "")}`,
      `- Delivery: ${item.localized.delivery}.`,
      `- Summary: ${item.localized.description}`,
    ].join("\n");
  });

  return [
    "# ENHE AI Pricing and Service Access",
    "",
    "This file gives AI agents and search systems a structured summary of current public software, account service, and course offers from ENHE AI. Final availability, delivery notes, and support boundaries are shown on the matching public detail page.",
    "",
    "## Product-level offers",
    "",
    offerSections.join("\n\n"),
    "",
    "## Purchase notes",
    "",
    "- Prices are listed in CNY.",
    "- Users should review the matching detail page before purchase or access.",
    "- Payment proof review is required before paid download, course, or service access is unlocked.",
    "- Third-party platform services must follow the official rules of that platform.",
    "",
    "## Support",
    "",
    "- Company: ENHE AI",
    "- Email: ENHEAI.life@protonmail.com",
    "- Website: https://www.enhe-tech.com.cn/",
    "",
  ].join("\n");
}
