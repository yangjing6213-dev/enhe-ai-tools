"use client";

import Image from "next/image";
import { CardLikeAction } from "@/components/card-like-action";
import { useState } from "react";
import { ArrowUpRight, Check, Download, MousePointer2, ShieldCheck, UserRound } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getDictionary, type Locale } from "@/lib/dictionaries";
import { buildValueSentence } from "@/lib/tool-card-highlights";
import { getVisibleToolMetrics } from "@/lib/tool-metrics";

import type { SoftwareCatalogItem } from "@/lib/redesign/software/software-production";

export function EnheRedesignSoftwareCard({
  product,
  locale,
  categoryLabel,
  sectionId,
  extraHidden = false,
  listItem = false,
}: {
  product: SoftwareCatalogItem;
  locale: Locale;
  categoryLabel: string;
  sectionId: "new-releases" | "featured-products" | "all-products";
  extraHidden?: boolean;
  listItem?: boolean;
}) {
  const [mediaFailed, setMediaFailed] = useState(false);
  const showTextCover = product.media === null || mediaFailed;
  const headingId = `${sectionId}-${product.id}-title`;
  const t = getDictionary(locale).toolCard;
  const summary = buildValueSentence(product.description, locale);
  const metrics = getVisibleToolMetrics(product);
  const CardElement = listItem ? "div" : "article";
  const catalogImageSrc = product.media?.src.startsWith("/api/tool-images?")
    ? `${product.media.src}&mode=optimizer-source`
    : product.media?.src;
  const reviewDate = product.securityReviewedAt
    ? new Intl.DateTimeFormat(locale === "en" ? "en-US" : "zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone: "Asia/Shanghai",
      }).format(new Date(product.securityReviewedAt))
    : null;

  return (
    <Card
      asChild
      className="redesign-software-card"
    >
      <CardElement
        data-catalog-card
        data-category={product.categoryId}
        data-section={sectionId}
        data-extra-card={extraHidden ? "true" : undefined}
        hidden={extraHidden}
        role={listItem ? "listitem" : undefined}
        aria-labelledby={headingId}
      >
        <a
          className="redesign-software-card-full-link"
          href={product.detailHref}
          aria-labelledby={headingId}
        >
          <div className="redesign-software-card-frame">
            {product.media && !showTextCover ? (
              <Image
                className="redesign-software-card-media"
                src={catalogImageSrc ?? product.media.src}
                alt={product.media.alt}
                width={product.media.width}
                height={product.media.height}
                sizes="(min-width: 768px) 392px, 84vw"
                onError={() => setMediaFailed(true)}
              />
            ) : null}
            {showTextCover ? (
              <div className="redesign-software-card-cover" aria-hidden="true">
                <span>ENHE AI</span>
                <strong>{product.name}</strong>
              </div>
            ) : null}
          </div>
          <div className="redesign-software-card-body">
            <div className="redesign-software-card-badges">
              <p className="redesign-software-card-category">{categoryLabel}</p>
              <span
                className="redesign-software-card-link"
                data-support-exclusion={sectionId}
                aria-hidden="true"
              >
                <ArrowUpRight size={18} />
              </span>
            </div>
            <div className="redesign-software-card-identity">
              <h3 id={headingId}>{product.name}</h3>
              {product.secondaryName ? <p className="redesign-software-card-secondary">{product.secondaryName}</p> : null}
            </div>
            <p className="redesign-software-card-description"><strong>{t.valuePrefix}:</strong>{summary}</p>
            <ul className="redesign-software-card-highlights">
              {product.highlights.map((highlight) => (
                <li key={highlight}><Check size={14} aria-hidden="true" />{highlight}</li>
              ))}
            </ul>
            <p className="redesign-software-card-audience"><UserRound size={14} aria-hidden="true" />{t.audienceLabel}: {categoryLabel}</p>
            {reviewDate ? (
              <div className="redesign-software-card-trust" data-trust-safety>
                <ShieldCheck size={18} aria-hidden="true" />
                <span>
                  <strong>{locale === "en" ? "Manual safety review" : "安全审核已完成"}</strong>
                  <small>{locale === "en" ? `Confirmed by ENHE AI admin · ${reviewDate}` : `ENHE AI 管理员人工确认 · ${reviewDate}`}</small>
                </span>
              </div>
            ) : null}
            {metrics.length ? <div className="redesign-software-card-bottom">
              <span className="redesign-software-card-metrics">
                {metrics.map((metric) => <span key={metric.type}>
                  {metric.type === "download" ? <Download size={14} aria-hidden="true" /> : <MousePointer2 size={14} aria-hidden="true" />}
                  {metric.count}
                </span>)}
              </span>
            </div> : null}
          </div>
        </a>
        <CardLikeAction kind="tool" id={product.id} locale={locale} />
      </CardElement>
    </Card>
  );
}
