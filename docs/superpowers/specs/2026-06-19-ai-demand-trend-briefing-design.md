# AI Demand Trend Briefing Design

Date: 2026-06-19

## Decision

Add an `AI demand trend` content module to ENHE AI Tools using the conservative SEO model selected by the user:

- A public, indexable evergreen topic page for long-term search value.
- Daily briefing archives that are shareable but `noindex, follow`.
- Public users see only a useful summary of each daily briefing.
- Any logged-in user can read the full daily HTML report.
- Weekly or monthly edited highlights can later be promoted into normal `/ai-news/[slug]` articles for indexing.

This keeps daily automated reports useful for users without flooding the public AI news index or sitemap with repetitive generated pages.

## Current Project Context

- Framework: Next.js 15 App Router with React 19.
- Data: Prisma and PostgreSQL.
- Auth: `getCurrentUser()` / `requireUser()` in `src/lib/auth.ts`.
- Existing public content system:
  - `/ai-news`
  - `/ai-news/[slug]`
  - `/en/ai-news`
  - dynamic sitemap in `src/app/sitemap.ts`
  - robots rules in `src/app/robots.ts`
  - SEO helpers in `src/lib/seo.ts`
- Existing AI news articles with `NewsArticle(status=published)` are public, listable, and included in sitemap.
- Existing news pages already support metadata, canonical URLs, language alternates, JSON-LD, and an English noindex guard when English content is incomplete.

Because ordinary published `NewsArticle` records are intended to be indexable editorial content, daily automated briefings should not be stored as normal published news articles.

## Goals

- Let users read and share the AI demand trend morning briefing on the website.
- Preserve SEO quality by keeping automated daily archives out of Google indexing.
- Create one durable, indexable topic page around "人类最渴望用 AI 解决哪些问题".
- Reuse existing auth, public chrome, SEO utilities, and admin/automation patterns.
- Avoid changes to orders, payments, downloads, core tool pages, and the existing AI news publishing flow.

## Non-Goals

- Do not make every daily briefing an indexable article.
- Do not put daily briefing pages into sitemap.
- Do not block daily briefing pages with `robots.txt`.
- Do not create a new marketing landing page that competes with the homepage.
- Do not require paid membership for the full report in version 1.
- Do not change checkout, VIP purchase, software download, or payment-proof flows.

## Information Architecture

### Indexable Evergreen Page

Route:

- `/ai-trends`

Purpose:

- Search-facing and shareable topic page.
- Explains the long-term thesis: "人类最渴望用 AI 解决哪些问题".
- Summarizes stable demand categories, opportunity priorities, and ENHE's interpretation.
- Links to recent daily briefing summaries, edited `/ai-news` highlights, tools, tutorials, and account services.

SEO:

- `index, follow`.
- Included in sitemap.
- Uses canonical URL pointing to itself.
- Uses `CollectionPage` or `Article` JSON-LD plus `BreadcrumbList`.
- Updated manually or through curated weekly/monthly merges, not rewritten wholesale every day.

### Daily Archive List

Route:

- `/ai-trends/daily`

Purpose:

- List of daily AI demand trend briefings.
- Public users can browse summaries.
- Logged-in users can open full reports.

SEO:

- `noindex, follow`.
- Excluded from sitemap.
- Not disallowed in `robots.txt`, so crawlers can see the noindex directive.

Public view:

- Date.
- Title.
- One-sentence core conclusion.
- Top 3-5 demand highlights.
- Source count and signal-type summary.
- Login CTA.

Logged-in view:

- Same list plus clear entry points to full reports.
- Future enhancement: favorites, read state, email subscription status.

### Daily Briefing Detail

Route:

- `/ai-trends/daily/[date]`, where date is `YYYY-MM-DD`.

Purpose:

- Shareable daily briefing detail page.
- Public visitors see enough value to understand the report.
- Logged-in users see the full HTML report.

SEO:

- `noindex, follow` for both public and logged-in versions.
- Excluded from sitemap.
- Canonical points to the same daily detail URL, not to `/ai-trends`.
- The page is not blocked by `robots.txt`.

Public view:

- H1, date, summary, core conclusion.
- Public highlights.
- Source signal overview.
- Login/register CTA to view the complete report.
- Links back to `/ai-trends`, selected `/ai-news` highlights, and relevant tools.

Logged-in view:

- Full visual HTML report.
- Source links.
- Copy link/share controls.
- Back to archive.
- Future enhancement: save to personal trend library.

### Edited Highlights

Route:

- Existing `/ai-news/[slug]`.

Purpose:

- Weekly/monthly curated article based on daily briefings.
- This is the only derivative of daily reports that should become indexable in the existing AI news system.

Rules:

- Must be edited, deduplicated, and strengthened with human-quality analysis before `index`.
- Should not simply concatenate daily reports.
- Should include source links and distinct editorial value.

## Data Model

Add a new model instead of extending `NewsArticle` for daily archives.

Proposed Prisma model:

```prisma
enum AiTrendBriefingStatus {
  draft
  published
  archived
}

model AiTrendBriefing {
  id                 String                 @id @default(cuid())
  date               DateTime               @unique
  slug               String                 @unique
  title              String
  summary            String
  coreConclusion     String                 @map("core_conclusion")
  publicHighlights   String[]               @default([]) @map("public_highlights")
  fullHtml           String                 @map("full_html")
  sourceSignals      Json?                  @map("source_signals")
  status             AiTrendBriefingStatus  @default(draft)
  publishedAt        DateTime?              @map("published_at")
  isIncludedInTopicPage Boolean             @default(false) @map("is_included_in_topic_page")
  createdAt          DateTime               @default(now()) @map("created_at")
  updatedAt          DateTime               @updatedAt @map("updated_at")

  @@index([status, publishedAt])
  @@index([isIncludedInTopicPage, publishedAt])
  @@map("ai_trend_briefings")
}
```

Notes:

- Version 1 does not need paid membership fields because the selected access rule is "logged-in users can see full reports".
- `sourceSignals` stores structured source metadata: title, URL, source type, observed signal, date, and credibility notes.
- If the HTML report grows beyond comfortable database size later, `fullHtml` can move to object storage while this model stores a URL and checksum.

## Publishing And Automation Flow

The existing morning automation should be extended with a website publishing step:

1. Gather latest public trend signals.
2. Generate the complete visual HTML report.
3. Generate a compact public summary:
   - title
   - date
   - core conclusion
   - public highlights
   - source signal list
4. Validate the report:
   - full HTML exists
   - summary exists
   - at least one credible source link exists
   - no script tags or inline event handlers
   - date slug is valid
5. Publish or upsert `AiTrendBriefing`.
6. Send the email as today.
7. Reply in the current thread with send/publish status.

Add a script for automation:

- `scripts/publish-ai-trend-briefing-html.ts`

Suggested options:

```bash
npx tsx scripts/publish-ai-trend-briefing-html.ts \
  --file /tmp/ai-demand-trends-YYYY-MM-DD.html \
  --summary-file /tmp/ai-demand-trends-YYYY-MM-DD.summary.json \
  --mode published
```

The script should use application validation helpers, not duplicate parsing logic.

## Page Experience

### `/ai-trends`

Layout:

- Compact hero with the literal topic name.
- One-sentence thesis.
- Long-term demand heat ranking.
- Opportunity priority map.
- Recent daily briefing summaries.
- Edited highlights from `/ai-news`.
- Related ENHE tools/tutorials/account services as "next actions".

Tone:

- Research and product insight, not a sales page.
- Clear, practical, and source-aware.
- Quiet conversion language: "登录查看完整晨报", "查看相关工具", "订阅晨报".

### `/ai-trends/daily`

Layout:

- Archive heading and search/filter by date or keyword.
- Briefing cards with date, conclusion, public highlights, and source count.
- Login-aware action:
  - public: "登录查看完整报告"
  - logged in: "阅读完整报告"

### `/ai-trends/daily/[date]`

Public detail:

- Summary-first.
- Shows enough value without exposing full HTML.
- Login CTA appears after the summary, not as an intrusive modal.

Logged-in detail:

- Full HTML report rendered in a constrained report container.
- No arbitrary scripts.
- Report CSS should be scoped or sanitized so it cannot break global site UI.
- Links to external sources open safely with `rel="nofollow noopener noreferrer"` unless a trusted allowlist is introduced later.

## SEO Rules

### Indexable

- `/ai-trends`
- Edited weekly/monthly highlight articles under existing `/ai-news/[slug]`

### Noindex

- `/ai-trends/daily`
- `/ai-trends/daily/[date]`

Implementation:

- Use Next metadata `robots: { index: false, follow: true }` on daily archive routes.
- Do not add daily routes to `robots.ts` disallow rules.
- Do not add daily routes to `sitemap.ts`.

Google Search Central references:

- `noindex` must be visible to crawlers, so the page must not be blocked by `robots.txt`: https://developers.google.com/search/docs/crawling-indexing/block-indexing
- Robots meta tags can express page-level indexing rules: https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag
- Sitemaps should list URLs intended for crawling/indexing priority: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- AI-generated content should meet helpful, reliable, people-first quality expectations: https://developers.google.com/search/docs/fundamentals/using-gen-ai-content

## Access Rules

Version 1:

- Public users can view summaries.
- Logged-in users can view full daily HTML reports.
- Admin users can manage or republish reports.
- Paid membership is not required.

Future member-only enhancements:

- Personal trend library.
- Favorite/save report.
- Export HTML/PDF.
- Custom categories or industry filters.
- Extra analysis layers such as opportunity scoring and startup idea backlog.

## Safety And Rendering

Full report HTML must be treated as generated content and constrained:

- Reject `<script>` tags.
- Reject inline event handlers.
- Prefer a safe subset of HTML tags.
- Scope report styles to the report container.
- Prevent report CSS from affecting header, footer, auth controls, or product cards.
- Keep raw HTML out of indexable topic page unless curated.

If the existing AI news HTML import sanitizer can be reused, use its approach as a reference but keep this briefing importer separate because its access and SEO rules differ.

## Files And Boundaries

### Likely New Files

- `src/app/ai-trends/page.tsx`
- `src/app/ai-trends/daily/page.tsx`
- `src/app/ai-trends/daily/[date]/page.tsx`
- `src/lib/ai-trends.ts`
- `src/lib/ai-trends.test.ts`
- `scripts/publish-ai-trend-briefing-html.ts`

### Likely Existing Files To Update

- `prisma/schema.prisma`
- `src/app/sitemap.ts`
- `src/lib/seo.ts`
- `src/lib/public-routes.ts` if localized route recognition or cache tags need extension.
- Navigation dictionary/header only if a light entry is desired.

### Files To Avoid Touching

- Payment and order flows.
- Download entitlement logic.
- Existing `/ai-news` listing/detail behavior except optional links to `/ai-trends`.
- Existing automation for ordinary AI news imports unless a separate shared validation helper is extracted.

## Testing Strategy

Unit/source-contract tests:

- `AiTrendBriefing` route paths are recognized.
- `/ai-trends` is included in sitemap.
- `/ai-trends/daily` is not included in sitemap.
- `/ai-trends/daily/[date]` is not included in sitemap.
- Daily metadata includes `noindex, follow`.
- Topic page metadata is indexable.
- Public daily detail does not expose `fullHtml`.
- Logged-in daily detail exposes `fullHtml`.
- Invalid dates return 404.
- Draft/archived briefings are not public.
- Published briefing without sources cannot be imported.
- Generated report sanitizer rejects scripts and event handlers.

Browser smoke checks:

- `/ai-trends` desktop and mobile.
- `/ai-trends/daily` public and logged-in.
- `/ai-trends/daily/[date]` public and logged-in.
- Login CTA routes correctly.
- Existing `/ai-news`, `/tools/[slug]`, account services, checkout, and user center still load.

Verification commands:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

## Rollout Plan

1. Add model, migration, and query helpers.
2. Add read-only public routes with seeded or manually inserted sample data.
3. Add import script and validation.
4. Update the morning automation prompt to generate both HTML and summary JSON, then call the import script.
5. Add `/ai-trends` to sitemap and keep daily routes out.
6. Add noindex metadata tests.
7. Run verification.
8. Deploy.
9. Monitor Search Console for:
   - `/ai-trends` indexing.
   - no daily pages appearing as indexed.
   - crawl errors.
   - traffic changes to existing AI news/tool pages.

## Acceptance Criteria

- `/ai-trends` is public, indexable, and included in sitemap.
- `/ai-trends/daily` is public, noindex, and excluded from sitemap.
- `/ai-trends/daily/[date]` is public, noindex, and excluded from sitemap.
- Public users see only daily summaries.
- Logged-in users see complete daily reports.
- The morning automation can publish a daily briefing record.
- A missing or source-less report stays draft or fails validation.
- Existing AI news pages remain unchanged except optional links.
- Existing payment, order, download, and user center flows are not modified.
- Tests cover sitemap, robots metadata, access gating, and sanitizer behavior.

## Spec Self-Review

- Placeholder scan: no placeholder sections remain.
- Internal consistency: all daily pages are shareable but noindex; only the evergreen topic page and curated `/ai-news` highlights are indexable.
- Scope check: the first implementation is a focused content module and does not include paid-member features.
- Ambiguity check: access is explicitly "logged-in users can see full reports"; paid membership is deferred.
