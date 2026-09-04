# EBOS Product URL Source and Route Mapping

## Scope

This document records the read-only route and sitemap analysis for EBOS Step 3.6. It does not change public product routing, admin UI, Prisma schema, or production data.

## Current Public Product Routes

- Chinese software listing page: `/software`
  - Implemented by `src/app/(zh-public)/software/page.tsx`
  - Uses `SoftwarePageShell` from `src/app/software/page-shell.tsx`
- English software listing page: `/en/software`
  - Implemented by `src/app/en/software/page.tsx`
  - Uses the same `SoftwarePageShell`
- Chinese software detail page: `/software/[slug]`
  - Implemented by `src/app/(zh-public)/software/[slug]/page.tsx`
  - Delegates to `ToolDetailPageShell` with `expectedType="software"`
- English software detail page: `/en/software/[slug]`
  - Implemented by `src/app/en/software/[slug]/page.tsx`
  - Delegates to `ToolDetailPageShell` with `expectedType="software"`

There is no direct `src/app/software/[slug]` route outside the route group. The public route exists through the `(zh-public)` route group, which does not add a URL segment.

## How Product Detail Slugs Resolve

`ToolDetailPageShell` calls `resolvePublicToolSlug(slug)` before loading a tool. `resolvePublicToolSlug` builds a public slug index from published tools and matches either:

- the raw database `Tool.slug`
- the computed canonical slug from `getCanonicalToolSlug`

After loading the tool, the page compares the requested slug with `getCanonicalToolSlug(tool)`. If the slug is not canonical, or the route type does not match `expectedType`, the page issues a permanent redirect to `buildCanonicalToolPath(tool, locale)`.

This means a raw DB slug can be a valid entry point in the matching environment, but it is not necessarily the canonical URL EBOS should use as public evidence.

## Sitemap Product URL Source

`src/app/sitemap.ts` generates product URLs from published `Tool` records:

- It reads `prisma.tool.findMany({ where: { status: "published" } })`.
- For every published tool, it builds the Chinese canonical path with `buildCanonicalToolPath(tool, "zh")`.
- If `shouldIndexEnglishToolPage(tool)` returns true, it also emits `buildCanonicalToolPath(tool, "en")`.
- `buildCanonicalToolPath` uses:
  - `getCanonicalToolBasePath(tool)`, which maps software tools to `/software`
  - `getCanonicalToolSlug(tool)`, which uses explicit canonical overrides or `buildSeoFriendlySlug`

Therefore sitemap product URLs are canonical public URLs for the currently checked site. For EBOS smoke checks, sitemap URLs have higher evidentiary value than local database slugs.

## Internal Database Slug vs Online URL

The internal database stores `Tool.slug`, but the public URL can differ because:

- `getCanonicalToolSlug` may transform the raw slug using name and English name.
- Explicit canonical overrides exist in `src/lib/public-slugs.ts`.
- English pages only exist when `shouldIndexEnglishToolPage` allows indexing.
- A local development database can contain tools that are not present on production.
- A production sitemap can lag or differ from a local DB snapshot if deploy/cache/data are out of sync.

Because of this, EBOS must not blindly combine local DB slugs with a production `siteUrl` and treat a 404 as a live revenue-path failure.

## EBOS Recommended URL Source Priority

1. Checked site's `sitemap.xml`
   - Parse `/software/{slug}` and `/en/software/{slug}` product detail URLs from the sitemap response.
   - Treat sitemap-sourced 404 as a high-priority live public-site risk.
2. Internal database published products from the same environment being checked
   - Use only when sitemap contains no product detail URL.
   - Mark `environmentMismatchRisk=true` when `siteUrl` is production-like but `DATABASE_URL` is missing or points to local/dev.
   - Treat 404 under environment mismatch as a data-source/environment risk, not a confirmed live product-page failure.
3. Manual fallback
   - `/software` may be checked as a fallback listing page.
   - It must be labeled as `software listing page`, not as a product detail page.
4. None
   - If no URL can be resolved, EBOS should produce a warning and avoid product-page conclusions.

## Possible Causes of the Current Product 404s

- EBOS checked production `siteUrl` while reading product slugs from a local database.
- The local DB contained raw or unpublished products not represented in the production sitemap.
- The production sitemap did not include those products because they are not published, not indexable, or not deployed.
- The canonical public slug differs from the raw `Tool.slug`.
- The product detail route is functioning, but the checked URL came from the wrong environment or non-canonical source.

## How to Fix a Real Product Detail 404

If a sitemap-sourced product detail URL returns 404, treat it as a real online risk and verify:

1. The tool exists in the production database.
2. `Tool.status` is `published`.
3. `Tool.type` is `software` for `/software/[slug]`.
4. `getCanonicalToolSlug(tool)` matches the sitemap URL slug.
5. `resolvePublicToolSlug(slug)` can match the sitemap slug.
6. `ToolDetailPageShell` does not redirect to a different type route.
7. Sitemap generation and route cache are refreshed after product changes.
8. The product page returns 2xx or an intentional 3xx from the production domain.

## EBOS Step 3.6 Implementation Notes

- New EBOS URL source logic lives in `src/lib/ebos/health/product-page-url-source.ts`.
- Smoke checks now prefer sitemap product detail URLs before database slugs.
- Smoke check results include `source`, `sourceConfidence`, `environmentMismatchRisk`, `reason`, and `isProductDetailPage`.
- Website health scoring distinguishes sitemap-sourced product 404s from database/environment mismatch 404s.
- Weekly report planning now separates real online product-page failures from URL source/environment mismatch risks.
