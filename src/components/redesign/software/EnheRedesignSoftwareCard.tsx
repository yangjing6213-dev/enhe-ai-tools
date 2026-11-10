"use client";

import Image from "next/image";
import { CardLikeAction } from "@/components/card-like-action";
import { useState } from "react";
import { ArrowUpRight, Download, MousePointer2, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getDictionary, type Locale } from "@/lib/dictionaries";
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
  const valueProposition = product.valueProposition;
  const metrics = getVisibleToolMetrics(product).filter(
    (metric) => product.type !== "ai_skill" || metric.type !== "download",
  );
  const hasSafetyReview = Boolean(product.securityReviewedAt);
  const CardElement = listItem ? "div" : "article";
  const catalogImageSrc = product.media?.src.startsWith("/api/tool-images?")
    ? `${product.media.src}&mode=optimizer-source`
    : product.media?.src;
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
            <p className="redesign-software-card-description redesign-software-card-value">
              {valueProposition ? <><strong>{t.valuePrefix}:</strong>{valueProposition}</> : null}
            </p>
            <p className="redesign-software-card-price" aria-label={`${t.priceLabel}: ${product.price}`}>
              {product.price}
            </p>
            <div className="redesign-software-card-trust-list">
              {hasSafetyReview ? (
                <div className="redesign-software-card-trust" data-trust-safety>
                  <ShieldCheck size={18} aria-hidden="true" />
                  <span><strong>{locale === "en" ? "Safety review passed" : "安全审核通过"}</strong></span>
                </div>
              ) : null}
            </div>
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
        <CardLikeAction kind="tool" id={product.id} locale={locale} downloadCount={product.downloadCount} />
      </CardElement>
    </Card>
  );
}
