# AI News Translation and Account Services Routing Design

Date: 2026-06-18

## Goal

Complete two tightly related improvements without destabilizing the existing ENHE AI site:

1. Add a backend `one-click generate English content` action for AI news articles so admins can generate English title, summary, body, takeaways, impact notes, conclusion, and SEO fields from the Chinese source in one step.
2. Migrate the public-facing account service routes from `/online-tools` to `/account-services` and `/en/account-services`, while keeping the existing backend data model and admin management flow unchanged.

The implementation must preserve existing site functionality and reduce migration risk by changing the public access layer only.

## Current Project Context

- Project path: `C:\Users\HU\Documents\New project 2`
- Framework: Next.js App Router, React 19, TypeScript, Prisma, PostgreSQL
- Existing AI news admin editor:
  - `src/app/admin/ai-news/[id]/page.tsx`
  - `src/app/admin/ai-news-editor.tsx`
  - `src/app/admin/actions.ts`
- Existing AI news data model already includes English fields:
  - `englishTitle`
  - `englishSubtitle`
  - `englishSummary`
  - `englishContent`
  - `englishKeyTakeaways`
  - `englishImpactNotes`
  - `englishConclusion`
  - `englishSeoTitle`
  - `englishSeoDescription`
  - `englishKeywords`
- Existing public account service routes still use:
  - `/online-tools`
  - `/en/online-tools`
- Existing public tool detail routes are unified under:
  - `/tools/[slug]`
  - `/en/tools/[slug]`
- Existing SEO infrastructure already includes:
  - canonical and hreflang helpers in `src/lib/seo.ts`
  - sitemap generation in `src/app/sitemap.ts`
  - route-aware path helpers in `src/lib/public-slugs.ts`

This means the translation feature can reuse the current article schema, and the route migration can stay in the public routing and SEO layer.

## User-Confirmed Constraints

### AI News Translation

- Use an existing LLM API instead of hand-written rule translation.
- Add a backend button for one-click English generation.
- Generate English in one request for:
  - title
  - subtitle
  - summary
  - content
  - takeaways
  - impact notes
  - conclusion
  - SEO title
  - SEO description
  - keywords
- Default behavior is `full overwrite` of English fields, not fill-only-missing.

### Account Service Route Migration

- Add these new public routes:
  - `/account-services`
  - `/account-services/[slug]`
  - `/en/account-services`
  - `/en/account-services/[slug]`
- Old routes must issue `301 permanent redirect`:
  - `/online-tools` -> `/account-services`
  - `/online-tools/[slug]` -> `/account-services/[slug]`
  - `/en/online-tools` -> `/en/account-services`
  - `/en/online-tools/[slug]` -> `/en/account-services/[slug]`
- Do not redesign backend management, enums, or database structure for account services.
- Update canonical, Open Graph URL, Twitter URL, breadcrumb, internal links, sitemap, and hreflang to the new public paths.
- Sitemap must only include the new public route family, not `/online-tools`.
- Robots must not block either old or new route family.
- Hard-coded `/online-tools` public links must be replaced.

## Recommended Architecture

### Part A: AI News Translation

Use a server action backed by a small translation service module.

Flow:

1. Admin opens `/admin/ai-news/[id]`.
2. Admin clicks `Generate English Content`.
3. The client submits the current Chinese article fields to a server action.
4. The server action validates required Chinese source content.
5. The server action calls the configured LLM API through a shared translation helper.
6. The LLM returns structured English content.
7. The UI re-renders with the English fields fully replaced in the form.
8. Admin reviews and clicks the existing save action to persist the article.

This keeps translation generation and article persistence as two explicit steps:

- `Generate English Content` updates the editor draft state.
- `Save Article` persists to Prisma.

This is safer than saving immediately after translation because admins retain editorial control.

### Part B: Account Service Route Migration

Keep the existing public content queries and tool type logic intact, but introduce a new public route namespace for account services.

Flow:

1. Public listing and detail entry points move to `/account-services` and `/en/account-services`.
2. Existing `/online-tools` public pages become permanent redirects only.
3. Route-building and SEO helpers point to the new namespace.
4. Internal navigation, homepage CTAs, breadcrumbs, canonical URLs, and sitemap all emit the new namespace.

This separates the URL migration from the data model, which matches the user's request to minimize risk.

## Translation Feature Design

## Admin UX

Add a secondary action near the `English Content` section in `NewsArticleEditor`.

Recommended behavior:

- Button label:
  - `Generate English Content`
- Button scope:
  - acts on the whole article, not a single field
- Visual feedback:
  - pending state while generating
  - success state after fields are filled
  - inline error message if generation fails

The button should be available for both new and existing articles, as long as the required Chinese fields are present in the editor.

## Source Fields Sent to the Model

Send the current Chinese draft values from the editor:

- `title`
- `subtitle`
- `summary`
- `content`
- `keyTakeaways`
- `impactNotes`
- `conclusion`
- `seoTitle`
- `seoDescription`
- `keywords`

The prompt should instruct the model to:

- preserve factual meaning
- keep a professional editorial tone
- write concise, indexable English
- return structured JSON only
- keep Markdown heading structure in `content`
- generate keywords suitable for English SEO, not direct comma-by-comma literal transliteration

## Output Fields

The server action must map the LLM response to:

- `englishTitle`
- `englishSubtitle`
- `englishSummary`
- `englishContent`
- `englishKeyTakeaways`
- `englishImpactNotes`
- `englishConclusion`
- `englishSeoTitle`
- `englishSeoDescription`
- `englishKeywords`

All these fields are replaced together on success.

## API Configuration

Use environment-driven configuration so the site can work with an existing model provider without rewriting business logic.

Recommended env variables:

- `OPENAI_API_KEY`
- `OPENAI_BASE_URL`
- `OPENAI_MODEL`

The translation helper should be provider-compatible rather than provider-hardcoded. If the deployment uses an OpenAI-compatible endpoint, only env changes should be needed.

## Failure Handling

If the model call fails, times out, is misconfigured, or returns invalid JSON:

- do not modify the current form values
- show a clear inline error
- do not save partial generated fields

Recommended error categories:

- missing API configuration
- Chinese source fields incomplete
- upstream translation request failed
- invalid model response format

## Data Persistence Boundary

The translation action should not write directly to Prisma.

Reasons:

- admins should review generated English before save
- avoids accidental overwrite of production content
- aligns with the existing editor-centered workflow

Persistence remains the responsibility of the existing `upsertNewsArticleAction`.

## Route Migration Design

## New Public Routes

Create these new public entry points:

- `src/app/account-services/page.tsx`
- `src/app/account-services/[slug]/page.tsx`
- `src/app/en/account-services/page.tsx`
- `src/app/en/account-services/[slug]/page.tsx`

They should reuse the current public content logic for `online` tools rather than introducing a new tool type.

## Old Route Redirects

Convert the old public route family into permanent redirects:

- `src/app/online-tools/page.tsx` -> redirect to `/account-services`
- `src/app/online-tools/[slug]/page.tsx` -> redirect to `/account-services/[slug]`
- `src/app/en/online-tools/page.tsx` -> redirect to `/en/account-services`
- `src/app/en/online-tools/[slug]/page.tsx` -> redirect to `/en/account-services/[slug]`

The redirect status must be permanent so search engines transfer signals to the new URLs.

## Route Helper Updates

Introduce a dedicated public path helper for account service listing URLs and tool detail pages where tool type is `online`.

Expected outcomes:

- homepage buttons point to `/account-services`
- header nav points to `/account-services`
- breadcrumb for account service pages uses the new listing path
- any internal recommendation or related link that previously used `/online-tools` now uses `/account-services`

## Tool Detail Path Strategy

The project already uses unified detail routes at `/tools/[slug]` and `/en/tools/[slug]`.

Because the user explicitly requested `/account-services/[slug]` and `/en/account-services/[slug]`, the public account service detail pages should exist as dedicated aliases and become the canonical public detail URL for `online` tools.

The detail implementation should still reuse the current tool detail rendering and data lookup logic.

## SEO and Metadata Design

## Canonical and Alternates

Any page in the migrated account service namespace must emit:

- canonical to `/account-services/...` or `/en/account-services/...`
- hreflang alternates between Chinese and English in the new namespace

No public page should continue to self-canonicalize to `/online-tools`.

## Open Graph and Twitter

The metadata builders must emit:

- `openGraph.url` using the new route
- `twitter` metadata derived from the same canonical path

## Breadcrumb

Breadcrumb items for account service listing and detail pages must use:

- `Account Services` / `AI Account Services` equivalent label
- `/account-services`
- `/en/account-services`

No breadcrumb item should link back to `/online-tools`.

## Sitemap

Sitemap must:

- include `/account-services`
- include `/en/account-services`
- include `/account-services/[slug]`
- include `/en/account-services/[slug]`
- exclude `/online-tools`
- exclude `/en/online-tools`

Old routes remain crawlable only through redirects, not by direct inclusion in sitemap.

## Robots

Robots must continue to allow public crawling for both route families.

No new disallow rule should be added for:

- `/account-services`
- `/en/account-services`
- `/online-tools`
- `/en/online-tools`

## Hard-Coded Link Cleanup

Search and replace all public-facing hard-coded `/online-tools` references in:

- site header
- homepage CTA buttons
- language switcher logic
- localized public path matchers
- metadata and route helpers
- sitemap route lists
- cache header definitions
- source-based tests that assert old routing

Admin routes like `/admin/online-tools` stay unchanged for now.

## File-Level Design Impact

### Expected Translation Feature Touchpoints

- `src/app/admin/ai-news-editor.tsx`
  - add the generate button and UI feedback
- `src/app/admin/actions.ts`
  - add a translation server action
- new translation helper module, likely under `src/lib/`
  - LLM request construction
  - response validation
  - error normalization
- tests for translation behavior

### Expected Routing and SEO Touchpoints

- `src/app/account-services/...`
- `src/app/en/account-services/...`
- `src/app/online-tools/...`
- `src/app/en/online-tools/...`
- `src/app/page-shell.tsx`
- `src/components/site-header.tsx`
- `src/lib/seo.ts`
- `src/lib/public-slugs.ts`
- `src/app/sitemap.ts`
- `src/app/robots.ts`
- `next.config.ts`
- `middleware.ts`
- route-related tests and source assertions

## Testing Strategy

## Translation

Add tests for:

- required Chinese fields validation
- successful structured translation parsing
- overwrite behavior for existing English fields
- invalid JSON response handling
- missing API config handling
- no persistence side effect before explicit save

## Routing and SEO

Add tests for:

- `/online-tools` permanent redirect behavior
- `/online-tools/[slug]` permanent redirect behavior
- English route redirect equivalents
- sitemap contains only `/account-services` route family
- canonical and hreflang use the new route family
- no remaining public hard-coded `/online-tools` links in key source files

## Manual Verification

Verify in browser:

- AI news admin editor shows the translate button
- generated English fields appear correctly after one click
- save still works through the normal editor flow
- `/account-services` listing loads
- `/account-services/[slug]` detail loads
- `/en/account-services` listing loads
- `/en/account-services/[slug]` detail loads
- old routes permanently redirect to the new ones
- homepage and header entry points use the new namespace

## Risks and Mitigations

### Risk: Translation response format instability

Mitigation:

- require strict JSON output
- validate the parsed response with a schema
- fail closed and keep existing editor values untouched

### Risk: URL migration leaves inconsistent internal links

Mitigation:

- centralize route generation in helpers
- search hard-coded `/online-tools` references
- add source-level regression tests

### Risk: Public migration affects backend management paths

Mitigation:

- do not change `/admin/online-tools`
- do not change `ToolType.online`
- do not change Prisma schema for account service routing

## Acceptance Criteria

### Translation

- Admin AI news editor has a one-click English generation button
- Button generates English title, summary, content, takeaways, impact notes, conclusion, and SEO fields in one step
- Generated English fields fully overwrite current English fields
- Translation failures do not partially modify saved content
- Existing article save flow remains unchanged

### Routing and SEO

- New public routes exist:
  - `/account-services`
  - `/account-services/[slug]`
  - `/en/account-services`
  - `/en/account-services/[slug]`
- Old public routes issue permanent redirects
- Public canonical, Open Graph URL, Twitter URL, breadcrumb, sitemap, and hreflang use the new namespace
- Sitemap no longer lists `/online-tools`
- Robots do not block old or new route families
- No remaining public-facing `/online-tools` internal links remain in the main navigation and homepage flow

## Spec Self-Review

- Placeholder scan: no unresolved TODO or TBD remains.
- Internal consistency: translation uses the existing article English fields and save flow; route migration changes the public access layer only.
- Scope check: both features are tightly related to current public SEO and multilingual content quality and can be implemented in one plan.
- Ambiguity check: overwrite behavior, routing boundaries, redirect semantics, and sitemap expectations are explicit.
