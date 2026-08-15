import type { RedesignLocale } from "@/components/redesign/types";
import {
  FEATURED_PRODUCT_IDS,
  NEW_RELEASE_IDS,
  SOFTWARE_PRODUCTS,
} from "@/lib/redesign/software/software-products";

import { EnheRedesignSoftwareCatalog } from "./EnheRedesignSoftwareCatalog";

export function EnheRedesignSoftwarePreviewCatalog({
  locale,
}: {
  locale: RedesignLocale;
}) {
  return (
    <EnheRedesignSoftwareCatalog
      locale={locale}
      mode="preview"
      products={SOFTWARE_PRODUCTS}
      newReleaseIds={NEW_RELEASE_IDS}
      featuredProductIds={FEATURED_PRODUCT_IDS}
    />
  );
}
