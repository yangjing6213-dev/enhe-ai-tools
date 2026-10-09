"use client";

import Image from "next/image";
import { useState } from "react";
import { Card } from "@/components/ui/card";

import type { SoftwareCatalogItem } from "@/lib/redesign/software/software-production";

export function EnheRedesignSoftwareCard({
  product,
  categoryLabel,
  detailLabel,
  sectionId,
  extraHidden = false,
  listItem = false,
}: {
  product: SoftwareCatalogItem;
  categoryLabel: string;
  detailLabel: string;
  sectionId: "new-releases" | "featured-products" | "all-products";
  extraHidden?: boolean;
  listItem?: boolean;
}) {
  const [mediaFailed, setMediaFailed] = useState(false);
  const showTextCover = product.media === null || mediaFailed;
  const headingId = `${sectionId}-${product.id}-title`;

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
            <p className="redesign-software-card-price">{product.price}</p>
          </div>
          <h3 id={headingId}>{product.name}</h3>
          <p className="redesign-software-card-description">{product.description}</p>
          <a
            className="redesign-software-card-link"
            data-support-exclusion={sectionId}
            href={product.detailHref}
          >
            {detailLabel}
          </a>
        </div>
      </article>
    </Card>
  );
}
