"use client";

import Image from "next/image";
import { useState, type KeyboardEvent } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { RedesignLocale } from "@/components/redesign/types";
import {
  HOME_PRODUCT_COUNT,
  HOME_PRODUCT_DEFAULT_INDEX,
  HOME_PRODUCTS,
} from "@/lib/redesign/home/home-products";
import type { RedesignProductId } from "@/lib/redesign/home/home-products";

export type ProductMediaStatus = "loading" | "ready" | "error";
export type ProductMediaState = Record<RedesignProductId, ProductMediaStatus>;

export function getWrappedProductIndex(index: number, delta: -1 | 1) {
  return (index + delta + HOME_PRODUCT_COUNT) % HOME_PRODUCT_COUNT;
}

export function updateProductMediaState(
  state: Readonly<ProductMediaState>,
  productId: RedesignProductId,
  status: ProductMediaStatus,
): ProductMediaState {
  return { ...state, [productId]: status };
}

const INITIAL_MEDIA_STATE = Object.fromEntries(
  HOME_PRODUCTS.map(({ id }) => [id, "loading" as const]),
) as ProductMediaState;

const SHOWCASE_COPY = {
  zh: {
    eyebrow: "精选产品",
    heading: "把想法变成看得见的结果",
    previous: "上一款产品",
    next: "下一款产品",
    loading: "正在加载产品封面…",
    error: "产品封面暂时无法加载。",
    detail: "查看产品 →",
  },
  en: {
    eyebrow: "Featured products",
    heading: "Turn ideas into visible results",
    previous: "Previous product",
    next: "Next product",
    loading: "Loading product cover…",
    error: "This product cover could not be loaded.",
    detail: "View product →",
  },
} satisfies Record<
  RedesignLocale,
  {
    eyebrow: string;
    heading: string;
    previous: string;
    next: string;
    loading: string;
    error: string;
    detail: string;
  }
>;

export function EnheRedesignProductShowcase({ locale }: { locale: RedesignLocale }) {
  const [index, setIndex] = useState(HOME_PRODUCT_DEFAULT_INDEX);
  const [mediaState, setMediaState] = useState<ProductMediaState>(INITIAL_MEDIA_STATE);
  const copy = SHOWCASE_COPY[locale];
  const product = HOME_PRODUCTS[index];
  const mediaStatus = mediaState[product.id];
  const counter = `${String(index + 1).padStart(2, "0")} / ${String(HOME_PRODUCT_COUNT).padStart(2, "0")}`;

  const move = (delta: -1 | 1) => {
    const nextIndex = getWrappedProductIndex(index, delta);
    setIndex(nextIndex);
    setMediaState((current) => updateProductMediaState(current, HOME_PRODUCTS[nextIndex].id, "loading"));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      move(-1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      move(1);
    }
  };

  return (
    <section
      className="redesign-home redesign-home-products"
      data-locale={locale}
      aria-labelledby={`redesign-home-products-title-${locale}`}
    >
      <div className="redesign-home-products-inner">
        <div className="redesign-home-products-heading">
          <div>
            <p className="redesign-home-products-eyebrow">{copy.eyebrow}</p>
            <h2 id={`redesign-home-products-title-${locale}`}>{copy.heading}</h2>
          </div>
          <p className="redesign-home-product-counter" aria-label={counter}>
            {counter}
          </p>
        </div>

        <div
          className="redesign-home-product-stage"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          role="region"
          aria-label={locale === "zh" ? "产品展示，可使用左右方向键切换" : "Product showcase, use left and right arrow keys to switch"}
        >
          <button type="button" className="redesign-home-product-control" onClick={() => move(-1)} aria-label={copy.previous}>
            <ArrowLeft aria-hidden="true" />
          </button>

          <div className="redesign-home-product-content">
            <div className="redesign-home-product-media-frame">
              {mediaStatus === "error" ? (
                <p className="redesign-home-product-media-fallback" role="status">
                  {copy.error}
                </p>
              ) : (
                <>
                  {mediaStatus === "loading" && (
                    <p className="redesign-home-product-media-fallback" role="status" aria-live="polite">
                      {copy.loading}
                    </p>
                  )}
                  <Image
                    key={product.id}
                    className="redesign-home-product-media"
                    data-media-status={mediaStatus}
                    src={product.mediaSrc}
                    alt={product.alt[locale]}
                    width={product.width}
                    height={product.height}
                    loading="eager"
                    unoptimized
                    onLoad={() =>
                      setMediaState((current) => updateProductMediaState(current, product.id, "ready"))
                    }
                    onError={() =>
                      setMediaState((current) => updateProductMediaState(current, product.id, "error"))
                    }
                  />
                </>
              )}
            </div>

            <div className="redesign-home-product-detail">
              <h3>{product.name[locale]}</h3>
              <p>{product.description[locale]}</p>
              <a href={product.detailHref[locale]}>{copy.detail}</a>
            </div>
          </div>

          <button type="button" className="redesign-home-product-control" onClick={() => move(1)} aria-label={copy.next}>
            <ArrowRight aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}
