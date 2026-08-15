import "@/styles/redesign/software.css";

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EnheRedesignSoftwareCatalog } from "@/components/redesign/software/EnheRedesignSoftwareCatalog";
import { StructuredData } from "@/components/structured-data";
import { getDictionary, type Locale } from "@/lib/dictionaries";
import {
  getProductionSoftwareCatalog,
  parseSoftwareCatalogSearchParams,
  type SoftwareCatalogPage,
  type SoftwareCatalogSearchParams,
} from "@/lib/redesign/software/software-production";
import {
  absoluteUrl,
  buildAvailableLanguageAlternates,
  buildBreadcrumbSchema,
  buildListingMetadataTitle,
  buildListingMetaDescription,
  buildLocalePath,
  buildPageMetadata,
} from "@/lib/seo";

const unsupportedLegacyFilterKeys = ["q", "categoryName", "paid", "sort"] as const;

export async function generateSoftwarePageMetadata(
  forceLocale: Locale,
  searchParams: Promise<SoftwareCatalogSearchParams> = Promise.resolve({}),
): Promise<Metadata> {
  const params = await searchParams;
  const request = parseSoftwareCatalogSearchParams(params);
  const hasUnsupportedLegacyFilter = unsupportedLegacyFilterKeys.some(
    (key) => Boolean(params[key]),
  );
  const hasCategoryParameter = params.category !== undefined;
  const canonicalPath =
    request && !request.category && request.page > 1
      ? `/software?page=${request.page}`
      : "/software";
  const t = getDictionary(forceLocale);
  const metadata = buildPageMetadata({
    title: buildListingMetadataTitle("software", forceLocale, t.brand),
    description: buildListingMetaDescription("software", forceLocale),
    path: canonicalPath,
    locale: forceLocale === "en" ? "en_US" : "zh_CN",
    localeKey: forceLocale,
    languageAlternates:
      request && !request.category && request.page > 1
        ? buildAvailableLanguageAlternates(canonicalPath, [forceLocale])
        : undefined,
  });

  if (!request || hasCategoryParameter || hasUnsupportedLegacyFilter) {
    return {
      ...metadata,
      robots: { index: false, follow: true },
    };
  }

  return metadata;
}

export async function SoftwarePageShell({
  searchParams,
  forceLocale,
  preloadedListing,
}: {
  searchParams: Promise<SoftwareCatalogSearchParams>;
  forceLocale: Locale;
  preloadedListing?: SoftwareCatalogPage;
}) {
  const request = parseSoftwareCatalogSearchParams(await searchParams);
  if (!request) notFound();

  const listing =
    preloadedListing ??
    (await getProductionSoftwareCatalog({
      locale: forceLocale,
      category: request.category,
      page: request.page,
    }));
  if (!listing) notFound();

  const t = getDictionary(forceLocale);
  const breadcrumbSchema = buildBreadcrumbSchema({
    schemaType: "BreadcrumbList",
    items: [
      { name: t.nav.home, path: forceLocale === "en" ? "/en" : "/" },
      {
        name: t.listing.softwareTitle,
        path: forceLocale === "en" ? "/en/software" : "/software",
      },
    ],
  });
  const collectionSchema = buildSoftwareCollectionSchema(
    forceLocale,
    listing,
    Boolean(request.category),
  );

  return (
    <>
      <StructuredData data={[breadcrumbSchema, collectionSchema]} />
      <EnheRedesignSoftwareCatalog
        locale={forceLocale}
        mode="production"
        listing={listing}
        selectedCategory={request.category}
      />
    </>
  );
}

function buildSoftwareCollectionSchema(
  locale: Locale,
  listing: SoftwareCatalogPage,
  hasCategory: boolean,
) {
  const basePath = "/software";
  const pagePath =
    !hasCategory && listing.page > 1
      ? `${basePath}?page=${listing.page}`
      : basePath;

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: SOFTWARE_PAGE_SCHEMA_COPY[locale].name,
    description: SOFTWARE_PAGE_SCHEMA_COPY[locale].description,
    url: absoluteUrl(buildLocalePath(pagePath, locale)),
    inLanguage: locale === "en" ? "en-US" : "zh-CN",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: listing.items.length,
      itemListElement: listing.items.map((item, index) => ({
        "@type": "ListItem",
        position: (listing.page - 1) * listing.pageSize + index + 1,
        name: item.name,
        description: item.description,
        url: absoluteUrl(item.detailHref),
      })),
    },
  };
}

const SOFTWARE_PAGE_SCHEMA_COPY = {
  zh: {
    name: "ENHE AI 工具目录",
    description: "按真实任务浏览已公开的 ENHE AI 工具、软件、课程与效率入口。",
  },
  en: {
    name: "ENHE AI tools catalog",
    description:
      "Browse published ENHE AI tools, software, courses, and productivity entries by real task.",
  },
} as const;
