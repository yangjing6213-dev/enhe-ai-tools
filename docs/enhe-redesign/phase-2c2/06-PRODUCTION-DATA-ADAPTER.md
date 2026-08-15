# Production data adapter

The formal routes use getProductionSoftwareCatalog and getProductionSoftwareRouteData from the server adapter. They do not use SOFTWARE_PRODUCTS or any other preview fixture.

The adapter:

- receives locale, category, and page;
- queries the existing published Tool source through getPublicSoftwareCatalogRows;
- filters to rows that are public and displayable in the requested locale;
- maps the seven approved category choices to tracked server-side filters;
- orders deterministically, then creates independent 12-item page batches;
- returns at most four new releases and at most three approved featured products;
- builds locale-aware detail links and language-switch links;
- propagates database failure instead of turning an outage into a false empty 200 response;
- is cached for 300 seconds using the existing public-tools invalidation boundary.

The explicit public projection excludes file paths, permanent download URLs, object keys, orders, deliveries, unverified ratings, and inventory claims. createdAt accepts both Date and serialized string values because the cached query crosses a serialization boundary.

In-memory pagination is intentional here: locale visibility and approved-category mapping happen after the existing public query. Applying database skip/take first would violate the exact 12-visible-items contract. This is a bounded correctness tradeoff, not an assertion that it is optimal for an unbounded catalog.
