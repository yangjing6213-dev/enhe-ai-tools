import type { ProductionFiling } from "@/lib/production-filing";
import type { RedesignLocale } from "./types";

export const REDESIGN_PREVIEW_FILING = {
  zh: {
    icp: { label: "ICP备案" },
    publicSecurity: { label: "公安备案" },
  },
  en: {
    icp: { label: "ICP filing" },
    publicSecurity: { label: "Public-security filing" },
  },
} satisfies Record<RedesignLocale, ProductionFiling>;
