"use client";

import { useState } from "react";

import {
  SOFTWARE_CATALOG_VISIBILITY_EVENT,
  getSoftwareCatalogRoot,
} from "./EnheRedesignSoftwareCategorySelector";

export function EnheRedesignSoftwareLoadMore({
  rootId,
  allProductsId,
  buttonLabel,
  collapsedStatus,
  expandedStatus,
  filteredStatus,
}: {
  rootId: string;
  allProductsId: string;
  buttonLabel: string;
  collapsedStatus: string;
  expandedStatus: string;
  filteredStatus: string;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="redesign-software-load-more-wrap">
      <button
        type="button"
        className="redesign-software-load-more-button"
        data-load-more
        hidden={loaded}
        data-loaded={loaded ? "true" : "false"}
        onClick={() => {
          const catalogRoot = getSoftwareCatalogRoot(rootId);
          const allProductsRoot = document.getElementById(allProductsId);

          if (!catalogRoot || !allProductsRoot) {
            return;
          }

          allProductsRoot.dataset.loaded = "true";
          allProductsRoot.setAttribute("data-loaded", "true");
          setLoaded(true);
          catalogRoot.dispatchEvent(
            new CustomEvent(SOFTWARE_CATALOG_VISIBILITY_EVENT, { bubbles: true }),
          );
        }}
      >
        {buttonLabel}
      </button>
      <p
        className="redesign-software-load-more-status"
        role="status"
        aria-live="polite"
        data-load-more-status
        data-collapsed-text={collapsedStatus}
        data-expanded-text={expandedStatus}
        data-filtered-text={filteredStatus}
      >
        {loaded ? expandedStatus : collapsedStatus}
      </p>
    </div>
  );
}
