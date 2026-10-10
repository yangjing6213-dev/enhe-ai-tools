import type { RedesignLocale } from "@/components/redesign/types";
import {
  SOFTWARE_CATEGORIES,
  type SoftwareCategoryId,
  type SoftwareLeafCategoryId,
} from "@/lib/redesign/software/software-categories";
import { buildToolCardHighlights } from "@/lib/tool-card-highlights";
import { SOFTWARE_COPY } from "@/lib/redesign/software/software-copy";
import type {
  RedesignSoftwareProductId,
  SoftwareProduct,
} from "@/lib/redesign/software/software-products";
import type {
  SoftwareCatalogItem,
  SoftwareCatalogPage,
} from "@/lib/redesign/software/software-production";

import { EnheRedesignSoftwareCategorySelector } from "./EnheRedesignSoftwareCategorySelector";
import { EnheRedesignSoftwareCard } from "./EnheRedesignSoftwareCard";
import { EnheRedesignSoftwareLoadMore } from "./EnheRedesignSoftwareLoadMore";
import { EnheRedesignSoftwareRail } from "./EnheRedesignSoftwareRail";

const INITIAL_VISIBLE_ALL_PRODUCTS = 9;
const SOFTWARE_CATALOG_ROOT_ID = "redesign-software-catalog";
const SOFTWARE_CATEGORY_TRIGGER_ID = "redesign-software-category-trigger";
const SOFTWARE_CATEGORY_PANEL_ID = "redesign-software-category-panel";
const ALL_PRODUCTS_ROOT_ID = "redesign-software-all-products";

type ProductionCatalogProps = {
  locale: RedesignLocale;
  mode: "production";
  listing: SoftwareCatalogPage;
  selectedCategory?: SoftwareLeafCategoryId;
};

type PreviewCatalogProps = {
  locale: RedesignLocale;
  mode: "preview";
  products: ReadonlyArray<SoftwareProduct>;
  newReleaseIds: ReadonlyArray<RedesignSoftwareProductId>;
  featuredProductIds: ReadonlyArray<RedesignSoftwareProductId>;
};

function getProduct(
  products: ReadonlyArray<SoftwareProduct>,
  productId: RedesignSoftwareProductId,
) {
  const product = products.find((candidate) => candidate.id === productId);

  if (!product) {
    throw new Error(`Missing software product: ${productId}`);
  }

  return product;
}

function getCategoryLabel(locale: RedesignLocale, categoryId: SoftwareLeafCategoryId) {
  const category = SOFTWARE_CATEGORIES.find((candidate) => candidate.id === categoryId);

  if (!category) {
    throw new Error(`Missing software category: ${categoryId}`);
  }

  return category.label[locale];
}

export function EnheRedesignSoftwareCatalog(
  props: ProductionCatalogProps | PreviewCatalogProps,
) {
  if (props.mode === "production") {
    return renderProductionCatalog(props);
  }

  return renderPreviewCatalog(props);
}

function renderProductionCatalog({
  locale,
  listing,
  selectedCategory,
}: ProductionCatalogProps) {
  const copy = SOFTWARE_COPY[locale];
  const activeCategory: SoftwareCategoryId = selectedCategory ?? "all";
  const basePath = locale === "en" ? "/en/software" : "/software";
  const categoryHrefs = Object.fromEntries(
    SOFTWARE_CATEGORIES.map((category) => [
      category.id,
      category.id === "all"
        ? basePath
        : `${basePath}?category=${category.id}`,
    ]),
  ) as Record<SoftwareCategoryId, string>;
  const emptyRecoveryHref = selectedCategory
    ? basePath
    : locale === "en"
      ? "/en"
      : "/";
  const emptyRecoveryLabel = selectedCategory
    ? locale === "en"
      ? "Clear filter"
      : "清除筛选"
    : locale === "en"
      ? "Return to ENHE AI home"
      : "返回 ENHE AI 首页";

  return (
    <main
      id={SOFTWARE_CATALOG_ROOT_ID}
      className="redesign-software redesign-software-page"
      data-locale={locale}
      data-software-catalog-root
      data-selected-category={activeCategory}
      data-production-catalog
    >
      <section className="redesign-software-hero">
        <h1>{copy.page.h1}</h1>
        <p className="redesign-software-intro">{copy.page.intro}</p>
      </section>

      <EnheRedesignSoftwareCategorySelector
        locale={locale}
        rootId={SOFTWARE_CATALOG_ROOT_ID}
        triggerId={SOFTWARE_CATEGORY_TRIGGER_ID}
        panelId={SOFTWARE_CATEGORY_PANEL_ID}
        selectedCategoryId={activeCategory}
        categoryHrefs={categoryHrefs}
      />

      {listing.newReleases.length > 0 ? (
        <CatalogSection
          locale={locale}
          heading={copy.sections.newReleases.heading}
          description={
            locale === "en"
              ? "The newest published entries, ordered by their public release record."
              : undefined
          }
          items={listing.newReleases}
          sectionId="new-releases"
          rail="new"
        />
      ) : null}

      {listing.featuredProducts.length > 0 ? (
        <CatalogSection
          locale={locale}
          heading={copy.sections.featuredProducts.heading}
          description={
            locale === "en"
              ? "Published products selected through the tracked editorial field."
              : undefined
          }
          items={listing.featuredProducts}
          sectionId="featured-products"
          rail="featured"
        />
      ) : null}

      <section className="redesign-software-section" data-section="all-products">
        <header className="redesign-software-section-header">
          <h2 id="all-products-heading">{copy.sections.allProducts.heading}</h2>
          <p>
            {locale === "en"
              ? `Showing page ${listing.page} of ${Math.max(1, listing.totalPages)} across ${listing.total} published products.`
              : `共 ${listing.total} 款公开产品，当前第 ${listing.page} / ${Math.max(1, listing.totalPages)} 页。`}
          </p>
        </header>
        <div
          id={ALL_PRODUCTS_ROOT_ID}
          className="redesign-software-grid redesign-software-grid-all"
          role="list"
          aria-labelledby="all-products-heading"
          data-all-products-root
          data-loaded="true"
        >
          {listing.items.map((product) => (
            <EnheRedesignSoftwareCard
              key={`all-${product.id}`}
              product={product}
              categoryLabel={getCategoryLabel(locale, product.categoryId)}
              locale={locale}
              sectionId="all-products"
              listItem
            />
          ))}
        </div>
        {listing.items.length === 0 ? (
          <div className="redesign-software-empty">
            <p role="status" aria-live="polite">
              {locale === "en"
                ? selectedCategory
                  ? "No published products are available in this category yet."
                  : "No published products are available yet."
                : selectedCategory
                  ? "该分类暂时没有已公开产品。"
                  : "暂时没有已公开产品。"}
            </p>
            <a className="redesign-software-empty-action" href={emptyRecoveryHref}>
              {emptyRecoveryLabel}
            </a>
          </div>
        ) : null}
        <div className="redesign-software-load-row">
          {listing.previousHref || listing.nextHref ? (
            <nav
              className="redesign-software-pagination"
              aria-label={locale === "en" ? "Catalog pagination" : "产品分页"}
            >
              {listing.previousHref ? (
                <a
                  className="redesign-software-next-link"
                  href={listing.previousHref}
                  rel="prev"
                >
                  {locale === "en" ? "Previous page" : "上一页"}
                </a>
              ) : null}
              {listing.nextHref ? (
                <a
                  className="redesign-software-load-more-button"
                  href={listing.nextHref}
                  rel="next"
                >
                  {copy.actions.loadMore}
                </a>
              ) : null}
            </nav>
          ) : null}
          <p
            className="redesign-software-load-more-status"
            role={listing.items.length > 0 ? "status" : undefined}
          >
            {locale === "en"
              ? `Page ${listing.page}; ${listing.items.length} of ${listing.total} products in this result.`
              : `第 ${listing.page} 页；本页 ${listing.items.length} 款，共 ${listing.total} 款。`}
          </p>
        </div>
      </section>
    </main>
  );
}

function CatalogSection({
  locale,
  heading,
  description,
  items,
  sectionId,
  rail,
}: {
  locale: RedesignLocale;
  heading: string;
  description?: string;
  items: SoftwareCatalogItem[];
  sectionId: "new-releases" | "featured-products";
  rail: "new" | "featured";
}) {
  return (
    <section className="redesign-software-section" data-section={sectionId}>
      <header className="redesign-software-section-header">
        <h2>{heading}</h2>
        {description ? <p>{description}</p> : null}
      </header>
      <EnheRedesignSoftwareRail
        ariaLabel={heading}
        data-horizontal-cards={rail}
        className={`redesign-software-grid redesign-software-grid-${rail} redesign-software-rail`}
      >
        {items.map((product) => (
          <EnheRedesignSoftwareCard
            key={`${rail}-${product.id}`}
            product={product}
            categoryLabel={getCategoryLabel(locale, product.categoryId)}
            locale={locale}
            sectionId={sectionId}
          />
        ))}
      </EnheRedesignSoftwareRail>
    </section>
  );
}

function renderPreviewCatalog({
  locale,
  products,
  newReleaseIds,
  featuredProductIds,
}: PreviewCatalogProps) {
  const copy = SOFTWARE_COPY[locale];
  const newReleaseProducts = newReleaseIds
    .map((productId) => getProduct(products, productId))
    .map((product) => localizePreviewProduct(product, locale));
  const featuredProducts = featuredProductIds
    .map((productId) => getProduct(products, productId))
    .map((product) => localizePreviewProduct(product, locale));
  const allProducts = products.map((product) =>
    localizePreviewProduct(product, locale),
  );

  return (
    <main
      id={SOFTWARE_CATALOG_ROOT_ID}
      className="redesign-software redesign-software-page"
      data-locale={locale}
      data-software-catalog-root
      data-selected-category="all"
    >
      <section className="redesign-software-hero">
        <h1>{copy.page.h1}</h1>
        <p className="redesign-software-intro">{copy.page.intro}</p>
      </section>

      <EnheRedesignSoftwareCategorySelector
        locale={locale}
        rootId={SOFTWARE_CATALOG_ROOT_ID}
        triggerId={SOFTWARE_CATEGORY_TRIGGER_ID}
        panelId={SOFTWARE_CATEGORY_PANEL_ID}
      />

      <CatalogSection
        locale={locale}
        heading={copy.sections.newReleases.heading}
        description={copy.sections.newReleases.description}
        items={newReleaseProducts}
        sectionId="new-releases"
        rail="new"
      />

      <CatalogSection
        locale={locale}
        heading={copy.sections.featuredProducts.heading}
        description={copy.sections.featuredProducts.description}
        items={featuredProducts}
        sectionId="featured-products"
        rail="featured"
      />

      <section className="redesign-software-section" data-section="all-products">
        <header className="redesign-software-section-header">
          <h2 id="all-products-heading">{copy.sections.allProducts.heading}</h2>
          <p>{copy.sections.allProducts.description}</p>
        </header>
        <div
          id={ALL_PRODUCTS_ROOT_ID}
          className="redesign-software-grid redesign-software-grid-all"
          role="list"
          aria-labelledby="all-products-heading"
          data-all-products-root
          data-loaded="false"
        >
          {allProducts.map((product, index) => (
            <EnheRedesignSoftwareCard
              key={`all-${product.id}`}
              product={product}
              categoryLabel={getCategoryLabel(locale, product.categoryId)}
              locale={locale}
              sectionId="all-products"
              extraHidden={index >= INITIAL_VISIBLE_ALL_PRODUCTS}
              listItem
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

function localizePreviewProduct(
  product: SoftwareProduct,
  locale: RedesignLocale,
): SoftwareCatalogItem {
  const type = product.detailHref.zh.startsWith("/ai-skills/") ? "ai_skill"
    : product.detailHref.zh.startsWith("/skill-learning/") ? "skill_learning" : "software";
  const numericPrice = Number(product.price[locale].replace(/[^0-9.]/g, ""));
  const isPaid = numericPrice > 0;
  return {
    id: product.id,
    type,
    secondaryName: locale === "zh" ? product.name.en : null,
    isPaid,
    highlights: buildToolCardHighlights({ type, isDownloadPaid: isPaid, downloadPrice: numericPrice, priceSpecs: [{ price: numericPrice, status: "active" }] }, locale),
    downloadCount: 0,
    usageCount: 0,
    categoryId: product.categoryId,
    name: product.name[locale],
    description: product.description[locale],
    price: product.price[locale],
    detailHref: product.detailHref[locale],
    media: product.media
      ? {
          src: product.media.src,
          alt: product.media.alt[locale],
          width: product.media.width,
          height: product.media.height,
        }
      : null,
  };
}
