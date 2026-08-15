"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { RedesignLocale } from "@/components/redesign/types";
import {
  SOFTWARE_CATEGORIES,
  type SoftwareCategoryId,
} from "@/lib/redesign/software/software-categories";

export const SOFTWARE_CATALOG_VISIBILITY_EVENT = "software-catalog:visibility-change";

const CATALOG_CARD_SELECTOR = "[data-catalog-card]";
const ALL_PRODUCTS_ROOT_SELECTOR = "[data-all-products-root]";
const LOAD_MORE_STATUS_SELECTOR = "[data-load-more-status]";

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
  const buttonRef = useRef<HTMLButtonElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const categoryButtonRefs = useRef<
    Array<HTMLButtonElement | HTMLAnchorElement | null>
  >([]);
  const touchStartYRef = useRef<number | null>(null);
  const usesServerNavigation = Boolean(categoryHrefs);
  const selectedCategory = SOFTWARE_CATEGORIES[selectedIndex];
  const triggerLabel = useMemo(
    () => selectedCategory.label[locale],
    [locale, selectedCategory],
  );

  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  const moveFocus = (direction: -1 | 1) => {
    setFocusedIndex((currentIndex) => {
      const nextIndex =
        (currentIndex + direction + SOFTWARE_CATEGORIES.length) % SOFTWARE_CATEGORIES.length;

      categoryButtonRefs.current[nextIndex]?.focus();
      return nextIndex;
    });
  };

  useEffect(() => {
    const nextIndex = SOFTWARE_CATEGORIES.findIndex(
      (category) => category.id === selectedCategoryId,
    );
    const normalizedIndex = Math.max(0, nextIndex);
    setSelectedIndex(normalizedIndex);
    setFocusedIndex(normalizedIndex);
  }, [selectedCategoryId]);

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

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }

      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        categoryButtonRefs.current[focusedIndex]?.click();
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        moveFocus(1);
        return;
      }

      if (event.key === "ArrowUp") {
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

      close();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [focusedIndex, open]);

  return (
    <div className="redesign-software-category-layer" data-open={open ? "true" : "false"}>
      <button
        id={triggerId}
        ref={buttonRef}
        type="button"
        className="redesign-software-category-trigger"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          setFocusedIndex(selectedIndex);
          setOpen((currentOpen) => !currentOpen);
        }}
      >
        <span>{triggerLabel}</span>
        <span aria-hidden="true">▾</span>
      </button>
      <div className="redesign-software-category-overlay" hidden={!open} onClick={close} />
      <div
        id={panelId}
        ref={layerRef}
        className="redesign-software-category-panel"
        hidden={!open}
        onTouchStart={(event) => {
          touchStartYRef.current = event.changedTouches[0]?.clientY ?? null;
        }}
        onTouchEnd={(event) => {
          const touchStartY = touchStartYRef.current;
          const touchEndY = event.changedTouches[0]?.clientY ?? touchStartY;

          if (touchStartY !== null && touchEndY - touchStartY > 48) {
            close();
          }

          touchStartYRef.current = null;
        }}
      >
        <div className="redesign-software-category-buttons" role="group" aria-labelledby={triggerId}>
          {SOFTWARE_CATEGORIES.map((category, index) => (
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
                onClick={close}
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
                onClick={() => {
                  setSelectedIndex(index);
                  setFocusedIndex(index);
                  close();
                }}
              >
                {category.label[locale]}
              </button>
            )
          ))}
        </div>
      </div>
    </div>
  );
}
