# SEO and GEO regression

- /software and /en/software are self-canonical page-1 routes.
- ?page=2 is independently server-rendered and self-canonical in each locale.
- Ordinary rel=prev and rel=next links are present only when applicable.
- Category URLs are noindex, follow and canonicalize to the locale base route.
- Paginated and category URLs are not added to the sitemap; sitemap URL membership is unchanged.
- The formal HTML contains one H1 and server-rendered product names, descriptions, links, image dimensions, Breadcrumb and truthful ItemList semantics.
- No AggregateRating, fake score, fake stock, fake download count, keyword wall, candidate label, or preview label is emitted.
- The formal Phase 2C.1.2 bilingual navigation, Footer, filing policy, and AnalyticsTracker remain present.
- R-008 remains closed; the Runtime Heartbeat seam and concurrent writer fix remain covered by the passing full suite.

Result: SITEMAP_URL_SET_CHANGED=NO, CATEGORY_INDEXABILITY=NOINDEX_FOLLOW, R008_STATUS=CLOSED.
