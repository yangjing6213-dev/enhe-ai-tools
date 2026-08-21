"use client";

import Image from "next/image";
import { animate } from "motion/react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { RedesignLocale } from "@/components/redesign/types";
import {
  HOME_PRODUCT_COUNT,
  HOME_PRODUCT_DEFAULT_INDEX,
  HOME_PRODUCTS,
} from "@/lib/redesign/home/home-products";
import type { RedesignProductId } from "@/lib/redesign/home/home-products";
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
export type ProductMediaState = Record<RedesignProductId, ProductMediaStatus>;

type InterruptedProductStyle = {
  productId: RedesignProductId;
  opacity: string;
  transform: string;
  transitionKey: number;
};

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

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

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

export function EnheRedesignProductShowcase({
  locale,
}: {
  locale: RedesignLocale;
}) {
  const [index, setIndex] = useState(HOME_PRODUCT_DEFAULT_INDEX);
  const [previousIndex, setPreviousIndex] = useState<number | null>(null);
  const [direction, setDirection] = useState<ProductStageDirection>(1);
  const [inputModality, setInputModality] =
    useState<ProductStageInputModality>("pointer");
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [transitionKey, setTransitionKey] = useState(0);
  const [mediaState, setMediaState] =
    useState<ProductMediaState>(INITIAL_MEDIA_STATE);
  const indexRef = useRef(HOME_PRODUCT_DEFAULT_INDEX);
  const transitionKeyRef = useRef(0);
  const currentRef = useRef<HTMLDivElement>(null);
  const previousRef = useRef<HTMLDivElement>(null);
  const activeAnimationsRef = useRef<Array<{ stop(): void }>>([]);
  const interruptedIncomingStyleRef = useRef<InterruptedProductStyle | null>(
    null,
  );
  const copy = SHOWCASE_COPY[locale];
  const product = HOME_PRODUCTS[index];
  const previousProduct =
    previousIndex === null ? null : HOME_PRODUCTS[previousIndex];
  const counter = `${String(index + 1).padStart(2, "0")} / ${String(HOME_PRODUCT_COUNT).padStart(2, "0")}`;
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
      const outgoingIndex = indexRef.current;
      const nextIndex = getWrappedProductIndex(outgoingIndex, delta);
      const returningLayer = previousRef.current;
      const returningProductId = HOME_PRODUCTS[nextIndex].id;

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
    [stopActiveAnimations],
  );

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

  const renderProduct = (
    product: (typeof HOME_PRODUCTS)[number],
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
              <Image
                className="redesign-home-product-media"
                data-media-status={mediaStatus}
                src={product.mediaSrc}
                alt={product.alt[locale]}
                width={product.width}
                height={product.height}
                loading="eager"
                unoptimized
                onLoad={() =>
                  setMediaState((current) =>
                    updateProductMediaState(current, product.id, "ready"),
                  )
                }
                onError={() =>
                  setMediaState((current) =>
                    updateProductMediaState(current, product.id, "error"),
                  )
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
    );
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
            <h2 id={`redesign-home-products-title-${locale}`}>
              {copy.heading}
            </h2>
          </div>
          <p
            className="redesign-home-product-counter"
            aria-label={`${counter}: ${product.name[locale]}`}
            aria-live="polite"
            aria-atomic="true"
          >
            {counter}
          </p>
        </div>

        <div
          className="redesign-home-product-stage"
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
          <button
            type="button"
            className="redesign-home-product-control"
            onClick={(event) =>
              move(-1, event.detail === 0 ? "keyboard" : "pointer")
            }
            aria-label={copy.previous}
            aria-controls={panelId}
          >
            <ArrowLeft aria-hidden="true" />
          </button>

          <div className={`redesign-home-product-content ${styles.viewport}`}>
            {previousProduct ? renderProduct(previousProduct, true) : null}
            {renderProduct(product, false)}
          </div>

          <button
            type="button"
            className="redesign-home-product-control"
            onClick={(event) =>
              move(1, event.detail === 0 ? "keyboard" : "pointer")
            }
            aria-label={copy.next}
            aria-controls={panelId}
          >
            <ArrowRight aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}
