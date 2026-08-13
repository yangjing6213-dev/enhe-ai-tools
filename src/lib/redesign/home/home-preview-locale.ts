import type { RedesignLocale } from "@/components/redesign/types";

export type RedesignHomePreviewSearchParams = {
  locale?: string | string[];
};

export function resolveRedesignPreviewLocale(
  params: RedesignHomePreviewSearchParams,
  middlewareLocale: string | null,
): RedesignLocale {
  const requestedLocale = Array.isArray(params.locale)
    ? params.locale[0]
    : params.locale;

  if (requestedLocale !== undefined) {
    return requestedLocale === "en" || requestedLocale === "zh"
      ? requestedLocale
      : "zh";
  }

  return middlewareLocale === "en" || middlewareLocale === "zh"
    ? middlewareLocale
    : "zh";
}
