import Image from "next/image";
import { ArrowUpRight, Check, Download, MousePointer2, UserRound } from "lucide-react";
import { PrefetchLink } from "@/components/prefetch-link";
import { Badge } from "@/components/ui";
import { Card } from "@/components/ui/card";
import { getDictionary, type Locale } from "@/lib/i18n";
import { resolveToolImageSrc } from "@/lib/tool-image";
import { buildCanonicalToolPath } from "@/lib/public-slugs";
import { buildToolCardHighlights, buildValueSentence } from "@/lib/tool-card-highlights";
import {
  buildLocalizedToolPreviewText,
  resolveLocalizedToolCategoryName,
  resolveLocalizedToolIdentity
} from "@/lib/tool-localization";
import { getVisibleToolMetrics } from "@/lib/tool-metrics";
import { getPrimaryToolPrice, type ToolPriceSpecStatus } from "@/lib/tool-price-specs";

type ToolCardProps = {
  headingLevel?: 2 | 3;
  locale?: Locale;
  variant?: "default" | "homeFeatured" | "compact";
  tool: {
    name: string;
    englishName?: string | null;
    slug: string;
    type: "software" | "online" | "skill_learning" | "ai_skill" | "ai_workflow";
    shortDescription: string;
    coverImage?: string | null;
    isVipRequired: boolean;
    downloadCount: number;
    usageCount: number;
    isDownloadPaid?: boolean;
    downloadPrice?: unknown;
    priceSpecs?: { price: unknown; status: ToolPriceSpecStatus }[];
    supportedAgents?: string[];
    category?: { name: string } | null;
  };
};

export function ToolCard({
  tool,
  headingLevel = 3,
  locale = "zh",
  variant = "default",
}: ToolCardProps) {
  const t = getDictionary(locale);
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const coverImage = resolveToolImageSrc(tool.coverImage);
  const localizedTool = resolveLocalizedToolIdentity(tool, locale);
  const localizedCategory = resolveLocalizedToolCategoryName(tool.category?.name, tool.type, locale);
  const isCompact = variant === "compact";
  const showMarketingMeta = variant !== "homeFeatured";
  const shouldShowSecondaryName = locale === "zh" && Boolean(localizedTool.secondaryName);
  const summary = buildValueSentence(
    buildLocalizedToolPreviewText(
      {
        slug: tool.slug,
        name: tool.name,
        englishName: tool.englishName,
        shortDescription: tool.shortDescription,
        type: tool.type,
        categoryName: tool.category?.name
      },
      locale
    ),
    locale
  );
  const highlights = showMarketingMeta ? buildCardHighlights(tool, locale) : [];
  const audience = showMarketingMeta ? localizedCategory || t.toolCard.defaultAudience : "";
  const isDownloadProduct = tool.type === "software" || tool.type === "ai_skill" || tool.type === "ai_workflow";
  const priceFallback = isDownloadProduct ? tool.downloadPrice : 0;
  const servicePrice = getPrimaryToolPrice(tool.priceSpecs ?? [], priceFallback);
  const isPositivePrice = Number.isFinite(servicePrice) && servicePrice > 0;
  const showPrice =
    showMarketingMeta &&
    ((isDownloadProduct && tool.isDownloadPaid && isPositivePrice) ||
      (tool.type === "online" && isPositivePrice) ||
      (tool.type === "skill_learning" && isPositivePrice));
  const commerceLabel = showPrice ? `¥${servicePrice.toFixed(2)}` : t.toolCard.free;
  const deliveryLabel =
    tool.type === "software"
      ? t.toolCard.deliveryDownload
      : tool.type === "ai_skill"
        ? t.toolCard.deliverySkill
      : tool.type === "online"
        ? t.toolCard.deliveryService
        : t.toolCard.deliveryCourse;
  const primaryActionLabel = showPrice ? t.toolCard.compareBeforeBuy : t.toolCard.getFreeTool;
  const visibleMetrics = getVisibleToolMetrics({
    downloadCount: tool.downloadCount,
    usageCount: tool.usageCount,
  });

  return (
    <PrefetchLink href={buildCanonicalToolPath(tool, locale)} className="group block rounded-2xl focus-visible:outline-none">
      <Card className={`surface-panel tool-product-card group overflow-hidden rounded-2xl border border-border bg-card p-0 text-card-foreground shadow-sm transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-1 hover:border-primary/45 hover:shadow-lg${isCompact ? " tool-product-card-compact" : ""}`}>
      <div className="tool-product-card-cover relative aspect-[16/9] overflow-hidden border-b border-border bg-muted">
        {coverImage ? (
          <Image
            src={coverImage}
            alt={localizedTool.primaryName}
            fill
            className="content-thumbnail-outline object-cover opacity-90 transition-[opacity,transform] duration-500 group-hover:scale-[1.04] group-hover:opacity-100"
            sizes="(min-width: 1024px) 420px, 100vw"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,color-mix(in_srgb,var(--primary)_16%,transparent),transparent_34%),radial-gradient(circle_at_72%_72%,color-mix(in_srgb,var(--foreground)_8%,transparent),transparent_36%),linear-gradient(135deg,color-mix(in_srgb,var(--foreground)_6%,transparent),transparent)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-transparent to-transparent" />
      </div>

      <div className={`tool-product-card-body ${isCompact ? "tool-product-card-body-compact" : "p-5"}`}>
        <div className={`tool-product-card-heading flex items-start justify-between ${isCompact ? "mb-2 gap-3" : "mb-5 gap-4"}`}>
          <div>
            {showMarketingMeta ? (
              <div className={`flex flex-wrap gap-2 ${isCompact ? "mb-2" : "mb-3"}`}>
                <Badge>{localizedCategory || t.toolCard.uncategorized}</Badge>
                {showPrice ? (
                  <Badge className="border-[var(--marketing-accent)]/35 text-[var(--marketing-accent)]">
                    {tool.type === "online" ? t.toolCard.servicePrice : tool.type === "skill_learning" ? t.toolCard.capabilityPaidCourse : t.toolCard.paidDownload} ¥{servicePrice.toFixed(2)}
                  </Badge>
                ) : (
                  <Badge>{t.toolCard.free}</Badge>
                )}
              </div>
            ) : null}
            <Heading className={`${isCompact ? "text-lg leading-snug" : "text-xl"} font-bold text-[var(--marketing-text)]`}>{localizedTool.primaryName}</Heading>
            {shouldShowSecondaryName ? <p className={`mt-1 text-sm font-medium text-[var(--marketing-accent)]${isCompact ? " line-clamp-1" : ""}`}>{localizedTool.secondaryName}</p> : null}
            {tool.type === "ai_skill" && tool.supportedAgents?.length ? (
              <div className={`mt-3 flex flex-wrap gap-2${isCompact ? " tool-product-card-supported-agents" : ""}`} aria-label={t.toolDetail.supportedAgents}>
                {tool.supportedAgents.map((agent) => (
                  <Badge key={agent}>{agent}</Badge>
                ))}
              </div>
            ) : null}
          </div>
          <ArrowUpRight className="text-[var(--marketing-muted)] transition-colors group-hover:text-[var(--marketing-accent)]" />
        </div>
        <p className={`text-sm text-[var(--marketing-soft-text)]${isCompact ? " tool-product-card-summary leading-5" : " min-h-14 leading-6"}`}>
          <span className="font-semibold text-[var(--marketing-accent)]">{t.toolCard.valuePrefix}:</span>
          {summary}
        </p>
        {showMarketingMeta ? (
          <>
            <div className={`grid gap-2${isCompact ? " tool-product-card-highlights mt-2" : " mt-5"}`}>
              {highlights.slice(0, isCompact ? 2 : highlights.length).map((item) => (
                <span key={item} className="inline-flex items-center gap-2 text-sm text-[var(--marketing-muted)]">
                  <Check size={14} className="shrink-0 text-[var(--marketing-accent)]" />
                  {item}
                </span>
              ))}
            </div>
            {!isCompact ? <div className="mt-5 flex items-center gap-2 rounded-xl border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
              <UserRound size={14} className="shrink-0 text-[var(--marketing-accent)]" />
              <span>
                {t.toolCard.audienceLabel}: {audience}
              </span>
            </div> : null}
          </>
        ) : null}
        {showMarketingMeta && !isCompact ? (
          <div className="tool-card-commerce" aria-label={`${t.toolCard.priceLabel}: ${commerceLabel}`}>
            <div>
              <span>{t.toolCard.priceLabel}</span>
              <strong>{commerceLabel}</strong>
            </div>
            <div>
              <span>{t.toolCard.deliveryLabel}</span>
              <strong>{deliveryLabel}</strong>
            </div>
          </div>
        ) : null}
        <div className={`tool-product-card-footer flex items-center justify-between gap-4 text-xs text-[var(--marketing-muted)]${isCompact ? " mt-3" : " mt-6"}`}>
          {visibleMetrics.length ? (
            <span className="inline-flex items-center gap-3">
              {visibleMetrics.map((metric) => (
                <span key={metric.type} className="inline-flex items-center gap-1 tabular-nums">
                  {metric.type === "download" ? (
                    <Download size={14} />
                  ) : (
                    <MousePointer2 size={14} />
                  )}
                  {metric.count}
                </span>
              ))}
            </span>
          ) : null}
          <span className="tool-card-primary-action ml-auto">
            {primaryActionLabel}
            <ArrowUpRight size={14} aria-hidden="true" />
          </span>
        </div>
      </div>
      </Card>
    </PrefetchLink>
  );
}

function buildCardHighlights(tool: ToolCardProps["tool"], locale: Locale) {
  return buildToolCardHighlights(tool, locale);
}
