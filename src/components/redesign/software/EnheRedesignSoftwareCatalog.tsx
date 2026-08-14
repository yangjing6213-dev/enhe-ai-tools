import type { RedesignLocale } from "@/components/redesign/types";
import { SOFTWARE_CATEGORIES } from "@/lib/redesign/software/software-categories";
import { SOFTWARE_COPY } from "@/lib/redesign/software/software-copy";
import {
  FEATURED_PRODUCT_IDS,
  NEW_RELEASE_IDS,
  SOFTWARE_PRODUCTS,
  type RedesignSoftwareProductId,
} from "@/lib/redesign/software/software-products";

import { EnheRedesignSoftwareCategorySelector } from "./EnheRedesignSoftwareCategorySelector";
import { EnheRedesignSoftwareCard } from "./EnheRedesignSoftwareCard";
import { EnheRedesignSoftwareLoadMore } from "./EnheRedesignSoftwareLoadMore";
import { EnheRedesignSoftwareRail } from "./EnheRedesignSoftwareRail";

const INITIAL_VISIBLE_ALL_PRODUCTS = 9;
const SOFTWARE_CATALOG_ROOT_ID = "redesign-software-catalog";
const SOFTWARE_CATEGORY_TRIGGER_ID = "redesign-software-category-trigger";
const SOFTWARE_CATEGORY_PANEL_ID = "redesign-software-category-panel";
const ALL_PRODUCTS_ROOT_ID = "redesign-software-all-products";

function getProduct(productId: RedesignSoftwareProductId) {
  const product = SOFTWARE_PRODUCTS.find((candidate) => candidate.id === productId);

  if (!product) {
    throw new Error(`Missing software product: ${productId}`);
  }

  return product;
}

function getCategoryLabel(locale: RedesignLocale, categoryId: (typeof SOFTWARE_PRODUCTS)[number]["categoryId"]) {
  const category = SOFTWARE_CATEGORIES.find((candidate) => candidate.id === categoryId);

  if (!category) {
    throw new Error(`Missing software category: ${categoryId}`);
  }

  return category.label[locale];
}

export function EnheRedesignSoftwareCatalog({ locale }: { locale: RedesignLocale }) {
  const copy = SOFTWARE_COPY[locale];
  const newReleaseProducts = NEW_RELEASE_IDS.map(getProduct);
  const featuredProducts = FEATURED_PRODUCT_IDS.map(getProduct);

  return (
    <main
      id={SOFTWARE_CATALOG_ROOT_ID}
      className="redesign-software redesign-software-page"
      data-locale={locale}
      data-software-catalog-root
      data-selected-category="all"
    >
      <section className="redesign-software-hero">
        <p className="redesign-software-label">{copy.page.label}</p>
        <h1>{copy.page.h1}</h1>
        <p className="redesign-software-intro">{copy.page.intro}</p>
      </section>

      <EnheRedesignSoftwareCategorySelector
        locale={locale}
        rootId={SOFTWARE_CATALOG_ROOT_ID}
        triggerId={SOFTWARE_CATEGORY_TRIGGER_ID}
        panelId={SOFTWARE_CATEGORY_PANEL_ID}
      />

      <section className="redesign-software-section" data-section="new-releases">
        <header className="redesign-software-section-header">
          <h2>{copy.sections.newReleases.heading}</h2>
          <p>{copy.sections.newReleases.description}</p>
        </header>
        <EnheRedesignSoftwareRail
          ariaLabel={copy.sections.newReleases.heading}
          data-horizontal-cards="new"
          className="redesign-software-grid redesign-software-grid-new redesign-software-rail"
        >
          {newReleaseProducts.map((product) => (
            <EnheRedesignSoftwareCard
              key={`new-${product.id}`}
              locale={locale}
              product={product}
              categoryLabel={getCategoryLabel(locale, product.categoryId)}
              detailLabel={copy.actions.detail}
              sectionId="new-releases"
            />
          ))}
        </EnheRedesignSoftwareRail>
      </section>

      <section className="redesign-software-section" data-section="featured-products">
        <header className="redesign-software-section-header">
          <h2>{copy.sections.featuredProducts.heading}</h2>
          <p>{copy.sections.featuredProducts.description}</p>
        </header>
        <EnheRedesignSoftwareRail
          ariaLabel={copy.sections.featuredProducts.heading}
          data-horizontal-cards="featured"
          className="redesign-software-grid redesign-software-grid-featured redesign-software-rail"
        >
          {featuredProducts.map((product) => (
            <EnheRedesignSoftwareCard
              key={`featured-${product.id}`}
              locale={locale}
              product={product}
              categoryLabel={getCategoryLabel(locale, product.categoryId)}
              detailLabel={copy.actions.detail}
              sectionId="featured-products"
            />
          ))}
        </EnheRedesignSoftwareRail>
      </section>

      <section className="redesign-software-section" data-section="all-products">
        <header className="redesign-software-section-header">
          <h2>{copy.sections.allProducts.heading}</h2>
          <p>{copy.sections.allProducts.description}</p>
        </header>
        <div
          id={ALL_PRODUCTS_ROOT_ID}
          className="redesign-software-grid redesign-software-grid-all"
          data-all-products-root
          data-loaded="false"
        >
          {SOFTWARE_PRODUCTS.map((product, index) => (
            <EnheRedesignSoftwareCard
              key={`all-${product.id}`}
              locale={locale}
              product={product}
              categoryLabel={getCategoryLabel(locale, product.categoryId)}
              detailLabel={copy.actions.detail}
              sectionId="all-products"
              extraHidden={index >= INITIAL_VISIBLE_ALL_PRODUCTS}
            />
          ))}
        </div>
        <div className="redesign-software-load-row">
          <EnheRedesignSoftwareLoadMore
            rootId={SOFTWARE_CATALOG_ROOT_ID}
            allProductsId={ALL_PRODUCTS_ROOT_ID}
            buttonLabel={copy.actions.loadMore}
            collapsedStatus={
              locale === "en" ? "Showing 9 of 12 products." : "当前显示 9 / 12 个产品。"
            }
            expandedStatus={
              locale === "en" ? "Showing all 12 products." : "当前显示全部 12 个产品。"
            }
            filteredStatus={
              locale === "en"
                ? "Current category shows {visible} of {total} products."
                : "当前分类显示 {visible} / {total} 个产品。"
            }
          />
          <a className="redesign-software-next-link" href="?page=2" rel="next">
            {copy.actions.pageTwo}
          </a>
        </div>
      </section>
    </main>
  );
}
