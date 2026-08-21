"use client";

import { motion } from "motion/react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { RedesignLocale } from "@/components/redesign/types";
import {
  SOFTWARE_CATEGORIES,
  type SoftwareCategoryId,
} from "@/lib/redesign/software/software-categories";
import {
  CATEGORY_LAYER_MOTION_VARIANTS,
  CATEGORY_MOTION_REST_TRANSFORM,
  CATEGORY_OVERLAY_MOTION_VARIANTS,
  resolveCategoryMotionEnterTransform,
  type CategoryInputModality,
  type CategoryMotionProfile,
} from "@/lib/motion/category-layer-motion";

import styles from "./EnheRedesignSoftwareCategoryMotion.module.css";

export const SOFTWARE_CATALOG_VISIBILITY_EVENT = "software-catalog:visibility-change";

const CATALOG_CARD_SELECTOR = "[data-catalog-card]";
const ALL_PRODUCTS_ROOT_SELECTOR = "[data-all-products-root]";
const LOAD_MORE_STATUS_SELECTOR = "[data-load-more-status]";
const MOBILE_CATEGORY_QUERY = "(width < 768px)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const FOCUSABLE_CATEGORY_CONTROLS =
  '.redesign-software-category-button, [data-category-close="true"]';
const CATEGORY_MOTION_DURATION_MS = {
  desktop: 190,
  mobile: 230,
  keyboard: 100,
  reduced: 80,
} as const;

export function getSoftwareCatalogRoot(rootId: string) {
  return document.getElementById(rootId);
}

export function reconcileSoftwareCatalogVisibility(catalogRoot: HTMLElement) {
  const selectedCategory = (catalogRoot.dataset.selectedCategory ?? "all") as SoftwareCategoryId;
  const allProductsRoot = catalogRoot.querySelector<HTMLElement>(ALL_PRODUCTS_ROOT_SELECTOR);
  const allProductsLoaded = allProductsRoot?.dataset.loaded === "true";
  const cards = catalogRoot.querySelectorAll<HTMLElement>(CATALOG_CARD_SELECTOR);

  for (const card of cards) {
    const matchesCategory =
      selectedCategory === "all" || card.dataset.category === selectedCategory;
    const isExtraCard = card.dataset.extraCard === "true";
    const isAllProductsCard = card.dataset.section === "all-products";
    const visible = matchesCategory && (!isAllProductsCard || !isExtraCard || allProductsLoaded);

    card.hidden = !visible;
  }

  const status = catalogRoot.querySelector<HTMLElement>(LOAD_MORE_STATUS_SELECTOR);
  if (!status || !allProductsRoot) {
    return;
  }

  const visibleCount = allProductsRoot.querySelectorAll<HTMLElement>(
    `${CATALOG_CARD_SELECTOR}:not([hidden])`,
  ).length;
  const totalCount = allProductsRoot.querySelectorAll<HTMLElement>(CATALOG_CARD_SELECTOR).length;
  const collapsedText = status.dataset.collapsedText ?? "";
  const expandedText = status.dataset.expandedText ?? "";
  const filteredText = status.dataset.filteredText ?? "";

  status.textContent =
    selectedCategory === "all"
      ? allProductsLoaded
        ? expandedText
        : collapsedText
      : filteredText
          .replace("{visible}", String(visibleCount))
          .replace("{total}", String(totalCount));
}

export function EnheRedesignSoftwareCategorySelector({
  locale,
  rootId,
  triggerId,
  panelId,
  selectedCategoryId = "all",
  categoryHrefs,
}: {
  locale: RedesignLocale;
  rootId: string;
  triggerId: string;
  panelId: string;
  selectedCategoryId?: SoftwareCategoryId;
  categoryHrefs?: Partial<Record<SoftwareCategoryId, string>>;
}) {
  const initialSelectedIndex = Math.max(
    0,
    SOFTWARE_CATEGORIES.findIndex(
      (category) => category.id === selectedCategoryId,
    ),
  );
  const [selectedIndex, setSelectedIndex] = useState(initialSelectedIndex);
  const [focusedIndex, setFocusedIndex] = useState(initialSelectedIndex);
  const [open, setOpen] = useState(false);
  const [layerRendered, setLayerRendered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mediaPrefersReducedMotion, setMediaPrefersReducedMotion] = useState(false);
  const [inputModality, setInputModality] = useState<CategoryInputModality>("pointer");
  const isMotionReduced = mediaPrefersReducedMotion;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const categoryButtonRefs = useRef<
    Array<HTMLButtonElement | HTMLAnchorElement | null>
  >([]);
  const touchStartYRef = useRef<number | null>(null);
  const closeAfterMotionProfileUpdateRef = useRef(false);
  const usesServerNavigation = Boolean(categoryHrefs);
  const selectedCategory = SOFTWARE_CATEGORIES[selectedIndex];
  const triggerLabel = useMemo(
    () => selectedCategory.label[locale],
    [locale, selectedCategory],
  );
  const motionProfile: CategoryMotionProfile = isMotionReduced ? "reduced" : inputModality;
  const motionDuration = isMotionReduced
    ? CATEGORY_MOTION_DURATION_MS.reduced
    : inputModality === "keyboard"
      ? CATEGORY_MOTION_DURATION_MS.keyboard
      : isMobile
        ? CATEGORY_MOTION_DURATION_MS.mobile
        : CATEGORY_MOTION_DURATION_MS.desktop;
  const enterTransform = resolveCategoryMotionEnterTransform(motionProfile, isMobile);
  const motionCustom = {
    durationMs: motionDuration,
    enterTransform,
    profile: motionProfile,
  };

  const close = useCallback((modality: CategoryInputModality) => {
    if (modality === inputModality) {
      setOpen(false);
    } else {
      closeAfterMotionProfileUpdateRef.current = true;
      setInputModality(modality);
    }

    buttonRef.current?.focus();
  }, [inputModality]);

  const moveFocus = useCallback((direction: -1 | 1) => {
    setFocusedIndex((currentIndex) => {
      const nextIndex =
        (currentIndex + direction + SOFTWARE_CATEGORIES.length) % SOFTWARE_CATEGORIES.length;

      categoryButtonRefs.current[nextIndex]?.focus();
      return nextIndex;
    });
  }, []);

  useEffect(() => {
    const nextIndex = SOFTWARE_CATEGORIES.findIndex(
      (category) => category.id === selectedCategoryId,
    );
    const normalizedIndex = Math.max(0, nextIndex);
    setSelectedIndex(normalizedIndex);
    setFocusedIndex(normalizedIndex);
  }, [selectedCategoryId]);

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_CATEGORY_QUERY);
    const updateMobileState = () => setIsMobile(mediaQuery.matches);

    updateMobileState();
    mediaQuery.addEventListener("change", updateMobileState);

    return () => mediaQuery.removeEventListener("change", updateMobileState);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    const updateReducedMotionState = () => setMediaPrefersReducedMotion(mediaQuery.matches);

    updateReducedMotionState();
    mediaQuery.addEventListener("change", updateReducedMotionState);

    return () => mediaQuery.removeEventListener("change", updateReducedMotionState);
  }, []);

  useEffect(() => {
    if (!closeAfterMotionProfileUpdateRef.current) {
      return;
    }

    closeAfterMotionProfileUpdateRef.current = false;
    setOpen(false);
  }, [inputModality]);

  useEffect(() => {
    if (usesServerNavigation) return;

    const catalogRoot = getSoftwareCatalogRoot(rootId);

    if (!catalogRoot) {
      return;
    }

    const handleVisibilityChange = () => {
      reconcileSoftwareCatalogVisibility(catalogRoot);
    };

    catalogRoot.addEventListener(
      SOFTWARE_CATALOG_VISIBILITY_EVENT,
      handleVisibilityChange as EventListener,
    );

    return () => {
      catalogRoot.removeEventListener(
        SOFTWARE_CATALOG_VISIBILITY_EVENT,
        handleVisibilityChange as EventListener,
      );
    };
  }, [rootId, usesServerNavigation]);

  useEffect(() => {
    if (usesServerNavigation) return;

    const catalogRoot = getSoftwareCatalogRoot(rootId);

    if (!catalogRoot) {
      return;
    }

    catalogRoot.dataset.selectedCategory = selectedCategory.id;
    catalogRoot.setAttribute("data-selected-category", selectedCategory.id);
    catalogRoot.dispatchEvent(new CustomEvent(SOFTWARE_CATALOG_VISIBILITY_EVENT, { bubbles: true }));
  }, [rootId, selectedCategory.id, usesServerNavigation]);

  useEffect(() => {
    if (open) {
      categoryButtonRefs.current[focusedIndex]?.focus();
    }
  }, [focusedIndex, open]);

  useLayoutEffect(() => {
    if (!open) {
      return;
    }

    const layer = layerRef.current;
    const triggerRect = buttonRef.current?.getBoundingClientRect();

    if (!triggerRect || !layer) {
      return;
    }

    const animatedTransform = layer.style.transform;
    layer.style.transform = CATEGORY_MOTION_REST_TRANSFORM;
    const panelRect = layerRef.current?.getBoundingClientRect();
    layer.style.transform = animatedTransform;

    if (!panelRect) {
      return;
    }

    const originX = Math.min(
      panelRect.width,
      Math.max(0, triggerRect.left + triggerRect.width / 2 - panelRect.left),
    );

    layer.style.transformOrigin = `${originX}px 0px`;
  }, [isMobile, open]);

  useEffect(() => {
    if (!layerRendered || !isMobile) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [isMobile, layerRendered]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close("keyboard");
        return;
      }

      const target = event.target instanceof Element ? event.target : null;
      const categoryControl = target?.closest<HTMLElement>(
        ".redesign-software-category-button",
      );

      if (event.key === "Tab" && isMobile) {
        const focusableControls = Array.from(
          layerRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_CATEGORY_CONTROLS) ?? [],
        );
        const firstControl = focusableControls[0];
        const lastControl = focusableControls.at(-1);
        const focusIsInsideLayer = Boolean(
          document.activeElement && layerRef.current?.contains(document.activeElement),
        );

        if (
          event.shiftKey &&
          lastControl &&
          (document.activeElement === firstControl || !focusIsInsideLayer)
        ) {
          event.preventDefault();
          lastControl.focus();
          return;
        }

        if (
          !event.shiftKey &&
          firstControl &&
          (document.activeElement === lastControl || !focusIsInsideLayer)
        ) {
          event.preventDefault();
          firstControl.focus();
        }

        return;
      }

      if ((event.key === "Enter" || event.key === " ") && categoryControl) {
        event.preventDefault();
        categoryControl?.click();
        return;
      }

      if (event.key === "ArrowDown" && categoryControl) {
        event.preventDefault();
        moveFocus(1);
        return;
      }

      if (event.key === "ArrowUp" && categoryControl) {
        event.preventDefault();
        moveFocus(-1);
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;

      if (
        target &&
        (buttonRef.current?.contains(target) || layerRef.current?.contains(target))
      ) {
        return;
      }

      close("pointer");
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [close, isMobile, moveFocus, open]);

  return (
    <div className="redesign-software-category-layer" data-open={open ? "true" : "false"}>
      <button
        id={triggerId}
        ref={buttonRef}
        type="button"
        className="redesign-software-category-trigger"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={(event) => {
          const modality = event.detail === 0 ? "keyboard" : "pointer";
          setFocusedIndex(selectedIndex);

          if (open) {
            close(modality);
          } else {
            const openingProfile = isMotionReduced ? "reduced" : modality;
            if (layerRef.current) {
              layerRef.current.style.transform = resolveCategoryMotionEnterTransform(
                openingProfile,
                isMobile,
              );
            }
            setInputModality(modality);
            setLayerRendered(true);
            setOpen(true);
          }
        }}
      >
        <span>{triggerLabel}</span>
        <span aria-hidden="true">▾</span>
      </button>
      <motion.div
        className="redesign-software-category-overlay"
        aria-hidden="true"
        hidden={!layerRendered}
        custom={motionCustom}
        variants={CATEGORY_OVERLAY_MOTION_VARIANTS}
        initial={false}
        animate={open ? "visible" : "hidden"}
        onClick={() => close("pointer")}
      />
      <motion.div
        id={panelId}
        ref={layerRef}
        className="redesign-software-category-panel"
        role="dialog"
        aria-modal={open && isMobile ? true : undefined}
        aria-hidden={open ? undefined : true}
        aria-labelledby={triggerId}
        inert={!open}
        hidden={!layerRendered}
        data-motion-variant="origin-aware-layer"
        data-motion-duration-ms={motionDuration}
        data-motion-modality={motionProfile}
        data-motion-origin="trigger"
        data-motion-enter-transform={
          isMotionReduced || inputModality === "keyboard" ? "none" : enterTransform
        }
        custom={motionCustom}
        variants={CATEGORY_LAYER_MOTION_VARIANTS}
        initial={false}
        animate={open ? "visible" : "hidden"}
        onAnimationComplete={(definition) => {
          if (definition === "hidden" && !open) {
            setLayerRendered(false);
          }
        }}
        onTouchStart={(event) => {
          touchStartYRef.current = event.changedTouches[0]?.clientY ?? null;
        }}
        onTouchEnd={(event) => {
          const touchStartY = touchStartYRef.current;
          const touchEndY = event.changedTouches[0]?.clientY ?? touchStartY;

          if (touchStartY !== null && touchEndY - touchStartY > 48) {
            close("pointer");
          }

          touchStartYRef.current = null;
        }}
      >
        <button
          type="button"
          className={styles.closeButton}
          aria-label={locale === "zh" ? "关闭分类" : "Close categories"}
          data-category-close="true"
          onClick={(event) => close(event.detail === 0 ? "keyboard" : "pointer")}
        >
          <span aria-hidden="true">×</span>
        </button>
        <div
          className="redesign-software-category-buttons"
          role="group"
          aria-labelledby={triggerId}
        >
          {SOFTWARE_CATEGORIES.map((category, index) =>
            categoryHrefs?.[category.id] ? (
              <a
                key={category.id}
                ref={(element) => {
                  categoryButtonRefs.current[index] = element;
                }}
                href={categoryHrefs[category.id]}
                className="redesign-software-category-button"
                aria-current={selectedCategoryId === category.id ? "page" : undefined}
                data-selected={selectedCategoryId === category.id ? "true" : "false"}
                onClick={(event) =>
                  close(event.detail === 0 ? "keyboard" : "pointer")
                }
              >
                {category.label[locale]}
              </a>
            ) : (
              <button
                key={category.id}
                ref={(element) => {
                  categoryButtonRefs.current[index] = element;
                }}
                type="button"
                className="redesign-software-category-button"
                aria-pressed={selectedIndex === index}
                data-selected={selectedIndex === index ? "true" : "false"}
                onClick={(event) => {
                  setSelectedIndex(index);
                  setFocusedIndex(index);
                  close(event.detail === 0 ? "keyboard" : "pointer");
                }}
              >
                {category.label[locale]}
              </button>
            ),
          )}
        </div>
      </motion.div>
    </div>
  );
}
