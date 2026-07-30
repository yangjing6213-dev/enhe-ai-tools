import Image from "next/image";
import { ArrowUpRight, Check, Download, MousePointer2, UserRound } from "lucide-react";
import { PrefetchLink } from "@/components/prefetch-link";
import { Badge } from "@/components/ui";
import { getDictionary, type Locale } from "@/lib/i18n";
import { normalizeImageSrc } from "@/lib/media";
import { buildCanonicalToolPath } from "@/lib/public-slugs";
import { buildToolCardHighlights } from "@/lib/tool-card-highlights";
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
  variant?: "default" | "homeFeatured";
  tool: {
    name: string;
    englishName?: string | null;
    slug: string;
    type: "software" | "online" | "skill_learning" | "ai_skill";
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
  const coverImage = normalizeImageSrc(tool.coverImage);
  const localizedTool = resolveLocalizedToolIdentity(tool, locale);
  const localizedCategory = resolveLocalizedToolCategoryName(tool.category?.name, tool.type, locale);
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
  const isDownloadProduct = tool.type === "software" || tool.type === "ai_skill";
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
    <PrefetchLink href={buildCanonicalToolPath(tool, locale)} className="surface-panel group block overflow-hidden transition-[border-color,transform] hover:-translate-y-1 hover:border-[var(--marketing-accent)]/45">
      <div className="relative aspect-[16/9] overflow-hidden border-b border-white/14 bg-[#101821]">
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
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(65,197,219,0.16),transparent_34%),radial-gradient(circle_at_72%_72%,rgba(255,255,255,0.1),transparent_36%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#101821]/90 via-transparent to-transparent" />
      </div>

      <div className="p-5">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            {showMarketingMeta ? (
              <div className="mb-3 flex flex-wrap gap-2">
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
            <Heading className="text-xl font-bold text-[var(--marketing-text)]">{localizedTool.primaryName}</Heading>
            {shouldShowSecondaryName ? <p className="mt-1 text-sm font-medium text-[var(--marketing-accent)]">{localizedTool.secondaryName}</p> : null}
            {tool.type === "ai_skill" && tool.supportedAgents?.length ? (
              <div className="mt-3 flex flex-wrap gap-2" aria-label={t.toolDetail.supportedAgents}>
                {tool.supportedAgents.map((agent) => (
                  <Badge key={agent}>{agent}</Badge>
                ))}
              </div>
            ) : null}
          </div>
          <ArrowUpRight className="text-[var(--marketing-muted)] transition-colors group-hover:text-[var(--marketing-accent)]" />
        </div>
        <p className="min-h-14 text-sm leading-6 text-[var(--marketing-soft-text)]">
          <span className="font-semibold text-[var(--marketing-accent)]">{t.toolCard.valuePrefix}:</span>
          {summary}
        </p>
        {showMarketingMeta ? (
          <>
            <div className="mt-5 grid gap-2">
              {highlights.map((item) => (
                <span key={item} className="inline-flex items-center gap-2 text-sm text-[var(--marketing-muted)]">
                  <Check size={14} className="shrink-0 text-[var(--marketing-accent)]" />
                  {item}
                </span>
              ))}
            </div>
            <div className="mt-5 flex items-center gap-2 rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-xs text-[var(--marketing-muted)]">
              <UserRound size={14} className="shrink-0 text-[var(--marketing-accent)]" />
              <span>
                {t.toolCard.audienceLabel}: {audience}
              </span>
            </div>
          </>
        ) : null}
        {showMarketingMeta ? (
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
        <div className="mt-6 flex items-center justify-between gap-4 text-xs text-[var(--marketing-muted)]">
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
    </PrefetchLink>
  );
}

function buildValueSentence(description: string, locale: Locale) {
  const sentence = description.split(/[。?!；，,.!?]/).find(Boolean)?.trim() ?? description.trim();
  const maxLength = locale === "zh" ? 44 : 86;
  return sentence.length > maxLength ? `${sentence.slice(0, maxLength - 1)}...` : sentence;
}

function buildCardHighlights(tool: ToolCardProps["tool"], locale: Locale) {
  return buildToolCardHighlights(tool, locale);
}
