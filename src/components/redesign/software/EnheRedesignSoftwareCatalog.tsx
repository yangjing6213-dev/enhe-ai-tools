import type { RedesignLocale } from "@/components/redesign/types";
import {
  SOFTWARE_CATEGORIES,
  type SoftwareCategoryId,
  type SoftwareLeafCategoryId,
} from "@/lib/redesign/software/software-categories";
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
        <p className="redesign-software-label">{copy.page.label}</p>
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

      <CatalogSection
        locale={locale}
        heading={copy.sections.newReleases.heading}
        description={
          locale === "en"
            ? "The newest published entries, ordered by their public release record."
            : "按公开发布时间展示最新上架的工具入口。"
        }
        items={listing.newReleases}
        sectionId="new-releases"
        rail="new"
      />

      <CatalogSection
        locale={locale}
        heading={copy.sections.featuredProducts.heading}
        description={
          locale === "en"
            ? "Published products selected through the tracked editorial field."
            : "通过已跟踪的编辑推荐字段筛选公开产品。"
        }
        items={listing.featuredProducts}
        sectionId="featured-products"
        rail="featured"
      />

      <section className="redesign-software-section" data-section="all-products">
        <header className="redesign-software-section-header">
          <h2>{copy.sections.allProducts.heading}</h2>
          <p>
            {locale === "en"
              ? `Showing page ${listing.page} of ${Math.max(1, listing.totalPages)} across ${listing.total} published products.`
              : `共 ${listing.total} 款公开产品，当前第 ${listing.page} / ${Math.max(1, listing.totalPages)} 页。`}
          </p>
        </header>
        <div
          id={ALL_PRODUCTS_ROOT_ID}
          className="redesign-software-grid redesign-software-grid-all"
          data-all-products-root
          data-loaded="true"
        >
          {listing.items.map((product) => (
            <EnheRedesignSoftwareCard
              key={`all-${product.id}`}
              locale={locale}
              product={product}
              categoryLabel={getCategoryLabel(locale, product.categoryId)}
              detailLabel={copy.actions.detail}
              sectionId="all-products"
            />
          ))}
          {listing.items.length === 0 ? (
            <p className="redesign-software-empty" role="status">
              {locale === "en"
                ? "No published products are available in this category yet."
                : "该分类暂时没有已公开产品。"}
            </p>
          ) : null}
        </div>
        <nav
          className="redesign-software-load-row"
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
          <p className="redesign-software-load-more-status" role="status">
            {locale === "en"
              ? `Page ${listing.page}; ${listing.items.length} of ${listing.total} products in this result.`
              : `第 ${listing.page} 页；本页 ${listing.items.length} 款，共 ${listing.total} 款。`}
          </p>
        </nav>
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
  description: string;
  items: SoftwareCatalogItem[];
  sectionId: "new-releases" | "featured-products";
  rail: "new" | "featured";
}) {
  const copy = SOFTWARE_COPY[locale];

  return (
    <section className="redesign-software-section" data-section={sectionId}>
      <header className="redesign-software-section-header">
        <h2>{heading}</h2>
        <p>{description}</p>
      </header>
      <EnheRedesignSoftwareRail
        ariaLabel={heading}
        data-horizontal-cards={rail}
        className={`redesign-software-grid redesign-software-grid-${rail} redesign-software-rail`}
      >
        {items.map((product) => (
          <EnheRedesignSoftwareCard
            key={`${rail}-${product.id}`}
            locale={locale}
            product={product}
            categoryLabel={getCategoryLabel(locale, product.categoryId)}
            detailLabel={copy.actions.detail}
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
          <h2>{copy.sections.allProducts.heading}</h2>
          <p>{copy.sections.allProducts.description}</p>
        </header>
        <div
          id={ALL_PRODUCTS_ROOT_ID}
          className="redesign-software-grid redesign-software-grid-all"
          data-all-products-root
          data-loaded="false"
        >
          {allProducts.map((product, index) => (
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

function localizePreviewProduct(
  product: SoftwareProduct,
  locale: RedesignLocale,
): SoftwareCatalogItem {
  return {
    id: product.id,
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
