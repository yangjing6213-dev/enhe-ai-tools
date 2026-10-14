"use client";

import Image from "next/image";
import { animate } from "motion/react";
import { Pause, Play } from "lucide-react";
import { EnheIconfontIcon } from "@/components/redesign/enhe-iconfont-icon";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
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
import {
  PRODUCT_STAGE_MOTION_REST_TRANSFORM,
  resolveProductStageMotion,
  type ProductStageDirection,
  type ProductStageInputModality,
  type ProductStageMotionProfile,
} from "@/lib/motion/product-stage-motion";

import styles from "./EnheRedesignProductStageMotion.module.css";

export { resolveProductStageMotion };

export type ProductMediaStatus = "loading" | "ready" | "error";
export type ProductMediaState = Record<string, ProductMediaStatus>;

type InterruptedProductStyle = {
  productId: string;
  opacity: string;
  transform: string;
  transitionKey: number;
};

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
    pause: "暂停产品轮播",
    resume: "继续产品轮播",
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
    pause: "Pause product slideshow",
    resume: "Resume product slideshow",
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
    pause: string;
    resume: string;
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
  const [previousIndex, setPreviousIndex] = useState<number | null>(null);
  const [direction, setDirection] = useState<ProductStageDirection>(1);
  const [inputModality, setInputModality] =
    useState<ProductStageInputModality>("pointer");
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [manuallyPaused, setManuallyPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [inView, setInView] = useState(false);
  const [pageVisible, setPageVisible] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const isAutoRotating = inView && pageVisible && !prefersReducedMotion && !manuallyPaused && !hovered && !focused;
  const [transitionKey, setTransitionKey] = useState(0);
  const [mediaState, setMediaState] =
    useState<ProductMediaState>(() => Object.fromEntries(products.map(({ id }) => [id, "loading"])));
  const indexRef = useRef(HOME_PRODUCT_DEFAULT_INDEX);
  const transitionKeyRef = useRef(0);
  const currentRef = useRef<HTMLDivElement>(null);
  const previousRef = useRef<HTMLDivElement>(null);
  const activeAnimationsRef = useRef<Array<{ stop(): void }>>([]);
  const interruptedIncomingStyleRef = useRef<InterruptedProductStyle | null>(
    null,
  );
  const copy = SHOWCASE_COPY[locale];
  const currentIndex = index < products.length ? index : 0;
  const product = products[currentIndex];
  const previousProduct =
    previousIndex === null ? null : products[previousIndex] ?? null;
  const panelId = `redesign-home-product-panel-${locale}`;
  const motionProfile: ProductStageMotionProfile =
    inputModality === "keyboard"
      ? "keyboard"
      : prefersReducedMotion
        ? "reduced"
        : "pointer";
  const motion = useMemo(
    () => resolveProductStageMotion(motionProfile, direction),
    [direction, motionProfile],
  );

  const stopActiveAnimations = useCallback(() => {
    for (const control of activeAnimationsRef.current) {
      control.stop();
    }
    activeAnimationsRef.current = [];
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    const updateReducedMotion = () =>
      setPrefersReducedMotion(mediaQuery.matches);

    updateReducedMotion();
    mediaQuery.addEventListener("change", updateReducedMotion);

    return () => mediaQuery.removeEventListener("change", updateReducedMotion);
  }, []);

  useEffect(() => stopActiveAnimations, [stopActiveAnimations]);

  useEffect(() => {
    if (index >= products.length) {
      indexRef.current = 0;
      setIndex(0);
      setPreviousIndex(null);
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

  useLayoutEffect(() => {
    if (previousIndex === null) {
      return;
    }

    const current = currentRef.current;
    const previous = previousRef.current;

    if (!current || !previous) {
      setPreviousIndex(null);
      return;
    }

    stopActiveAnimations();
    const activeTransitionKey = transitionKey;
    const interruptedStyle = interruptedIncomingStyleRef.current;
    const continuesInterruptedMotion =
      interruptedStyle?.transitionKey === activeTransitionKey &&
      interruptedStyle.productId === product.id;

    interruptedIncomingStyleRef.current = null;

    if (motionProfile === "keyboard") {
      current.style.opacity = "1";
      current.style.transform = PRODUCT_STAGE_MOTION_REST_TRANSFORM;
      previous.style.opacity = "0";
      previous.style.transform = PRODUCT_STAGE_MOTION_REST_TRANSFORM;
      setPreviousIndex(null);
      return;
    }

    current.style.opacity = continuesInterruptedMotion
      ? interruptedStyle.opacity
      : String(motion.incoming.opacity[0]);

    if (
      motionProfile === "pointer" &&
      motion.incoming.transform &&
      motion.outgoing.transform
    ) {
      current.style.transform = continuesInterruptedMotion
        ? interruptedStyle.transform
        : motion.incoming.transform[0];
    } else {
      current.style.transform = PRODUCT_STAGE_MOTION_REST_TRANSFORM;
      previous.style.transform = PRODUCT_STAGE_MOTION_REST_TRANSFORM;
    }

    const animationOptions = {
      duration: motion.durationMs / 1000,
      ease: motion.ease,
    };
    const outgoingControl = animate(
      previous,
      {
        opacity: motion.outgoing.opacity,
        ...(motion.outgoing.transform
          ? { transform: motion.outgoing.transform }
          : {}),
      },
      animationOptions,
    );
    const incomingControl = animate(
      current,
      continuesInterruptedMotion
        ? {
            opacity: motion.incoming.opacity[1],
            ...(motion.incoming.transform
              ? { transform: motion.incoming.transform[1] }
              : {}),
          }
        : {
            opacity: motion.incoming.opacity,
            ...(motion.incoming.transform
              ? { transform: motion.incoming.transform }
              : {}),
          },
      animationOptions,
    );
    const controls = [outgoingControl, incomingControl];

    activeAnimationsRef.current = controls;
    void Promise.all(controls).then(
      () => {
        if (transitionKeyRef.current === activeTransitionKey) {
          activeAnimationsRef.current = [];
          setPreviousIndex(null);
        }
      },
      () => undefined,
    );
  }, [
    motion,
    motionProfile,
    previousIndex,
    product.id,
    stopActiveAnimations,
    transitionKey,
  ]);

  const move = useCallback(
    (delta: -1 | 1, modality: ProductStageInputModality) => {
      if (products.length <= 1) return;
      const outgoingIndex = indexRef.current;
      const nextIndex = getWrappedProductIndex(outgoingIndex, delta, products.length);
      const returningLayer = previousRef.current;
      const returningProductId = products[nextIndex].id;

      stopActiveAnimations();
      const returningStyle =
        returningLayer?.dataset.productId === returningProductId
          ? window.getComputedStyle(returningLayer)
          : null;

      indexRef.current = nextIndex;
      transitionKeyRef.current += 1;
      interruptedIncomingStyleRef.current = returningStyle
        ? {
            productId: returningProductId,
            opacity: returningStyle.opacity,
            transform: returningStyle.transform,
            transitionKey: transitionKeyRef.current,
          }
        : null;
      setPreviousIndex(outgoingIndex);
      setDirection(delta);
      setInputModality(modality);
      setIndex(nextIndex);
      setTransitionKey(transitionKeyRef.current);
    },
    [products, stopActiveAnimations],
  );

  const selectProduct = useCallback((targetIndex: number) => {
    const outgoingIndex = indexRef.current;
    if (targetIndex === outgoingIndex || targetIndex < 0 || targetIndex >= products.length || products.length <= 1) return;
    const forwardDistance = (targetIndex - outgoingIndex + products.length) % products.length;
    const backwardDistance = (outgoingIndex - targetIndex + products.length) % products.length;
    const nextDirection: ProductStageDirection = forwardDistance <= backwardDistance ? 1 : -1;

    stopActiveAnimations();
    const returningLayer = previousRef.current;
    const returningStyle = returningLayer?.dataset.productId === products[targetIndex].id
      ? window.getComputedStyle(returningLayer)
      : null;
    indexRef.current = targetIndex;
    transitionKeyRef.current += 1;
    interruptedIncomingStyleRef.current = returningStyle ? {
      productId: products[targetIndex].id,
      opacity: returningStyle.opacity,
      transform: returningStyle.transform,
      transitionKey: transitionKeyRef.current,
    } : null;
    setPreviousIndex(outgoingIndex);
    setDirection(nextDirection);
    setInputModality("pointer");
    setIndex(targetIndex);
    setTransitionKey(transitionKeyRef.current);
  }, [products, stopActiveAnimations]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target instanceof HTMLAnchorElement) {
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      move(-1, "keyboard");
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      move(1, "keyboard");
    }
  };

  useEffect(() => {
    if (!isAutoRotating) return;
    // A fresh reading interval follows every manual change or pause.
    const timer = window.setTimeout(() => move(1, "pointer"), PRODUCT_AUTO_INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [isAutoRotating, move, transitionKey]);

  const renderProduct = (
    product: HomeProductShowcaseItem,
    isPrevious: boolean,
  ) => {
    const mediaStatus = mediaState[product.id];

    return (
      <div
        key={product.id}
        ref={isPrevious ? previousRef : currentRef}
        id={isPrevious ? undefined : panelId}
        className={`${styles.layer} ${isPrevious ? styles.previous : styles.current}`}
        data-product-layer
        data-product-id={product.id}
        data-product-current={isPrevious ? undefined : "true"}
        data-product-previous={isPrevious ? "true" : undefined}
        aria-current={isPrevious ? undefined : "true"}
        aria-hidden={isPrevious ? true : undefined}
        inert={isPrevious ? true : undefined}
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
                      sizes="(max-width: 767px) calc(100vw - 120px), (max-width: 1180px) calc(100vw - 216px), 964px"
                      loading="eager"
                      unoptimized
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
          <div>
            <p className="redesign-home-products-eyebrow">{copy.eyebrow}</p>
            <h2 id={`redesign-home-products-title-${locale}`}>
              {copy.heading}
            </h2>
          </div>
          <button
            type="button"
            className="redesign-home-product-autoplay"
            aria-label={manuallyPaused ? copy.resume : copy.pause}
            aria-pressed={manuallyPaused}
            aria-controls={panelId}
            disabled={prefersReducedMotion}
            onClick={() => setManuallyPaused((paused) => !paused)}
          >
            {manuallyPaused || prefersReducedMotion ? <Play size={18} aria-hidden="true" /> : <Pause size={18} aria-hidden="true" />}
          </button>
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
          data-motion-variant="directional-slide"
          data-motion-duration-ms={motion.durationMs}
          data-motion-modality={motionProfile}
          data-motion-direction={direction === 1 ? "forward" : "backward"}
          data-motion-enter-transform={motion.incoming.transform?.[0] ?? "none"}
          data-motion-exit-transform={motion.outgoing.transform ?? "none"}
          data-motion-transition-key={transitionKey}
        >
          <div className={`redesign-home-product-content ${styles.viewport}`}>
            {previousProduct ? renderProduct(previousProduct, true) : null}
            {renderProduct(product, false)}
          </div>
          <div className="redesign-home-product-controls">
            <button
              type="button"
              className="redesign-home-product-control"
              disabled={products.length <= 1}
              onClick={(event) =>
                move(-1, event.detail === 0 ? "keyboard" : "pointer")
              }
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
              onClick={(event) =>
                move(1, event.detail === 0 ? "keyboard" : "pointer")
              }
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
