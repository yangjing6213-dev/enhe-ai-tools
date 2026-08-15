"use client";

import { useState } from "react";

import type { RedesignLocale } from "@/components/redesign/types";
import type { SoftwareCatalogItem } from "@/lib/redesign/software/software-production";

export function EnheRedesignSoftwareCard({
  locale,
  product,
  categoryLabel,
  detailLabel,
  sectionId,
  extraHidden = false,
}: {
  locale: RedesignLocale;
  product: SoftwareCatalogItem;
  categoryLabel: string;
  detailLabel: string;
  sectionId: "new-releases" | "featured-products" | "all-products";
  extraHidden?: boolean;
}) {
  const [mediaFailed, setMediaFailed] = useState(false);
  const showTextCover = product.media === null || mediaFailed;
  const headingId = `${sectionId}-${product.id}-title`;
  const descriptionId = `${sectionId}-${product.id}-description`;

  return (
    <article
      className="redesign-software-card"
      data-catalog-card
      data-category={product.categoryId}
      data-section={sectionId}
      data-extra-card={extraHidden ? "true" : undefined}
      hidden={extraHidden}
      aria-labelledby={headingId}
      aria-describedby={descriptionId}
    >
      <div className="redesign-software-card-frame">
        {product.media && !showTextCover ? (
          <img
            className="redesign-software-card-media"
            src={product.media.src}
            alt={product.media.alt}
            width={product.media.width}
            height={product.media.height}
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
        <p className="redesign-software-card-category">{categoryLabel}</p>
        <h3 id={headingId}>{product.name}</h3>
        <p id={descriptionId} className="redesign-software-card-description">
          {product.description}
        </p>
        <dl className="redesign-software-card-meta">
          <div>
            <dt>{locale === "en" ? "Category" : "分类"}</dt>
            <dd>{categoryLabel}</dd>
          </div>
          <div>
            <dt>{locale === "en" ? "Price" : "价格"}</dt>
            <dd>{product.price}</dd>
          </div>
        </dl>
        <a className="redesign-software-card-link" href={product.detailHref}>
          {detailLabel}
        </a>
      </div>
    </article>
  );
}
