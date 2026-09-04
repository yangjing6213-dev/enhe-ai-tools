import type { EbosSectionKey } from "./types";

export const EBOS_VERSION = "1.0" as const;

export const DEFAULT_EBOS_SECTION_KEYS = [
  "revenue",
  "traffic",
  "seo",
  "geo",
  "product",
  "content",
  "market",
  "competitor",
  "website_health",
  "next_plan"
] as const satisfies readonly EbosSectionKey[];

export const EBOS_SECTION_TITLES: Record<EbosSectionKey, string> = {
  revenue: "Revenue",
  traffic: "Traffic",
  seo: "SEO",
  geo: "GEO",
  product: "Product",
  content: "Content",
  market: "Market",
  competitor: "Competitor",
  website_health: "Website Health",
  next_plan: "Next Plan"
};

export const DEFAULT_EBOS_SECTION_WEIGHTS: Record<EbosSectionKey, number> = {
  revenue: 1.2,
  traffic: 1,
  seo: 1,
  geo: 1,
  product: 1.2,
  content: 0.9,
  market: 0.8,
  competitor: 0.7,
  website_health: 1,
  next_plan: 0.7
};

