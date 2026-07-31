import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import {
  createCommentAction,
  createSoftwareDownloadOrderAction,
} from "@/app/actions";
import { FormSubmitButton } from "@/components/form-submit-button";
import { ProductVideoPlayer } from "@/components/product-video-player";
import { StructuredData } from "@/components/structured-data";
import { Badge, ButtonLink, Container, SectionTitle } from "@/components/ui";
import { ToolCard } from "@/components/tool-card";
import { ToolRichContent } from "@/components/tool-rich-content";
import { getCurrentUser } from "@/lib/auth";
import { enheOrganizationReference } from "@/lib/brand-entity";
import { prisma } from "@/lib/db";
import { getDictionary, type Locale } from "@/lib/dictionaries";
import { normalizeImageSrc } from "@/lib/media";
import { resolveProductVideos } from "@/lib/product-video";
import {
  buildCanonicalToolPath,
  getCanonicalToolSlug,
} from "@/lib/public-slugs";
import { publicPageCacheSeconds } from "@/lib/public-routes";
import { resolvePublicToolSlug } from "@/lib/public-content";
import {
  buildBreadcrumbSchema,
  buildAvailableLanguageAlternates,
  buildFaqSchema,
  buildLocalePath,
  buildPageMetadata,
  buildProductStructuredData,
  getRevenuePageSeoTitle,
  buildToolMetaDescription,
  buildToolMetadataTitle,
  buildToolStructuredData,
} from "@/lib/seo";
import {
  buildLocalizedToolFaqItems,
  buildLocalizedToolLongContent,
  buildLocalizedToolMetaDescription,
  buildLocalizedToolMetaHeading,
  buildLocalizedToolOfferName,
  buildLocalizedToolOptionalText,
  buildLocalizedToolSummary,
  buildLocalizedToolTagItems,
  buildLocalizedToolTutorialItems,
  resolveLocalizedToolCategoryName,
  resolveLocalizedToolIdentity,
  shouldIndexEnglishToolPage,
} from "@/lib/tool-localization";
import { getPrimaryToolPrice } from "@/lib/tool-price-specs";
import {
  canOpenPublicDownloadEntry,
  canOpenProtectedDownloadEntry,
  canShowDownloadLinkArea,
  getDownloadLinkContent,
  linkifyDownloadLinkContent,
  resolveSoftwareDownloadCtaHref,
} from "@/lib/tool-download-link";
import { getVisibleToolMetrics } from "@/lib/tool-metrics";

export const toolDetailPageRevalidate = publicPageCacheSeconds;

export function resolveToolDetailSchemaPrice({
  toolType,
  isDownloadPaid,
  servicePrice,
}: {
  toolType: "software" | "online" | "skill_learning" | "ai_skill";
  isDownloadPaid: boolean;
  servicePrice: number;
}) {
  if (Number.isFinite(servicePrice) && servicePrice > 0) return servicePrice;
  if (
    toolType === "skill_learning" &&
    Number.isFinite(servicePrice) &&
    servicePrice <= 0
  ) {
    return 0;
  }
  if ((toolType === "software" || toolType === "ai_skill") && !isDownloadPaid) return 0;
  return null;
}

export function buildFreeToolDetailOffer(url: string) {
  return {
    "@type": "Offer",
    price: "0.00",
    priceCurrency: "CNY",
    availability: "https://schema.org/InStock",
    url,
  };
}

export async function generateToolDetailPageMetadata(
  forceLocale: Locale,
  slug: string,
): Promise<Metadata> {
  const t = getDictionary(forceLocale);
  const slugMatch = await resolvePublicToolSlug(slug);
  const tool = slugMatch
    ? await prisma.tool.findUnique({
        where: { id: slugMatch.id },
        select: {
          slug: true,
          name: true,
          englishName: true,
          shortDescription: true,
          content: true,
          coverImage: true,
          status: true,
          type: true,
        },
      })
    : null;
  const canonicalSlug = slugMatch?.canonicalSlug ?? slug;
  const canonical = tool
    ? buildCanonicalToolPath(tool, forceLocale)
    : buildLocalePath(`/software/${canonicalSlug}`, forceLocale);
  if (!tool || tool.status !== "published") {
    return buildPageMetadata({
      title: `${t.toolDetail.introTitle} - ${t.brand}`,
      description: t.listing.emptyText,
      path: canonical,
      locale: forceLocale === "en" ? "en_US" : "zh_CN",
      localeKey: forceLocale,
    });
  }

  const revenuePageSeoTitle = getRevenuePageSeoTitle(
    canonicalSlug,
    forceLocale,
  );
  const metadata = buildPageMetadata({
    title: buildToolMetadataTitle({
      name:
        revenuePageSeoTitle ?? buildLocalizedToolMetaHeading(tool, forceLocale),
      englishName:
        revenuePageSeoTitle || forceLocale === "en" ? null : tool.englishName,
      brand: t.brand,
      locale: forceLocale,
      maxLength: revenuePageSeoTitle
        ? forceLocale === "en"
          ? 58
          : 38
        : undefined,
    }),
    description: buildToolMetaDescription({
      name: buildLocalizedToolMetaHeading(tool, forceLocale),
      englishName: forceLocale === "en" ? null : tool.englishName,
      description: buildLocalizedToolMetaDescription(tool, forceLocale),
      brand: t.brand,
      locale: forceLocale,
      type:
        tool.type === "online"
          ? "online"
          : tool.type === "skill_learning"
            ? "skill_learning"
            : tool.type === "ai_skill"
              ? "ai_skill"
            : "software",
    }),
    path: canonical,
    image: normalizeImageSrc(tool.coverImage),
    locale: forceLocale === "en" ? "en_US" : "zh_CN",
    localeKey: forceLocale,
    languageAlternates: buildAvailableLanguageAlternates(
      canonical,
      shouldIndexEnglishToolPage(tool) ? ["zh", "en"] : ["zh"],
    ),
  });

  if (forceLocale === "en" && !shouldIndexEnglishToolPage(tool)) {
    metadata.robots = {
      index: false,
      follow: true,
    };
  }

  return metadata;
}

export async function ToolDetailPageShell({
  slug,
  forceLocale,
  expectedType,
}: {
  slug: string;
  forceLocale: Locale;
  expectedType?: "software" | "online" | "skill_learning" | "ai_skill";
}) {
  const [user, slugMatch] = await Promise.all([
    getCurrentUser(),
    resolvePublicToolSlug(slug),
  ]);
  if (!slugMatch) notFound();
  const t = getDictionary(forceLocale);
  const td = t.toolDetail;
  const tool = await prisma.tool.findUnique({
    where: { id: slugMatch.id },
    include: {
      category: true,
      downloadFile: true,
      tagLinks: {
        include: { tag: true },
        orderBy: { tag: { sortOrder: "asc" } },
      },
      tutorials: { where: { status: "active" }, orderBy: { sortOrder: "asc" } },
      faqs: { where: { status: "active" }, orderBy: { sortOrder: "asc" } },
      changelogs: {
        where: { status: "active" },
        orderBy: [{ releaseDate: "desc" }, { sortOrder: "asc" }],
      },
      priceSpecs: {
        where: { status: "active" },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
      comments: {
        where: { status: "approved" },
        include: { user: true },
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      },
    },
  });
  if (!tool || tool.status !== "published") notFound();

  const canonicalSlug = getCanonicalToolSlug(tool);
  if (slug !== canonicalSlug || (expectedType && tool.type !== expectedType)) {
    permanentRedirect(buildCanonicalToolPath(tool, forceLocale));
  }

  const localizedTool = resolveLocalizedToolIdentity(tool, forceLocale);
  const localizedCategoryName = resolveLocalizedToolCategoryName(
    tool.category?.name,
    tool.type,
    forceLocale,
  );
  const shouldShowSecondaryName =
    forceLocale === "zh" && Boolean(localizedTool.secondaryName);
  const toolLocalizationInput = {
    slug: tool.slug,
    name: tool.name,
    englishName: tool.englishName,
    shortDescription: tool.shortDescription,
    content: tool.content,
    type: tool.type,
    categoryName: tool.category?.name,
  };
  const localizedSummary = buildLocalizedToolSummary(
    toolLocalizationInput,
    forceLocale,
  );
  const localizedLongContent = buildLocalizedToolLongContent(
    toolLocalizationInput,
    forceLocale,
  );
  const visibleTutorials = buildLocalizedToolTutorialItems(
    tool.tutorials,
    toolLocalizationInput,
    forceLocale,
  );
  const visibleFaqs = buildLocalizedToolFaqItems(
    tool.faqs,
    toolLocalizationInput,
    forceLocale,
  );
  const visibleFaqPreview = visibleFaqs.slice(0, 3);
  const visibleChangelogs = tool.changelogs;
  const visibleComments = tool.comments
    .map((comment) => ({
      ...comment,
      localizedAuthor:
        buildLocalizedToolOptionalText(comment.user.nickname, forceLocale) ||
        comment.user.email,
      localizedContent: buildLocalizedToolOptionalText(
        comment.content,
        forceLocale,
      ),
    }))
    .filter((comment) => Boolean(comment.localizedContent));
  const isAccountService = tool.type === "online";
  const isSkillLearning = tool.type === "skill_learning";
  const isAiSkill = tool.type === "ai_skill";
  const isDownloadProduct = tool.type === "software" || isAiSkill;
  const activePriceSpecs = tool.priceSpecs.filter(
    (spec) => Number(spec.price) > 0,
  );
  const localizedPriceSpecs = activePriceSpecs.map((spec, index) => ({
    ...spec,
    localizedName: buildLocalizedToolOfferName(
      spec.name,
      tool.type,
      forceLocale,
      index,
    ),
  }));
  const localizedTagItems = buildLocalizedToolTagItems(
    tool.tagLinks,
    forceLocale,
  );
  const priceFallback = isDownloadProduct ? tool.downloadPrice : 0;
  const servicePrice = getPrimaryToolPrice(activePriceSpecs, priceFallback);
  const visibleToolMetrics = getVisibleToolMetrics({
    downloadCount: tool.downloadCount,
    usageCount: tool.usageCount,
  });
  const visibleDownloadMetric = visibleToolMetrics.find(
    (metric) => metric.type === "download",
  );
  const visibleUsageMetric = visibleToolMetrics.find(
    (metric) => metric.type === "usage",
  );
  const paidSoftware =
    tool.type === "software" && tool.isDownloadPaid && servicePrice > 0;
  const paidAiSkill = isAiSkill && tool.isDownloadPaid && servicePrice > 0;
  const paidDownloadProduct = paidSoftware || paidAiSkill;
  const isPurchasableAccountService = isAccountService && servicePrice > 0;
  const paidSkillCourse = isSkillLearning && servicePrice > 0;
  const isFreeSkillCourse = isSkillLearning && servicePrice <= 0;
  const coverImage = normalizeImageSrc(tool.coverImage);
  const productVideos = resolveProductVideos([
    {
      url: tool.videoUrl,
      title: tool.videoTitle,
      description: tool.videoDescription,
    },
    {
      url: tool.videoUrl2,
      title: tool.videoTitle2,
      description: tool.videoDescription2,
    },
    {
      url: tool.videoUrl3,
      title: tool.videoTitle3,
      description: tool.videoDescription3,
    },
  ]).map((video) => ({
    ...video,
    title: buildLocalizedToolOptionalText(video.title, forceLocale),
    description: buildLocalizedToolOptionalText(
      video.description,
      forceLocale,
    ),
  }));
  const hasDownloadPurchase = user
    ? await prisma.toolPurchase
        .findUnique({
          where: { userId_toolId: { userId: user.id, toolId: tool.id } },
        })
        .then(Boolean)
    : false;
  const shouldShowPurchaseForm =
    (paidDownloadProduct && !hasDownloadPurchase) ||
    (isPurchasableAccountService && !hasDownloadPurchase) ||
    (paidSkillCourse && !hasDownloadPurchase);
  const downloadLinkContent = getDownloadLinkContent(tool.downloadFile);
  const visibleDownloadLinkContent =
    isAiSkill
      ? forceLocale === "en"
        ? "Use the protected download button below to get the current Skill package."
        : "请使用下方受保护的下载按钮获取当前 Skill 压缩包。"
      : buildLocalizedToolOptionalText(downloadLinkContent, forceLocale) ||
        (forceLocale === "en"
          ? "Use the download button below to open the current delivery entry."
          : downloadLinkContent);
  const visibleDownloadFileName =
    buildLocalizedToolOptionalText(
      tool.downloadFile?.fileName,
      forceLocale,
    ) || td.noDownloadFileName;
  const hasDownloadLink = Boolean(
    tool.downloadFileId && tool.downloadFile && downloadLinkContent,
  );
  const showDownloadLinkArea = canShowDownloadLinkArea({
    hasDownloadLink,
    isDownloadPaid: paidDownloadProduct,
    hasDownloadPurchase,
  });
  const canOpenDownloadEntry = isAiSkill
    ? hasDownloadLink
    : canOpenProtectedDownloadEntry(downloadLinkContent);
  const publicDownloadHref = canOpenPublicDownloadEntry({
    content: downloadLinkContent,
    isDownloadPaid: paidDownloadProduct,
    hasDownloadPurchase,
  })
    ? downloadLinkContent
    : null;
  const protectedDownloadHref = `/api/tools/${tool.id}/download`;
  const softwareDownloadCtaHref = resolveSoftwareDownloadCtaHref({
    hasDownloadLink,
    showDownloadLinkArea,
    isDownloadPaid: paidDownloadProduct,
    hasDownloadPurchase,
    protectedDownloadHref,
    publicDownloadHref,
  });
  const softwareDownloadCtaEvent =
    softwareDownloadCtaHref === "#download-purchase"
      ? "product_purchase_cta_click"
      : "product_download_click";
  const related = await prisma.tool.findMany({
    where: { type: tool.type, status: "published", id: { not: tool.id } },
    include: {
      category: true,
      priceSpecs: {
        where: { status: "active" },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
    },
    take: 3,
  });
  const tutorialVideos = visibleTutorials.filter(
    (tutorial) => tutorial.videoUrl,
  );
  const hasTutorialSection = isSkillLearning || visibleTutorials.length > 0;
  const supportEmail = td.supportEmailValue;
  const publicChangelogFallback =
    forceLocale === "en"
      ? "Important version notes will be added when availability, delivery details, or usage guidance changes. Review the current page information before purchase or use."
      : "当版本、交付说明或使用建议发生变化时，ENHE AI 会在这里同步重要更新。使用或购买前，请以当前页面说明为准。";
  const publicDemoVideoFallback =
    forceLocale === "en"
      ? "Start with the written guide below to confirm the suitable scenario, access conditions, and practical usage steps."
      : "可先阅读下方图文说明，按步骤确认适用场景、使用条件和实际操作方式。";
  const publicFaqFallback =
    forceLocale === "en"
      ? "Before using this page, review the suitable scenario, delivery boundary, platform rules, and support contact. ENHE AI will continue adding common questions as the page evolves."
      : "使用前请先确认适用场景、交付边界、平台规则和支持方式；页面会随产品与课程内容持续补充常见问题。";
  const freeDownloadButtonLabel = t.toolCard.getFreeTool;
  const priceSpecHelpId = "tool-purchase-price-spec-help";
  const paymentMethodLabelId = "tool-purchase-payment-method-label";
  const paymentMethodHelpId = "tool-purchase-payment-method-help";
  const commentHelpId = "tool-comment-help";
  const purchaseButtonLabel = isAccountService
    ? td.buyService
    : paidSkillCourse
      ? td.buyCourse.replace("{price}", Number(servicePrice).toFixed(2))
      : isFreeSkillCourse
        ? t.toolCard.getFreeTool
        : servicePrice > 0
          ? td.buyDownload.replace("{price}", Number(servicePrice).toFixed(2))
          : freeDownloadButtonLabel;
  const introTitle = isAccountService ? td.serviceIntroTitle : td.introTitle;
  const productImagesIntro = isAccountService
    ? td.serviceProductImagesIntro
    : td.productImagesIntro;
  const schemaType =
    isDownloadProduct
      ? "SoftwareApplication"
      : tool.type === "online"
        ? "Service"
        : "Course";
  const schemaPrice = resolveToolDetailSchemaPrice({
    toolType: tool.type,
    isDownloadPaid: tool.isDownloadPaid,
    servicePrice,
  });
  const baseListingPath =
    tool.type === "software"
      ? buildLocalePath("/software", forceLocale)
      : tool.type === "ai_skill"
        ? buildLocalePath("/ai-skills", forceLocale)
      : tool.type === "online"
        ? buildLocalePath("/account-services", forceLocale)
        : buildLocalePath("/skill-learning", forceLocale);
  const breadcrumbSchema = buildBreadcrumbSchema({
    schemaType: "BreadcrumbList",
    items: [
      { name: t.nav.home, path: buildLocalePath("/", forceLocale) },
      {
        name:
          tool.type === "software"
            ? t.listing.softwareTitle
            : tool.type === "ai_skill"
              ? t.listing.aiSkillTitle
            : tool.type === "online"
              ? t.listing.onlineTitle
              : t.listing.skillLearningTitle,
        path: baseListingPath,
      },
      {
        name: localizedTool.primaryName,
        path: buildCanonicalToolPath(tool, forceLocale),
      },
    ],
  });
  const aggregateRating = null;
  const schemaContent = {
    faq: visibleFaqPreview.map((item) => ({
      question: item.question,
      answer: item.answer,
    })),
    aggregateRating,
  };
  const faqSchema = schemaContent.faq.length
    ? buildFaqSchema({ items: schemaContent.faq })
    : null;
  const rawToolStructuredData = buildToolStructuredData({
    schemaType,
    name: localizedTool.primaryName,
    description: buildToolMetaDescription({
      name: localizedTool.primaryName,
      englishName: forceLocale === "en" ? null : tool.englishName,
      description: localizedSummary,
      locale: forceLocale,
      brand: t.brand,
      type:
        tool.type === "online"
          ? "online"
          : tool.type === "skill_learning"
            ? "skill_learning"
            : tool.type === "ai_skill"
              ? "ai_skill"
            : "software",
    }),
    url: buildCanonicalToolPath(tool, forceLocale),
    image: coverImage,
    category: localizedCategoryName,
    operatingSystem: tool.systemRequirement ?? null,
    locale: forceLocale === "en" ? "en-US" : "zh-CN",
    price: schemaPrice,
    softwareVersion: tool.version ?? null,
    priceSpecs: localizedPriceSpecs.map((spec) => ({
      name: spec.localizedName,
      price: Number(spec.price),
    })),
    aggregateRating: schemaContent.aggregateRating,
  });
  const toolStructuredData =
    schemaType === "SoftwareApplication"
      ? rawToolStructuredData
      : {
          ...rawToolStructuredData,
          provider: enheOrganizationReference,
        };
  const rawProductStructuredData =
    isDownloadProduct
      ? buildProductStructuredData({
          name: localizedTool.primaryName,
          description: localizedSummary,
          url: buildCanonicalToolPath(tool, forceLocale),
          image: coverImage,
          brand: t.brand,
          category: localizedCategoryName,
          price: schemaPrice,
          priceSpecs: localizedPriceSpecs.map((spec) => ({
            name: spec.localizedName,
            price: Number(spec.price),
          })),
        })
      : null;
  const productStructuredData =
    rawProductStructuredData && schemaPrice === 0
      ? {
          ...rawProductStructuredData,
          offers: buildFreeToolDetailOffer(rawProductStructuredData.url),
        }
      : rawProductStructuredData;
  // Service schemas can emit hasOfferCatalog, and course schemas can emit CourseInstance when the tool data supports them.
  const detailNavItems = [
    { href: "#tool-purchase", label: purchaseButtonLabel },
    { href: "#tool-intro", label: introTitle },
    ...(hasTutorialSection
      ? [
          {
            href: "#tool-tutorials",
            label: isSkillLearning ? td.courseContentTitle : td.tutorialsTitle,
          },
        ]
      : []),
    { href: "#tool-faq", label: td.faqTitle },
    { href: "#tool-related", label: td.relatedTitle },
  ];

  return (
    <Container className="py-14">
      <StructuredData
        data={[
          breadcrumbSchema,
          toolStructuredData,
          ...(productStructuredData ? [productStructuredData] : []),
          ...(faqSchema ? [faqSchema] : []),
        ]}
      />
      <main>
        <section className="glass overflow-hidden rounded-[2rem] p-4 md:p-6 lg:p-8">
          <div className="tool-detail-hero-stack flex flex-col gap-8">
            <div className="tool-detail-cover-frame relative overflow-hidden rounded-[1.75rem] border border-[rgba(210,230,255,0.16)] bg-[#07101E]">
              <div className="relative aspect-[16/9]">
                {coverImage ? (
                  <Image
                    src={coverImage}
                    alt={localizedTool.primaryName}
                    fill
                    className="content-thumbnail-outline object-contain"
                    sizes="(min-width: 1024px) 1120px, 100vw"
                    priority
                    fetchPriority="high"
                    unoptimized
                  />
                ) : (
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(65,197,219,0.2),transparent_32%),radial-gradient(circle_at_72%_70%,rgba(255,184,107,0.16),transparent_36%),repeating-linear-gradient(135deg,rgba(238,246,255,0.08)_0_2px,transparent_2px_18px),linear-gradient(135deg,rgba(255,255,255,0.08),transparent)]" />
                )}
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-7">
              <div>
                <div className="flex flex-wrap gap-2">
                  <Badge>{localizedCategoryName ?? td.uncategorized}</Badge>
                  <Badge>
                    {tool.type === "software"
                      ? td.software
                      : tool.type === "ai_skill"
                        ? td.aiSkill
                      : tool.type === "skill_learning"
                        ? td.skillLearning
                        : td.online}
                  </Badge>
                  <Badge
                    className={
                      paidSkillCourse ||
                      (isDownloadProduct && tool.isDownloadPaid) ||
                      (isAccountService && servicePrice > 0)
                        ? "text-[#FFB86B]"
                        : "text-[#5EF1C7]"
                    }
                  >
                    {paidSkillCourse
                      ? forceLocale === "en"
                        ? "Paid course"
                        : "付费课程"
                      : tool.type === "software" && tool.isDownloadPaid
                        ? forceLocale === "en"
                          ? "Paid software"
                          : "收费软件"
                        : paidAiSkill
                          ? forceLocale === "en"
                            ? "Paid AI Skill"
                            : "收费 AI Skill"
                        : isAccountService && servicePrice > 0
                          ? forceLocale === "en"
                            ? "Paid service"
                            : "收费服务"
                          : td.free}
                  </Badge>
                  {localizedTagItems.map((tag) => (
                    <Badge
                      key={tag.id}
                      className="text-[var(--marketing-accent)]"
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>

                <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--marketing-accent)]">
                  {td.coverLabel}
                </p>
                <h1 className="mt-5 text-4xl font-semibold leading-tight text-[#F6FAFF] md:text-5xl">
                  {localizedTool.primaryName}
                </h1>
                {shouldShowSecondaryName ? (
                  <p className="mt-3 text-lg font-medium tracking-wide text-[var(--marketing-accent)] md:text-xl">
                    {localizedTool.secondaryName}
                  </p>
                ) : null}
                <p className="mt-5 max-w-3xl text-base leading-8 text-[#8F9DB2] md:text-lg">
                  {localizedSummary}
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {isAccountService ? (
                    <>
                      <Info
                        label={td.servicePrice}
                        value={
                          servicePrice > 0
                            ? `¥${servicePrice.toFixed(2)}`
                            : td.free
                        }
                      />
                      <Info
                        label={td.serviceType}
                        value={localizedCategoryName ?? td.uncategorized}
                      />
                      {visibleUsageMetric ? (
                        <Info
                          label={td.usageCount}
                          value={String(visibleUsageMetric.count)}
                          numeric
                        />
                      ) : null}
                      <Info label={td.supportEmail} value={supportEmail} />
                    </>
                  ) : (
                    <>
                      <Info
                        label={td.version}
                        value={tool.version ?? td.onlineVersion}
                      />
                      <Info
                        label={td.systemRequirement}
                        value={tool.systemRequirement ?? td.browser}
                      />
                      {isAiSkill ? (
                        <Info
                          label={td.supportedAgents}
                          value={tool.supportedAgents.length ? tool.supportedAgents.join(" / ") : "-"}
                        />
                      ) : null}
                      {visibleDownloadMetric ? (
                        <Info
                          label={td.downloadCount}
                          value={String(visibleDownloadMetric.count)}
                          numeric
                        />
                      ) : null}
                      {visibleUsageMetric ? (
                        <Info
                          label={td.usageCount}
                          value={String(visibleUsageMetric.count)}
                          numeric
                        />
                      ) : null}
                    </>
                  )}
                </div>

                {localizedPriceSpecs.length &&
                !shouldShowPurchaseForm &&
                (isAccountService ||
                  hasDownloadPurchase ||
                  !tool.isDownloadPaid) ? (
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {localizedPriceSpecs.map((spec) => (
                      <div
                        key={spec.id}
                        className="rounded-2xl border border-white/10 bg-white/8 p-4"
                      >
                        <p className="text-sm font-semibold text-[#F6FAFF]">
                          {spec.localizedName}
                        </p>
                        <p className="mt-2 text-xl font-semibold text-[#FFB86B]">
                          ¥{Number(spec.price).toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div
                  id="tool-purchase"
                  className="tool-detail-purchase-panel scroll-mt-24 mt-7 flex flex-wrap gap-3"
                >
                  {shouldShowPurchaseForm ? (
                    <form
                      id={
                        isAccountService
                          ? "service-purchase"
                          : "download-purchase"
                      }
                      action={createSoftwareDownloadOrderAction}
                      className="grid w-full gap-4"
                      data-analytics-event="begin_checkout"
                      data-analytics-entity-type="tool"
                      data-analytics-entity-id={tool.id}
                    >
                      <input type="hidden" name="toolId" value={tool.id} />
                      {localizedPriceSpecs.length ? (
                        <fieldset
                          aria-describedby={priceSpecHelpId}
                          className="grid gap-3"
                        >
                          <legend className="text-sm font-semibold text-[#F6FAFF]">
                            {forceLocale === "en" ? "Choose an offer" : "选择购买方案"}
                          </legend>
                          <p
                            id={priceSpecHelpId}
                            className="text-xs leading-5 text-[#8F9DB2]"
                          >
                            {forceLocale === "en"
                              ? "Select one offer before generating the payment QR code. The selected offer controls the order amount."
                              : "生成支付二维码前请选择一个方案，订单金额以所选方案为准。"}
                          </p>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {localizedPriceSpecs.map((spec, index) => (
                              <label
                                key={spec.id}
                              className="tool-price-option group flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-white/12 bg-white/8 p-4 text-sm transition-[background-color,border-color] hover:border-[var(--marketing-accent)]/45 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--marketing-accent)] has-[:checked]:border-[var(--marketing-accent)]/70 has-[:checked]:bg-[var(--marketing-accent)]/12"
                              >
                                <span>
                                  <span className="block font-semibold text-[#F6FAFF]">
                                    {spec.localizedName}
                                  </span>
                                  <span className="mt-1 block text-[#FFB86B]">
                                    ¥{Number(spec.price).toFixed(2)}
                                  </span>
                                </span>
                                <input
                                  name="priceSpecId"
                                  type="radio"
                                  value={spec.id}
                                  defaultChecked={index === 0}
                                  required={index === 0}
                                  aria-describedby={priceSpecHelpId}
                                  aria-label={`${spec.localizedName} ¥${Number(spec.price).toFixed(2)}`}
                                  title={
                                    forceLocale === "en"
                                      ? "Choose this purchase offer"
                                      : "选择此购买方案"
                                  }
                                  className="tool-price-radio"
                                />
                              </label>
                            ))}
                          </div>
                        </fieldset>
                      ) : null}
                      <div className="tool-detail-payment-method-grid grid gap-3">
                        <div className="max-w-[560px]">
                          <label
                            id={paymentMethodLabelId}
                            htmlFor="tool-purchase-payment-method"
                            className="block text-sm font-semibold text-[#F6FAFF]"
                          >
                            {forceLocale === "en" ? "Payment method" : "支付方式"}
                          </label>
                          <select
                            id="tool-purchase-payment-method"
                            name="paymentMethod"
                            defaultValue="wechat"
                            required
                            aria-labelledby={paymentMethodLabelId}
                            aria-describedby={paymentMethodHelpId}
                            title={
                              forceLocale === "en"
                                ? "Choose a payment method"
                                : "请选择支付方式"
                            }
                            className="mt-2 w-full rounded-full border border-white/12 bg-[#07101E] px-4 py-3 text-sm text-[#F6FAFF]"
                          >
                            <option value="alipay">{td.alipay}</option>
                            <option value="wechat">{td.wechat}</option>
                          </select>
                          <p
                            id={paymentMethodHelpId}
                            className="tool-detail-payment-help mt-2 text-xs leading-5 text-[#8F9DB2]"
                          >
                            {forceLocale === "en"
                              ? "Choose the method you will use on the payment page."
                              : "请选择后续付款页面实际使用的支付方式。"}
                          </p>
                        </div>
                        <FormSubmitButton
                          className="w-full sm:w-auto sm:justify-self-start"
                          data-analytics-event="product_purchase_cta_click"
                          data-analytics-entity-type="tool"
                          data-analytics-entity-id={tool.id}
                          pendingLabel={
                            forceLocale === "en"
                              ? "Generating payment QR..."
                              : "生成支付二维码中..."
                          }
                        >
                          {purchaseButtonLabel}
                        </FormSubmitButton>
                      </div>
                    </form>
                  ) : isDownloadProduct ? (
                    <ButtonLink
                      href={softwareDownloadCtaHref}
                      data-analytics-event={softwareDownloadCtaEvent}
                      data-analytics-entity-type="tool"
                      data-analytics-entity-id={tool.id}
                    >
                      {paidDownloadProduct && hasDownloadPurchase
                        ? isAiSkill ? td.downloadSkill : td.downloadSoftware
                        : freeDownloadButtonLabel}
                    </ButtonLink>
                  ) : (
                    <ButtonLink
                      href={
                        tool.onlineUrl
                          ? `/api/tools/${tool.id}/use`
                          : "#tool-intro"
                      }
                      data-analytics-event="product_use_cta_click"
                      data-analytics-entity-type="tool"
                      data-analytics-entity-id={tool.id}
                    >
                      {isFreeSkillCourse
                        ? t.toolCard.getFreeTool
                        : td.useOnline}
                    </ButtonLink>
                  )}
                </div>

                {isDownloadProduct && tool.isDownloadPaid ? (
                  <p className="mt-4 text-sm leading-6 text-[#FFB86B]">
                    {isAiSkill
                      ? forceLocale === "en"
                        ? "This AI Skill is a paid ZIP package. Successful payment unlocks its protected download entry."
                        : "该 AI Skill 为收费 ZIP 交付包，支付成功后系统会自动解锁受保护的下载入口。"
                      : forceLocale === "en"
                        ? "This software is a paid download. Successful payment automatically unlocks this tool's download-link content."
                        : "该软件为收费下载，支付成功后系统会自动解锁该工具的下载链接内容。"}
                  </p>
                ) : isPurchasableAccountService ? (
                  <p className="mt-4 text-sm leading-6 text-[#FFB86B]">
                    {forceLocale === "en"
                      ? "This account service requires purchase. Successful payment automatically unlocks this service for your account."
                      : "该账号服务为付费服务，支付成功后系统会自动解锁该服务的使用权限。"}
                  </p>
                ) : null}
              </div>

              <div
                id="tool-changelog"
                className="scroll-mt-24 rounded-2xl border border-[rgba(210,230,255,0.14)] bg-[rgba(238,246,255,0.06)] p-5"
              >
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-xl font-semibold text-[#F6FAFF]">
                    {td.changelogTitle}
                  </h2>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-[#8F9DB2]">
                    {td.changelogCount.replace(
                      "{count}",
                      String(visibleChangelogs.length),
                    )}
                  </span>
                </div>
                <div className="mt-4 grid gap-3">
                  {visibleChangelogs.length ? (
                    visibleChangelogs.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-white/10 bg-white/8 p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-[var(--marketing-accent)]">
                            {item.version}
                          </p>
                          {item.releaseDate ? (
                            <p className="text-xs text-[#8F9DB2]">
                              {item.releaseDate.toLocaleDateString(
                                forceLocale === "en" ? "en-US" : "zh-CN",
                              )}
                            </p>
                          ) : null}
                        </div>
                        <h3 className="mt-2 font-semibold text-[#F6FAFF]">
                          {item.title}
                        </h3>
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#8F9DB2]">
                          {item.content}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-2xl border border-white/10 bg-white/8 p-4 text-sm leading-6 text-[#8F9DB2]">
                      {publicChangelogFallback}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <nav className="tool-detail-mobile-toc" aria-label="Product detail sections">
          {detailNavItems.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-10 space-y-10">
          <section
            id="tool-intro"
            className="glass scroll-mt-24 rounded-2xl p-7"
          >
            <SectionTitle title={td.trustTitle} intro={td.trustIntro} />
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <TrustItem label={td.demoVideo}>
                {tutorialVideos.length ? (
                  <div className="space-y-2">
                    {tutorialVideos.slice(0, 2).map((tutorial) => (
                      <a
                        key={tutorial.id}
                        href={tutorial.videoUrl ?? "#"}
                        target="_blank"
                        rel="nofollow noopener noreferrer"
                        className="tool-detail-touch-link break-all text-sm leading-6 text-[var(--marketing-accent)] hover:text-[#8feaff]"
                      >
                        {tutorial.title}
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm leading-6 text-[#8F9DB2]">
                    {publicDemoVideoFallback}
                  </p>
                )}
              </TrustItem>
              <TrustItem
                label={isAccountService ? td.serviceType : td.systemRequirement}
              >
                {isAccountService ? (
                  <p className="text-sm leading-6 text-[#C5D0E2]">
                    {localizedCategoryName ?? td.uncategorized}
                  </p>
                ) : (
                  <>
                    <p className="text-sm leading-6 text-[#C5D0E2]">
                      {tool.systemRequirement ?? td.browser}
                    </p>
                    <p className="mt-2 text-xs text-[#8F9DB2]">
                      {td.version}: {tool.version ?? td.onlineVersion}
                    </p>
                  </>
                )}
              </TrustItem>
              <TrustItem label={td.updateLog}>
                <p className="text-sm leading-6 text-[#C5D0E2]">
                  {td.changelogCount.replace(
                    "{count}",
                    String(visibleChangelogs.length),
                  )}
                </p>
                <Link
                  href="#tool-changelog"
                  className="tool-detail-touch-link mt-2 text-sm font-semibold text-[var(--marketing-accent)] hover:text-[#8feaff]"
                >
                  {td.changelogTitle}
                </Link>
              </TrustItem>
              <TrustItem label={td.supportEmail}>
                <a
                  href={`mailto:${supportEmail}`}
                  className="tool-detail-touch-link break-all text-sm font-semibold text-[var(--marketing-accent)] hover:text-[#8feaff]"
                >
                  {supportEmail}
                </a>
                <Link
                  href={buildLocalePath(
                    "/legal/membership-refund",
                    forceLocale,
                  )}
                  className="tool-detail-touch-link mt-2 text-sm leading-6 text-[#FFB86B] hover:text-[#FFD29B]"
                >
                  {td.refundRulesIntro}
                </Link>
              </TrustItem>
            </div>
          </section>

          <details
            className="tool-detail-mobile-disclosure glass rounded-2xl p-7"
            open
          >
            <summary className="tool-detail-disclosure-summary">
              {introTitle}
            </summary>
            <div className="tool-detail-disclosure-body">
              <SectionTitle title={introTitle} intro={productImagesIntro} />
              <div className="mt-6 space-y-7">
              {productVideos.map((video) => (
                <div key={video.src} className="tool-detail-product-video overflow-hidden rounded-2xl border border-white/10 bg-[#07101E]">
                  <ProductVideoPlayer
                    src={video.src}
                    title={video.title || `${localizedTool.primaryName} ${td.demoVideo}`}
                    fallbackText={
                      forceLocale === "en"
                        ? "Your browser does not support embedded video playback."
                        : "您的浏览器不支持内嵌视频播放。"
                    }
                    playLabel={forceLocale === "en" ? "Play product video" : "播放产品视频"}
                    poster={coverImage}
                    deferUntilClicked
                  />
                  {video.title || video.description ? (
                    <div className="border-t border-white/10 bg-white/6 p-5">
                      {video.title ? (
                        <h2 className="text-lg font-semibold text-[#F6FAFF]">
                          {video.title}
                        </h2>
                      ) : null}
                      {video.description ? (
                        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#8F9DB2]">
                          {video.description}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))}
              {tool.screenshots.length ? (
                <div className="tool-detail-product-gallery grid gap-5">
                  {tool.screenshots.map((screenshot, index) => {
                    const imageSrc = normalizeImageSrc(screenshot);
                    return (
                      <div
                        key={`${screenshot}-${index}`}
                        className="tool-detail-product-image-frame overflow-hidden rounded-2xl bg-transparent"
                      >
                        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-transparent">
                          {imageSrc ? (
                            <Image
                              src={imageSrc}
                              alt={`${localizedTool.primaryName} ${td.productImageAlt} ${index + 1}`}
                              fill
                              className="content-thumbnail-outline object-contain"
                              sizes="(min-width: 1024px) 1040px, 100vw"
                              unoptimized
                            />
                          ) : (
                            <div className="absolute inset-0 bg-white/6" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
              <div className="tool-detail-copy-card rounded-2xl border border-white/10 bg-white/8 p-5">
                <ToolRichContent content={localizedLongContent} />
              </div>
              </div>
            </div>
          </details>

          {hasTutorialSection ? (
          <details
            id="tool-tutorials"
            className="tool-detail-mobile-disclosure glass scroll-mt-24 rounded-2xl p-7"
            open
          >
            <summary className="tool-detail-disclosure-summary">
              {isSkillLearning ? td.courseContentTitle : td.tutorialsTitle}
            </summary>
            <div className="tool-detail-disclosure-body">
              <SectionTitle
                title={
                  isSkillLearning ? td.courseContentTitle : td.tutorialsTitle
                }
                intro={td.tutorialsIntro}
              />
              {paidSkillCourse && !hasDownloadPurchase ? (
              <div className="rounded-2xl border border-[#FFB86B]/25 bg-[#FFB86B]/8 p-6 text-center">
                <p className="text-sm font-semibold text-[#FFB86B]">
                  {forceLocale === "en"
                    ? "Please purchase this course to view the content"
                    : "请先购买课程后查看课程内容"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {visibleTutorials.map((tutorial) => (
                  <div
                    key={tutorial.id}
                    className="rounded-2xl border border-white/10 bg-white/8 p-5"
                  >
                    <h3 className="mt-2 text-xl font-semibold">
                      {tutorial.title}
                    </h3>
                    <ToolRichContent
                      content={tutorial.content}
                      tone="muted"
                      className="mt-3 text-sm leading-7"
                    />
                    {tutorial.notes ? (
                      <div className="mt-4 rounded-xl border border-[#5EF1C7]/20 bg-[#5EF1C7]/8 p-4">
                        <p className="text-sm font-semibold text-[#5EF1C7]">
                          {td.notes}
                        </p>
                        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#8F9DB2]">
                          {tutorial.notes}
                        </p>
                      </div>
                    ) : null}
                    {tutorial.commonErrors ? (
                      <div className="mt-4 rounded-xl border border-[#FFB86B]/20 bg-[#FFB86B]/8 p-4">
                        <p className="text-sm font-semibold text-[#FFB86B]">
                          {td.commonErrors}
                        </p>
                        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#8F9DB2]">
                          {tutorial.commonErrors}
                        </p>
                      </div>
                    ) : null}
                    {tutorial.videoUrl ? (
                      <p className="mt-3 text-sm text-[#C4B5FD]">
                        {tutorial.videoUrl}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
              )}
            </div>
          </details>
          ) : null}

          <section
            id="tool-faq"
            className="tool-detail-faq-card glass scroll-mt-24 rounded-2xl p-7"
          >
            <SectionTitle title={td.faqTitle} />
            <div className="mt-5 grid gap-3">
              {visibleFaqPreview.length ? (
                visibleFaqPreview.map((faq) => (
                  <details
                    key={faq.id}
                    className="rounded-2xl border border-white/10 bg-white/8 p-5"
                  >
                    <summary className="cursor-pointer list-none font-semibold text-[#F6FAFF] [&::-webkit-details-marker]:hidden">
                      {faq.question}
                    </summary>
                    <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#8F9DB2]">
                      {faq.answer}
                    </p>
                  </details>
                ))
              ) : (
                <p className="rounded-2xl border border-white/10 bg-white/8 p-5 text-sm leading-6 text-[#8F9DB2]">
                  {publicFaqFallback}
                </p>
              )}
            </div>
          </section>

          <section className="glass rounded-2xl p-7">
            <SectionTitle title={td.commentsTitle} />
            {user ? (
              <form action={createCommentAction} className="mb-6">
                <input type="hidden" name="toolId" value={tool.id} />
                <input type="hidden" name="slug" value={tool.slug} />
                <label
                  htmlFor="tool-comment-content"
                  className="mb-2 block text-sm font-semibold text-[#F6FAFF]"
                >
                  {forceLocale === "en" ? "Comment" : "评论内容"}
                </label>
                <textarea
                  id="tool-comment-content"
                  name="content"
                  required
                  minLength={2}
                  maxLength={1000}
                  aria-describedby={commentHelpId}
                  title={
                    forceLocale === "en"
                      ? "Enter 2 to 1000 characters before submitting."
                      : "请输入 2 到 1000 个字符后提交。"
                  }
                  className="min-h-28 w-full rounded-xl border border-white/12 bg-white/8 p-4 outline-none"
                  placeholder={td.commentPlaceholder}
                />
                <p
                  id={commentHelpId}
                  className="mt-2 text-xs leading-5 text-[#8F9DB2]"
                >
                  {forceLocale === "en"
                    ? "Required. Use 2 to 1000 characters. Reviews appear after moderation."
                    : "必填，2 到 1000 个字符。评论通过审核后展示。"}
                </p>
                <FormSubmitButton
                  className="mt-3 text-base"
                  pendingLabel={
                    forceLocale === "en" ? "Submitting..." : "提交中..."
                  }
                >
                  {td.submitComment}
                </FormSubmitButton>
              </form>
            ) : (
              <p className="mb-6 text-sm text-[#8F9DB2]">{td.loginToComment}</p>
            )}
            <div className="space-y-3">
              {visibleComments.map((comment) => (
                <div
                  key={comment.id}
                  className="rounded-2xl border border-white/10 bg-white/8 p-4"
                >
                  <p className="text-sm text-[#8F9DB2]">
                    {comment.localizedAuthor}{" "}
                    {comment.isPinned ? (
                      <span className="text-[#FFB86B]">· {td.pinned}</span>
                    ) : null}
                  </p>
                  <p className="mt-2 leading-7">{comment.localizedContent}</p>
                </div>
              ))}
            </div>
          </section>

          {showDownloadLinkArea ? (
            <section
              id="download-links"
              className="glass scroll-mt-24 rounded-2xl p-7"
            >
              <SectionTitle
                title={td.downloadLinksTitle}
                intro={td.downloadLinksIntro}
              />
              <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/8 p-5">
                <div className="min-w-0">
                  <p className="text-sm text-[#8F9DB2]">
                    {td.protectedDownloadLink}
                  </p>
                  <LinkedDownloadLinkContent
                    content={visibleDownloadLinkContent}
                  />
                  <p className="mt-2 text-sm text-[#8F9DB2]">
                    {visibleDownloadFileName}
                  </p>
                </div>
                {canOpenDownloadEntry ? (
                  <div>
                    <ButtonLink
                      href={protectedDownloadHref}
                      data-analytics-event="product_download_click"
                      data-analytics-entity-type="tool"
                      data-analytics-entity-id={tool.id}
                    >
                      {td.downloadNow}
                    </ButtonLink>
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}
        </div>

        <details
          id="tool-related"
          className="tool-detail-mobile-disclosure mt-12 scroll-mt-24"
        >
          <summary className="tool-detail-disclosure-summary">
            {td.relatedTitle}
          </summary>
          <div className="tool-detail-disclosure-body">
            <SectionTitle title={td.relatedTitle} />
            <div className="grid gap-5 md:grid-cols-3">
              {related.map((item) => (
                <ToolCard key={item.id} tool={item} locale={forceLocale} />
              ))}
            </div>
          </div>
        </details>
      </main>
    </Container>
  );
}

function Info({ label, value, numeric = false }: { label: string; value: string; numeric?: boolean }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/8 p-4">
      <p className="text-xs text-[#8F9DB2]">{label}</p>
      <p className={`mt-2 font-semibold text-[#F6FAFF]${numeric ? " tabular-nums" : ""}`}>{value}</p>
    </div>
  );
}

function TrustItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/8 p-5">
      <p className="text-sm font-semibold text-[#F6FAFF]">{label}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function LinkedDownloadLinkContent({ content }: { content: string }) {
  const segments = linkifyDownloadLinkContent(content);

  return (
    <p className="mt-2 whitespace-pre-wrap break-words text-base font-semibold leading-7 text-[#F6FAFF]">
      {segments.map((segment, index) =>
        segment.type === "link" ? (
          <a
            key={`${segment.href}-${index}`}
            href={segment.href}
            target="_blank"
            rel="nofollow noopener noreferrer"
      className="break-all text-[var(--marketing-accent)] underline decoration-[rgba(65,197,219,0.5)] underline-offset-4 transition-colors hover:text-[#8feaff]"
          >
            {segment.text}
          </a>
        ) : (
          <span key={`${segment.text}-${index}`}>{segment.text}</span>
        ),
      )}
    </p>
  );
}
