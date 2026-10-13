import type { RedesignLocale } from "@/components/redesign/types";
import { HOME_PRODUCTS } from "@/lib/redesign/home/home-products";

export const HOME_PRODUCT_SHOWCASE_SETTING_KEY = "home_product_showcase_v1";

export type HomeProductShowcaseItem = {
  id: string;
  name: Record<RedesignLocale, string>;
  description: Record<RedesignLocale, string>;
  alt: Record<RedesignLocale, string>;
  mediaType: "image" | "video";
  mediaSrc: string;
  detailHref: Record<RedesignLocale, string>;
};

type HomeProductShowcaseConfig = {
  version: 1;
  products: HomeProductShowcaseItem[];
};

const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isPublicUrl(value: unknown, allowCos = false): value is string {
  if (typeof value !== "string" || value.length > 2048) return false;
  const trimmed = value.trim();
  if (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.includes("\\")) return true;
  try {
    const url = new URL(trimmed);
    if (url.protocol === "https:" && url.hostname && !url.username && !url.password) return true;
  } catch {
    // Keep parsing below limited to the private COS key format.
  }
  return allowCos && /^cos:\/\/[a-z0-9.-]+\/[a-z0-9/_-][a-z0-9/_.-]*$/i.test(trimmed) &&
    !trimmed.slice("cos://".length).split("/").some((segment) => segment === "." || segment === "..");
}

function isLocalizedText(value: unknown, maxLength: number): value is Record<RedesignLocale, string> {
  if (!value || typeof value !== "object") return false;
  const localized = value as Record<string, unknown>;
  return ["zh", "en"].every((locale) =>
    typeof localized[locale] === "string" &&
    localized[locale].trim().length > 0 &&
    localized[locale].length <= maxLength,
  );
}

export function createDefaultHomeProductShowcase(): HomeProductShowcaseItem[] {
  return HOME_PRODUCTS.map((product) => ({
    id: product.id,
    name: { ...product.name },
    description: { ...product.description },
    alt: { ...product.alt },
    mediaType: "image",
    mediaSrc: product.mediaSrc,
    detailHref: { ...product.detailHref },
  }));
}

export function parseHomeProductShowcaseConfig(value: string | undefined | null): HomeProductShowcaseItem[] | null {
  if (!value || value.length > 200_000) return null;
  let config: unknown;
  try {
    config = JSON.parse(value);
  } catch {
    return null;
  }

  if (!config || typeof config !== "object") return null;
  const candidate = config as Partial<HomeProductShowcaseConfig>;
  if (candidate.version !== 1 || !Array.isArray(candidate.products) || candidate.products.length === 0) return null;

  const ids = new Set<string>();
  const products: HomeProductShowcaseItem[] = [];
  for (const rawProduct of candidate.products) {
    if (!rawProduct || typeof rawProduct !== "object") return null;
    const product = rawProduct as Partial<HomeProductShowcaseItem>;
    if (
      typeof product.id !== "string" || !idPattern.test(product.id) || ids.has(product.id) ||
      (product.mediaType !== "image" && product.mediaType !== "video") ||
      !isLocalizedText(product.name, 160) ||
      !isLocalizedText(product.description, 800) ||
      !isLocalizedText(product.alt, 300) ||
      !isPublicUrl(product.mediaSrc, product.mediaType === "video") ||
      !isLocalizedText(product.detailHref, 2048) ||
      !isPublicUrl(product.detailHref.zh) ||
      !isPublicUrl(product.detailHref.en)
    ) return null;
    ids.add(product.id);
    products.push({
      id: product.id,
      name: { zh: product.name.zh.trim(), en: product.name.en.trim() },
      description: { zh: product.description.zh.trim(), en: product.description.en.trim() },
      alt: { zh: product.alt.zh.trim(), en: product.alt.en.trim() },
      mediaType: product.mediaType,
      mediaSrc: product.mediaSrc.trim(),
      detailHref: { zh: product.detailHref.zh.trim(), en: product.detailHref.en.trim() },
    });
  }
  return products;
}

export function moveHomeShowcaseProduct<T extends { id: string }>(products: readonly T[], id: string, delta: -1 | 1): T[] {
  const currentIndex = products.findIndex((product) => product.id === id);
  const nextIndex = currentIndex + delta;
  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= products.length) return [...products];
  const next = [...products];
  [next[currentIndex], next[nextIndex]] = [next[nextIndex], next[currentIndex]];
  return next;
}

export function resolveHomeShowcaseMediaSrc(source: string) {
  const trimmed = source.trim();
  if (trimmed.startsWith("cos://")) return `/api/tool-videos?src=${encodeURIComponent(trimmed)}`;
  if (/^\/?uploads\/tool-videos\//i.test(trimmed)) return `/api/${trimmed.replace(/^\/+/, "")}`;
  if (/^https:\/\/[^\s]+\.cos\.[^\s]+\/tool-videos\//i.test(trimmed)) {
    return `/api/tool-videos?src=${encodeURIComponent(trimmed)}`;
  }
  return trimmed;
}
