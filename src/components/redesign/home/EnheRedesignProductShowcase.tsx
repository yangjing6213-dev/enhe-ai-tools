"use client";

import Image from "next/image";
import { EnheIconfontIcon } from "@/components/redesign/enhe-iconfont-icon";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import type { RedesignLocale } from "@/components/redesign/types";
import {
  HOME_PRODUCT_COUNT,
  HOME_PRODUCT_DEFAULT_INDEX,
} from "@/lib/redesign/home/home-products";
import {
  createDefaultHomeProductShowcase,
  resolveHomeShowcaseMediaSrc,
  type HomeProductShowcaseItem,
} from "@/lib/redesign/home/home-product-showcase";

import styles from "./EnheRedesignProductStageMotion.module.css";

export type ProductMediaStatus = "loading" | "ready" | "error";
export type ProductMediaState = Record<string, ProductMediaStatus>;

export function getWrappedProductIndex(index: number, delta: -1 | 1, count: number = HOME_PRODUCT_COUNT) {
  return count > 0 ? (index + delta + count) % count : 0;
}

export function updateProductMediaState(
  state: Readonly<ProductMediaState>,
  productId: string,
  status: ProductMediaStatus,
): ProductMediaState {
  return { ...state, [productId]: status };
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const PRODUCT_AUTO_INTERVAL_MS = 6000;
const DEFAULT_HOME_PRODUCTS = createDefaultHomeProductShowcase();

const SHOWCASE_COPY = {
  zh: {
    eyebrow: "热门AI推荐",
    heading: "勇于跨出这一步，你就离成功更近一步。",
    previous: "上一款产品",
    next: "下一款产品",
    loading: "正在加载推荐内容…",
    error: "推荐内容暂时无法加载。",
    detail: "查看产品",
    chooseProduct: "选择推荐产品",
    showProduct: (number: number) => `显示第 ${number} 款产品`,
  },
  en: {
    eyebrow: "Popular AI picks",
    heading: "Take one step forward, and you're closer to success.",
    previous: "Previous product",
    next: "Next product",
    loading: "Loading featured content…",
    error: "This featured content could not be loaded.",
    detail: "View product",
    chooseProduct: "Choose a featured product",
    showProduct: (number: number) => `Show product ${number}`,
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
    chooseProduct: string;
    showProduct: (number: number) => string;
  }
>;

export function EnheRedesignProductShowcase({
  locale,
  products = DEFAULT_HOME_PRODUCTS,
}: {
  locale: RedesignLocale;
  products?: readonly HomeProductShowcaseItem[];
}) {
  const [index, setIndex] = useState(HOME_PRODUCT_DEFAULT_INDEX);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [inView, setInView] = useState(false);
  const [pageVisible, setPageVisible] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const isAutoRotating = inView && pageVisible && !prefersReducedMotion && !hovered && !focused;
  const [mediaState, setMediaState] =
    useState<ProductMediaState>(() => Object.fromEntries(products.map(({ id }) => [id, "loading"])));
  const indexRef = useRef(HOME_PRODUCT_DEFAULT_INDEX);
  const copy = SHOWCASE_COPY[locale];
  const currentIndex = index < products.length ? index : 0;
  const product = products[currentIndex];
  const panelId = `redesign-home-product-panel-${locale}`;

  useEffect(() => {
    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    const updateReducedMotion = () =>
      setPrefersReducedMotion(mediaQuery.matches);

    updateReducedMotion();
    mediaQuery.addEventListener("change", updateReducedMotion);

    return () => mediaQuery.removeEventListener("change", updateReducedMotion);
  }, []);

  useEffect(() => {
    if (index >= products.length) {
      indexRef.current = 0;
      setIndex(0);
    }
  }, [index, products.length]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting && entry.intersectionRatio >= 0.15),
      { threshold: [0, 0.15] },
    );
    observer.observe(stage);
    const updateVisibility = () => setPageVisible(!document.hidden);
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  const move = useCallback(
    (delta: -1 | 1) => {
      if (products.length <= 1) return;
      const outgoingIndex = indexRef.current;
      const nextIndex = getWrappedProductIndex(outgoingIndex, delta, products.length);
      indexRef.current = nextIndex;
      setIndex(nextIndex);
    },
    [products.length],
  );

  const selectProduct = useCallback((targetIndex: number) => {
    if (targetIndex === indexRef.current || targetIndex < 0 || targetIndex >= products.length || products.length <= 1) return;
    indexRef.current = targetIndex;
    setIndex(targetIndex);
  }, [products.length]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target instanceof HTMLAnchorElement) {
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      move(-1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      move(1);
    }
  };

  useEffect(() => {
    if (!isAutoRotating) return;
    // A fresh reading interval follows every manual change or pause.
    const timer = window.setTimeout(() => move(1), PRODUCT_AUTO_INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [index, isAutoRotating, move]);

  const renderProduct = (product: HomeProductShowcaseItem) => {
    const mediaStatus = mediaState[product.id];

    return (
      <div
        key={product.id}
        id={panelId}
        className={styles.layer}
        data-product-layer
        data-product-id={product.id}
        data-product-current="true"
        aria-current="true"
      >
          <div className="redesign-home-product-media-frame">
            <div className="redesign-home-product-media-inner">
              {mediaStatus === "error" ? (
                <p className="redesign-home-product-media-fallback" role="status">
                  {copy.error}
                </p>
              ) : (
                <>
                  {mediaStatus === "loading" && (
                    <p
                      className="redesign-home-product-media-fallback"
                      role="status"
                      aria-live="polite"
                    >
                      {copy.loading}
                    </p>
                  )}
                  {product.mediaType === "video" ? (
                    <video
                      className="redesign-home-product-media"
                      data-media-status={mediaStatus}
                      src={resolveHomeShowcaseMediaSrc(product.mediaSrc)}
                      aria-label={product.alt[locale]}
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="metadata"
                      onCanPlay={() =>
                        setMediaState((current) => updateProductMediaState(current, product.id, "ready"))
                      }
                      onError={() =>
                        setMediaState((current) => updateProductMediaState(current, product.id, "error"))
                      }
                    />
                  ) : (
                    <Image
                      className="redesign-home-product-media"
                      data-media-status={mediaStatus}
                      src={resolveHomeShowcaseMediaSrc(product.mediaSrc)}
                      alt={product.alt[locale]}
                      fill
                      sizes="(max-width: 767px) calc(75vw - 30px), (max-width: 1440px) calc(75vw - 36px), 1044px"
                      loading="lazy"
                      unoptimized={!DEFAULT_HOME_PRODUCTS.some((item) => item.mediaSrc === product.mediaSrc)}
                      onLoad={() =>
                        setMediaState((current) => updateProductMediaState(current, product.id, "ready"))
                      }
                      onError={() =>
                        setMediaState((current) => updateProductMediaState(current, product.id, "error"))
                      }
                    />
                  )}
                </>
              )}
          </div>
        </div>

        <div className="redesign-home-product-detail">
          <h3>{product.name[locale]}</h3>
          <p>{product.description[locale]}</p>
          <a className="redesign-home-product-detail-link" href={product.detailHref[locale]}>
            {copy.detail}
            <EnheIconfontIcon
              icon="arrow-right"
              className="redesign-home-product-link-triangle"
            />
          </a>
        </div>
      </div>
    );
  };

  return (
    <section
      className="redesign-home redesign-home-products"
      data-locale={locale}
      data-auto-rotating={isAutoRotating ? "true" : "false"}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
      }}
      aria-labelledby={`redesign-home-products-title-${locale}`}
    >
      <div className="redesign-home-products-inner">
        <div className="redesign-home-products-heading">
          <p className="redesign-home-products-eyebrow">{copy.eyebrow}</p>
          <h2 id={`redesign-home-products-title-${locale}`}>
            {copy.heading}
          </h2>
        </div>

        <div
          ref={stageRef}
          className="redesign-home-product-stage"
          onPointerEnter={(event) => {
            if (event.pointerType === "mouse") setHovered(true);
          }}
          onPointerLeave={() => setHovered(false)}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          role="region"
          aria-label={
            locale === "zh"
              ? "产品展示，可使用左右方向键切换"
              : "Product showcase, use left and right arrow keys to switch"
          }
        >
          <div className={`redesign-home-product-content ${styles.viewport}`}>
            {renderProduct(product)}
          </div>
          <div className="redesign-home-product-controls">
            <button
              type="button"
              className="redesign-home-product-control"
              disabled={products.length <= 1}
              onClick={() => move(-1)}
              aria-label={copy.previous}
              aria-controls={panelId}
            >
              <EnheIconfontIcon
                icon="arrow-left-bold"
                className="redesign-home-product-triangle"
              />
            </button>
            <button
              type="button"
              className="redesign-home-product-control"
              disabled={products.length <= 1}
              onClick={() => move(1)}
              aria-label={copy.next}
              aria-controls={panelId}
            >
              <EnheIconfontIcon
                icon="arrow-right-bold"
                className="redesign-home-product-triangle"
              />
            </button>
            <nav className="redesign-home-product-indicators" aria-label={copy.chooseProduct}>
              {products.map((item, itemIndex) => (
                <button
                  key={item.id}
                  type="button"
                  aria-label={copy.showProduct(itemIndex + 1)}
                  aria-current={itemIndex === currentIndex ? "true" : undefined}
                  aria-controls={panelId}
                  onClick={() => selectProduct(itemIndex)}
                />
              ))}
            </nav>
          </div>
          <span className="sr-only" aria-live={isAutoRotating ? "off" : "polite"} aria-atomic="true">
            {product.name[locale]}
          </span>
        </div>

        <noscript>
          <ol>
            {products.map((fallbackProduct) => (
              <li key={fallbackProduct.id} data-product-id={fallbackProduct.id}>
                <h3>{fallbackProduct.name[locale]}</h3>
                <p>{fallbackProduct.description[locale]}</p>
                <a href={fallbackProduct.detailHref[locale]}>{copy.detail}</a>
              </li>
            ))}
          </ol>
        </noscript>
      </div>
    </section>
  );
}
