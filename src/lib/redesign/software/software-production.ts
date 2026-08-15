import type { RedesignLocale } from "@/components/redesign/types";
import { buildCanonicalToolPath } from "@/lib/public-slugs";
import { resolvePublicToolImageSrc } from "@/lib/tool-image";
import {
  buildLocalizedToolPreviewText,
  resolveLocalizedToolIdentity,
  shouldIndexEnglishToolPage,
} from "@/lib/tool-localization";
import { getPrimaryToolPrice } from "@/lib/tool-price-specs";

import {
  SOFTWARE_CATEGORIES,
  type SoftwareCategoryId,
  type SoftwareLeafCategoryId,
} from "./software-categories";

export const SOFTWARE_CATALOG_PAGE_SIZE = 12 as const;

export type PublicSoftwareCatalogRow = {
  id: string;
  slug: string;
  name: string;
  englishName: string | null;
  type: "software" | "online" | "skill_learning" | "ai_skill";
  shortDescription: string;
  content: string;
  coverImage: string | null;
  isDownloadPaid: boolean;
  downloadPrice: unknown;
  isHomeRecommended: boolean;
  sortOrder: number;
  createdAt: Date | string;
  category: { name: string } | null;
  priceSpecs: Array<{
    price: unknown;
    status: "active" | "disabled";
    sortOrder: number;
  }>;
};

export type SoftwareCatalogItem = {
  id: string;
  categoryId: SoftwareLeafCategoryId;
  name: string;
  description: string;
  price: string;
  detailHref: string;
  media: {
    src: string;
    alt: string;
    width: number;
    height: number;
  } | null;
};

export type SoftwareCatalogPage = {
  items: SoftwareCatalogItem[];
  newReleases: SoftwareCatalogItem[];
  featuredProducts: SoftwareCatalogItem[];
  total: number;
  page: number;
  pageSize: typeof SOFTWARE_CATALOG_PAGE_SIZE;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
  previousHref: string | null;
  nextHref: string | null;
};

export type SoftwareCatalogSearchParams = Record<
  string,
  string | string[] | undefined
>;

const leafCategoryIds = new Set<SoftwareCategoryId>(
  SOFTWARE_CATEGORIES.map((category) => category.id),
);

export function parseSoftwareCatalogSearchParams(
  searchParams: SoftwareCatalogSearchParams,
): { page: number; category: SoftwareLeafCategoryId | undefined } | null {
  const rawPage = searchParams.page;
  const rawCategory = searchParams.category;

  if (Array.isArray(rawPage) || Array.isArray(rawCategory)) return null;

  const normalizedPage = rawPage?.trim();
  const page = normalizedPage ? Number(normalizedPage) : 1;
  if (
    (normalizedPage && !/^[1-9]\d*$/.test(normalizedPage)) ||
    !Number.isSafeInteger(page) ||
    page < 1
  ) {
    return null;
  }

  const normalizedCategory = rawCategory?.trim() as
    | SoftwareCategoryId
    | undefined;
  if (
    normalizedCategory &&
    !leafCategoryIds.has(normalizedCategory)
  ) {
    return null;
  }

  return {
    page,
    category:
      normalizedCategory && normalizedCategory !== "all"
        ? normalizedCategory
        : undefined,
  };
}

export function buildSoftwareCatalogPage({
  rows,
  locale,
  category,
  page,
}: {
  rows: PublicSoftwareCatalogRow[];
  locale: RedesignLocale;
  category?: SoftwareLeafCategoryId;
  page: number;
}): SoftwareCatalogPage | null {
  if (!Number.isSafeInteger(page) || page < 1) return null;

  const publicRows = rows
    .filter((row) => isVisibleInLocale(row, locale))
    .map((row) => ({ row, categoryId: resolveSoftwareCatalogCategory(row) }))
    .filter((entry) => !category || entry.categoryId === category)
    .sort(compareCatalogRows);
  const total = publicRows.length;
  const totalPages = Math.ceil(total / SOFTWARE_CATALOG_PAGE_SIZE);

  if (page > Math.max(1, totalPages)) return null;

  const pageStart = (page - 1) * SOFTWARE_CATALOG_PAGE_SIZE;
  const items = publicRows
    .slice(pageStart, pageStart + SOFTWARE_CATALOG_PAGE_SIZE)
    .map(({ row, categoryId }) => buildCatalogItem(row, categoryId, locale));
  const newReleases = [...publicRows]
    .sort(compareNewReleaseRows)
    .slice(0, 4)
    .map(({ row, categoryId }) => buildCatalogItem(row, categoryId, locale));
  const featuredProducts = publicRows
    .filter(({ row }) => row.isHomeRecommended)
    .slice(0, 3)
    .map(({ row, categoryId }) => buildCatalogItem(row, categoryId, locale));
  const hasPrevious = page > 1;
  const hasNext = page < totalPages;

  return {
    items,
    newReleases,
    featuredProducts,
    total,
    page,
    pageSize: SOFTWARE_CATALOG_PAGE_SIZE,
    totalPages,
    hasPrevious,
    hasNext,
    previousHref: hasPrevious
      ? buildCatalogHref(locale, category, page - 1)
      : null,
    nextHref: hasNext ? buildCatalogHref(locale, category, page + 1) : null,
  };
}

export async function getProductionSoftwareCatalog({
  locale,
  category,
  page,
}: {
  locale: RedesignLocale;
  category?: SoftwareLeafCategoryId;
  page: number;
}) {
  const { getPublicSoftwareCatalogRows } = await import("@/lib/public-content");
  const rows = await getPublicSoftwareCatalogRows();

  return buildSoftwareCatalogPage({ rows, locale, category, page });
}

export async function getProductionSoftwareRouteData({
  locale,
  searchParams,
}: {
  locale: RedesignLocale;
  searchParams: SoftwareCatalogSearchParams;
}) {
  const request = parseSoftwareCatalogSearchParams(searchParams);
  if (!request) return null;

  const { getPublicSoftwareCatalogRows } = await import("@/lib/public-content");
  const rows = await getPublicSoftwareCatalogRows();
  const listing = buildSoftwareCatalogPage({ rows, locale, ...request });
  if (!listing) return null;

  return {
    listing,
    languageHrefs: buildSoftwareCatalogLanguageHrefs(
      rows,
      request.category,
      request.page,
    ),
  };
}

export function buildSoftwareCatalogLanguageHrefs(
  rows: PublicSoftwareCatalogRow[],
  category: SoftwareLeafCategoryId | undefined,
  page: number,
) {
  return Object.fromEntries(
    (["zh", "en"] as const).map((locale) => {
      const targetPage = buildSoftwareCatalogPage({
        rows,
        locale,
        category,
        page,
      });

      return [
        locale,
        buildCatalogHref(locale, category, targetPage ? page : 1),
      ];
    }),
  ) as Record<RedesignLocale, string>;
}

function isVisibleInLocale(
  row: PublicSoftwareCatalogRow,
  locale: RedesignLocale,
) {
  if (locale === "en") return shouldIndexEnglishToolPage(row);

  return Boolean(
    row.name.trim() &&
      buildLocalizedToolPreviewText(
        { ...row, categoryName: row.category?.name },
        "zh",
      ).trim(),
  );
}

function resolveSoftwareCatalogCategory(
  row: PublicSoftwareCatalogRow,
): SoftwareLeafCategoryId {
  if (row.type === "ai_skill" || row.type === "skill_learning") {
    return "skill";
  }

  const identity = normalizeCategoryText(
    `${row.name} ${row.englishName ?? ""} ${row.slug}`,
  );
  const category = normalizeCategoryText(row.category?.name ?? "");
  const combined = `${identity} ${category}`;

  if (matchesCategory(combined, ["语音", "音频", "voice", "audio"])) {
    return "audio";
  }
  if (matchesCategory(combined, ["智能体", "agent"])) return "agent";
  if (
    matchesCategory(identity, [
      "图片",
      "图像",
      "image",
      "photo",
      "portrait",
      "face",
    ])
  ) {
    return "image";
  }
  if (matchesCategory(identity, ["视频", "video"])) return "video";
  if (matchesCategory(category, ["图片", "图像", "image", "photo"])) {
    return "image";
  }
  if (matchesCategory(category, ["视频", "video"])) return "video";

  return "efficiency";
}

function normalizeCategoryText(value: string) {
  return value.toLowerCase().replace(/[\/\\|&+_\-]/g, " ");
}

function matchesCategory(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}

function compareCatalogRows(
  left: { row: PublicSoftwareCatalogRow },
  right: { row: PublicSoftwareCatalogRow },
) {
  return (
    left.row.sortOrder - right.row.sortOrder ||
    getCreatedAtTime(right.row.createdAt) - getCreatedAtTime(left.row.createdAt) ||
    left.row.id.localeCompare(right.row.id)
  );
}

function compareNewReleaseRows(
  left: { row: PublicSoftwareCatalogRow },
  right: { row: PublicSoftwareCatalogRow },
) {
  return (
    getCreatedAtTime(right.row.createdAt) - getCreatedAtTime(left.row.createdAt) ||
    left.row.sortOrder - right.row.sortOrder ||
    left.row.id.localeCompare(right.row.id)
  );
}

function getCreatedAtTime(value: Date | string) {
  return value instanceof Date ? value.getTime() : Date.parse(value);
}

function buildCatalogItem(
  row: PublicSoftwareCatalogRow,
  categoryId: SoftwareLeafCategoryId,
  locale: RedesignLocale,
): SoftwareCatalogItem {
  const localizedIdentity = resolveLocalizedToolIdentity(row, locale);
  const description = buildLocalizedToolPreviewText(
    { ...row, categoryName: row.category?.name },
    locale,
  );
  const primaryPrice = getPrimaryToolPrice(
    row.priceSpecs,
    row.type === "software" || row.type === "ai_skill"
      ? row.downloadPrice
      : 0,
  );
  const isPaid =
    primaryPrice > 0 &&
    (row.type === "software" || row.type === "ai_skill"
      ? row.isDownloadPaid
      : true);
  const mediaSrc = resolvePublicToolImageSrc(row.id, row.coverImage);

  return {
    id: row.id,
    categoryId,
    name: localizedIdentity.primaryName,
    description,
    price: isPaid
      ? `¥${primaryPrice.toFixed(2)}`
      : locale === "en"
        ? "Free"
        : "免费",
    detailHref: buildCanonicalToolPath(row, locale),
    media: mediaSrc
      ? {
          src: mediaSrc,
          alt: localizedIdentity.primaryName,
          width: 1672,
          height: 941,
        }
      : null,
  };
}

function buildCatalogHref(
  locale: RedesignLocale,
  category: SoftwareLeafCategoryId | undefined,
  page: number,
) {
  const basePath = locale === "en" ? "/en/software" : "/software";
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();

  return query ? `${basePath}?${query}` : basePath;
}
