"use client";

import Image from "next/image";
import { useState } from "react";
import { ArrowUpRight, Check, Download, MousePointer2, UserRound } from "lucide-react";
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

  return (
    <Card
      asChild
      className="redesign-software-card"
    >
      <article
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
                src={product.media.src}
                alt={product.media.alt}
                width={product.media.width}
                height={product.media.height}
                sizes="(min-width: 768px) 392px, 84vw"
                unoptimized={product.media.src.startsWith("/api/tool-images?")}
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
      </article>
    </Card>
  );
}
