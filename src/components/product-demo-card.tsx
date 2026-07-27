import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, PlayCircle } from "lucide-react";
import { ProductDemoMotionCard } from "@/components/product-demo-motion-card";
import type { Locale } from "@/lib/dictionaries";
import type { PublicProductDemo } from "@/lib/product-demos";
import {
  buildProductDemoPath,
  getProductDemoCategoryLabel,
  getProductDemoCoverImage,
  getLocalizedProductDemoCoverAlt,
  getLocalizedProductDemoDescription,
  getLocalizedProductDemoProductType,
  getLocalizedProductDemoTags,
  getLocalizedProductDemoTitle,
  getProductDemoRelatedProductHref,
} from "@/lib/product-demos";

type ProductDemoCardProps = {
  demo: PublicProductDemo;
  locale: Locale;
  variant?: "home" | "listing";
};

export function ProductDemoCard({ demo, locale, variant = "listing" }: ProductDemoCardProps) {
  const coverImage = getProductDemoCoverImage(demo);
  const productHref = getProductDemoRelatedProductHref(demo, locale);
  const demoHref = buildProductDemoPath(demo.slug, locale);
  const localizedTitle = getLocalizedProductDemoTitle(demo, locale);
  const localizedCoverAlt = getLocalizedProductDemoCoverAlt(demo, locale);
  const localizedDescription = getLocalizedProductDemoDescription(demo, locale);
  const localizedProductType = getLocalizedProductDemoProductType(demo, locale);
  const tags = getLocalizedProductDemoTags(demo, locale).slice(0, variant === "home" ? 3 : 5);
  const productLabel = locale === "en" ? "View product" : "查看产品";
  const demoLabel = locale === "en" ? "Watch demo" : "观看演示";

  return (
    <ProductDemoMotionCard>
      <Link href={demoHref} className="product-demo-card-media" aria-label={`${demoLabel}: ${localizedTitle}`}>
        {coverImage ? (
          <Image
            src={coverImage}
            alt={localizedCoverAlt}
            fill
            className="content-thumbnail-outline object-cover"
            sizes={variant === "home" ? "(min-width: 1024px) 390px, 84vw" : "(min-width: 1024px) 420px, 90vw"}
            unoptimized
          />
        ) : (
          <div className="product-demo-card-placeholder" aria-hidden="true" />
        )}
        <span className="product-demo-card-play">
          <PlayCircle size={18} aria-hidden="true" />
          {demoLabel}
        </span>
      </Link>

      <div className="product-demo-card-body">
        <div className="product-demo-card-meta">
          <span>{getProductDemoCategoryLabel(demo.category, locale)}</span>
          {localizedProductType ? <span>{localizedProductType}</span> : null}
        </div>
        <h3>
          <Link href={demoHref}>{localizedTitle}</Link>
        </h3>
        <p>{localizedDescription}</p>
        {tags.length ? (
          <div className="product-demo-card-tags" aria-label={locale === "en" ? "Keywords" : "关键词标签"}>
            {tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        ) : null}
        <div className="product-demo-card-actions">
          <Link href={productHref} className="product-demo-secondary-link">
            {productLabel}
            <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
          <Link href={demoHref} className="product-demo-primary-link">
            {demoLabel}
            <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </ProductDemoMotionCard>
  );
}
