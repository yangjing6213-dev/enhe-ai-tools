# ENHE AI News And Trend Insights Design

Date: 2026-06-18

## Design Read

This is a professional content growth module for ENHE AI Tools / 恩禾 ENHE AI工具站. It is not a plain news list. The page should help visitors understand AI news, read a practical trend interpretation, and continue naturally into on-site tools, tutorials, courses, and related content.

The visual direction should match the current site: dark night mode, glassmorphism cards, restrained spacing, soft gradient light, modern technology feel, and low-pressure conversion language.

## Current Project Context

- Framework: Next.js 15 App Router with React 19.
- Styling: Tailwind CSS v4 plus project global classes such as `glass`, `site-header-transparent`, `admin-shell-card`, and shared UI components in `src/components/ui.tsx`.
- Public chrome: `PublicSiteChrome`, `SiteHeader`, and `SiteFooter`.
- Localization: `src/lib/dictionaries.ts`, `buildLocalePath`, `/en` route prefix, canonical and hreflang helpers in `src/lib/seo.ts`.
- Data layer: Prisma with PostgreSQL.
- Admin pattern: server-rendered pages under `src/app/admin`, shared admin controls in `src/app/admin/admin-ui.tsx`, and Server Actions in `src/app/admin/actions.ts`.
- Existing content models: `Tool`, `ToolCategory`, `ToolTag`, `Tutorial`, `ToolFaq`, `ToolChangelog`, and related purchase and user models.
- Public caching: `publicPageCacheSeconds`, `unstable_cache`, route-level `revalidate = 300`, dynamic sitemap backed by Prisma.

## Scope

### In Scope

- Chinese and English public AI news list pages:
  - `/ai-news`
  - `/en/ai-news`
- Chinese and English public AI news detail pages:
  - `/ai-news/[slug]`
  - `/en/ai-news/[slug]`
- Admin news management:
  - `/admin/ai-news`
  - `/admin/ai-news/[id]`
- Prisma models for AI news articles, categories, tags, external sources, favorites, and likes.
- Public search, category filter, tag filter, pagination, featured articles, trend ranking, topic collection links, and subscription prompt.
- Article detail layout with summary, key takeaways, table of contents, markdown-like content rendering, sources, related tools, related tutorials, related articles, and basic interactions.
- SEO metadata, canonical URLs, hreflang, sitemap entries, and JSON-LD.
- Safe admin-only write access and published-only public visibility.

### Out Of Scope For This First Version

- Full WYSIWYG rich text editor.
- Realtime comment discussion for news.
- Recommendation algorithm beyond explicit related IDs plus category/tag fallback.
- Email delivery automation for subscriptions.
- Complex analytics dashboards for news.

These can be added later without changing the route or model foundation.

## Information Architecture

### Public Navigation

Add a new primary navigation item:

- Chinese: `AI资讯`
- English: `AI News`

The item should link to `buildLocalePath("/ai-news", locale)`.

### Public Routes

Use shared page shells to avoid duplicating Chinese and English implementations:

- `src/app/ai-news/page-shell.tsx`
- `src/app/ai-news/[slug]/page-shell.tsx`
- `src/app/(zh-public)/ai-news/page.tsx`
- `src/app/(zh-public)/ai-news/[slug]/page.tsx`
- `src/app/en/ai-news/page.tsx`
- `src/app/en/ai-news/[slug]/page.tsx`

Root `/ai-news` stays Chinese. `/en/ai-news` is the English counterpart.

### Admin Routes

- `src/app/admin/ai-news/page.tsx`: list, filters, actions.
- `src/app/admin/ai-news/[id]/page.tsx`: create and edit article.

The admin navigation adds `aiNews`.

## Data Model

### Enums

Add `NewsStatus`:

- `draft`
- `published`
- `archived`

### NewsCategory

Fields:

- `id`
- `name`
- `slug`
- `description`
- `status`
- `sortOrder`
- `createdAt`
- `updatedAt`
- relation: `articles`

This is separate from `ToolCategory` because news categories describe editorial themes, not tool product types.

### NewsTag

Fields:

- `id`
- `name`
- `slug`
- `description`
- `status`
- `sortOrder`
- `createdAt`
- `updatedAt`
- relation: `articleLinks`

This is separate from `ToolTag` to keep editorial taxonomy independent from product taxonomy.

### NewsArticle

Core fields:

- `id`
- `title`
- `slug`
- `subtitle`
- `description`
- `keywords`
- `summary`
- `content`
- `coverImage`
- `videoUrl`
- `videoTitle`
- `videoDescription`
- `author`
- `status`
- `publishedAt`
- `readingTime`
- `viewCount`
- `likeCount`
- `favoriteCount`
- `isFeatured`
- `isPinned`
- `sortOrder`
- `seoTitle`
- `seoDescription`
- `seoKeywords`
- `canonicalUrl`
- `keyTakeaways`
- `impactNotes`
- `conclusion`
- `relatedArticleIds`
- `relatedToolIds`
- `relatedTutorialIds`
- `createdAt`
- `updatedAt`

Localization fields:

- `englishTitle`
- `englishSubtitle`
- `englishDescription`
- `englishSummary`
- `englishContent`
- `englishKeywords`
- `englishSeoTitle`
- `englishSeoDescription`
- `englishSeoKeywords`
- `englishKeyTakeaways`
- `englishImpactNotes`
- `englishConclusion`

The English public detail page should only index articles with enough English content. If English content is missing, the English page should show a helpful fallback or noindex behavior instead of exposing mixed Chinese content as an indexable English page.

### NewsArticleTag

Join table:

- `id`
- `articleId`
- `tagId`
- unique `articleId + tagId`

### NewsExternalSource

Fields:

- `id`
- `articleId`
- `title`
- `url`
- `sourceType`
- `description`
- `sortOrder`
- `createdAt`
- `updatedAt`

Allowed source types:

- `official_announcement`
- `model_website`
- `open_source_project`
- `github_repository`
- `paper`
- `authority_media`

External links open in a new tab and use `rel="nofollow noopener noreferrer"` unless a later trusted-source allowlist is added.

### NewsArticleFavorite

Fields:

- `id`
- `articleId`
- `userId`
- `createdAt`
- unique `articleId + userId`

Requires login.

### NewsArticleLike

Fields:

- `id`
- `articleId`
- `userId`
- `createdAt`
- unique `articleId + userId`

Requires login for the persistent version. A non-login fallback can prompt the user to log in.

## Public List Page Design

### Hero

Chinese:

- H1: `AI资讯与趋势洞察`
- Subtitle: `关注 AI 工具、模型更新、行业趋势与实用教程，帮助你更快理解变化，把新技术变成真实生产力。`
- Support line: `不只看见趋势，更要学会使用趋势。`

English:

- H1: `AI News And Trend Insights`
- Subtitle: `Track AI tools, model updates, industry trends, and practical tutorials so you can turn new technology into real productivity.`
- Support line: `Do not just watch the trend. Learn how to use it.`

The hero should be compact, premium, and content-led. It should not look like a sales page.

### Search And Filters

Support query params:

- `q`
- `category`
- `tag`
- `page`
- `sort`

Search fields:

- title
- subtitle
- summary
- description
- keywords
- tags

Sorting:

- latest
- hot
- featured

### Page Sections

1. Featured articles: 1 to 3 highlighted cards from pinned or featured published articles.
2. Latest articles: paginated card grid.
3. Hot trend ranking: high `viewCount`, pinned, or high `sortOrder`.
4. Popular keywords: OpenAI, Claude, Gemini, DeepSeek, 通义千问, Kimi, AI视频, AI绘图, AI办公, AI变现, ComfyUI, 本地部署.
5. Topic collections: AI video generation, AI office productivity, AI monetization starter, local deployment tools.
6. Subscription prompt: soft newsletter copy without purchase pressure.

### Empty State

If no articles match, show a glass card with a calm message and links back to all AI news or tool pages.

## Public Detail Page Design

### Structure

1. Breadcrumbs.
2. H1 article title.
3. Subtitle or core point.
4. Metadata row: category, author, published date, updated date, reading time, views, tags.
5. Cover image.
6. Summary card.
7. Key takeaway cards.
8. Table of contents from H2 and H3 headings.
9. Main content.
10. Impact section: `这对普通用户意味着什么？`
11. Related tools.
12. Related tutorials.
13. Related news.
14. Conclusion card.
15. External sources.
16. Interaction row: like, favorite, share, copy link, back to top.

### Content Logic

Each article should follow this editorial sequence:

1. 发生了什么？
2. 为什么重要？
3. 对普通用户有什么用？
4. 可以怎么用起来？
5. 有哪些相关工具或教程？
6. 总结：下一步该如何行动？

### Content Rendering

Use a constrained internal renderer instead of unsafe raw HTML.

Version 1 supports:

- H2 lines starting with `## `
- H3 lines starting with `### `
- paragraphs
- unordered list items starting with `- `
- ordered list items starting with `1. `
- blockquotes starting with `> `
- fenced code blocks
- simple links in `[text](url)` form

Escape all plain text and never use raw user-provided HTML. This keeps the first version safe without adding a large markdown dependency.

## Admin Experience

### Admin List

The admin list supports:

- search by title or slug
- status filter
- category filter
- tag filter
- sort by publish date, view count, or sort order
- create button
- edit action
- preview link
- quick status badges for draft, published, archived

### Admin Editor

The editor uses existing admin form styles.

Sections:

1. Basic information: title, slug, subtitle, category, tags, author, status.
2. Content: summary, key takeaways, impact notes, content, conclusion.
3. Media: cover image URL or upload, video fields.
4. SEO: seoTitle, seoDescription, seoKeywords, canonicalUrl.
5. Relations: related article IDs, related tool IDs, related tutorial IDs.
6. External sources: multi-line structured input for source items.
7. Publishing controls: publishedAt, isPinned, isFeatured, sortOrder, readingTime.
8. English localization: English title, subtitle, summary, content, SEO fields.

### Validation

- Slug is required and unique.
- Title and summary are required.
- Published articles require `publishedAt`.
- Public pages show only `published`.
- Admin preview can show drafts through the admin route or with admin-only access.

## Interactions

### View Count

Increment through a lightweight API route:

- `POST /api/ai-news/[slug]/view`

The page should not block rendering on view-count updates.

### Like

- `POST /api/ai-news/[slug]/like`

Requires login. If not logged in, return a clear login-required response.

### Favorite

- `POST /api/ai-news/[slug]/favorite`

Requires login. If not logged in, prompt login on the client.

### Share And Copy

Use a small client component for:

- Web Share API when available.
- Clipboard API for copy link.
- Back to top.

## SEO

### List Page Metadata

Chinese title:

`AI资讯与趋势洞察 | 恩禾 ENHE AI`

English title:

`AI News And Trend Insights | ENHE AI`

Descriptions should be short, clear, and localized.

### Detail Page Metadata

Title template:

`{article title} | ENHE AI`

Description priority:

1. `seoDescription`
2. `description`
3. `summary`

Metadata includes:

- canonical
- alternates languages
- Open Graph
- Twitter Card
- keywords
- article published and modified time
- author
- tags
- cover image

### JSON-LD

List page:

- `CollectionPage`
- `BreadcrumbList`

Detail page:

- `NewsArticle`
- `BreadcrumbList`
- `Organization`
- `ImageObject` when cover image exists
- `VideoObject` when video URL exists

### Sitemap

Add:

- `/ai-news`
- `/en/ai-news`
- published article detail URLs in both languages when the English version is indexable

Use `updatedAt` as `lastModified`.

## Localization Rules

- Chinese pages use Chinese content.
- English pages use English fields.
- If an English article lacks a translated title, summary, and content, the English detail page should not be indexable.
- Admin labels can use existing dictionary patterns and may start with Chinese labels if full admin localization becomes too large for the first version.
- Public navigation and public-facing strings must have both Chinese and English copy.

## UI Direction

Use the current visual system:

- dark page background
- glass cards with soft borders
- restrained gradients
- rounded radius consistent with existing cards
- clear typography and comfortable line-height
- no aggressive sales labels
- card hover should use subtle translate or border glow
- mobile layout should collapse into one column

Design dials:

- Design variance: 5
- Motion intensity: 3
- Visual density: 4

This keeps the module premium and readable instead of noisy.

## Testing Strategy

Use TDD/source-contract tests before implementation.

Target tests:

- `src/lib/ai-news-source.test.ts`
  - public routes exist
  - admin routes exist
  - nav dictionary includes AI news
  - localized public paths are recognized
  - sitemap references AI news
  - schema helper or page shell emits expected JSON-LD names
- `src/lib/ai-news.test.ts`
  - slug generation and parsing
  - content renderer extracts H2 and H3 table of contents
  - content renderer escapes raw HTML
  - English indexability guard
  - related article fallback logic
- Admin action tests where practical:
  - slug uniqueness behavior
  - published-only public query
  - login-required favorite and like rules

Manual and browser verification after implementation:

- `/ai-news`
- `/en/ai-news`
- `/ai-news/[slug]`
- `/en/ai-news/[slug]`
- `/admin/ai-news`
- `/admin/ai-news/new`
- mobile viewport
- metadata
- JSON-LD
- sitemap
- robots

## Deployment Plan

1. Implement and verify locally.
2. Run Prisma migration and generate client.
3. Run:
   - `npm test`
   - `npm run typecheck`
   - `npm run lint`
   - `npm run build`
4. Use Playwright for public and admin smoke checks.
5. Commit implementation.
6. Push to GitHub and deploy to Tencent Cloud with the existing deployment script:
   - `powershell -ExecutionPolicy Bypass -File scripts\push-and-deploy.ps1 -CommitMessage "Add AI news trend insights module" -RunBuild`
7. Recheck live pages after deployment.

## Acceptance Checklist

- `/ai-news` loads normally.
- `/en/ai-news` loads normally.
- Published detail pages load normally.
- Draft and archived articles are not publicly visible.
- Admin can create, edit, publish, archive, pin, and feature news articles.
- List page supports search, category filtering, tag filtering, and pagination.
- Detail page shows summary, key takeaways, content, conclusion, sources, related tools, related tutorials, and related news.
- H2 and H3 table of contents works.
- Basic like, favorite, copy link, share, view count, and back-to-top interactions work.
- SEO metadata is localized and canonical URLs are correct.
- JSON-LD is present on list and detail pages.
- Sitemap includes list and published detail pages.
- Mobile layout is usable.
- Existing home, tool, user center, admin, order, and payment pages are not changed beyond the new nav entry.
- Lint, typecheck, tests, and build pass.

## Spec Self-Review

- Placeholder scan: no unresolved placeholder requirements remain.
- Internal consistency: routes, models, admin pages, public pages, and SEO all align with the recommended full database version.
- Scope check: the first version is broad but coherent because the requirement explicitly asks for front page, detail page, admin management, SEO, and interactions.
- Ambiguity check: English indexability, unsafe HTML handling, and non-sales CTA tone are explicit.
