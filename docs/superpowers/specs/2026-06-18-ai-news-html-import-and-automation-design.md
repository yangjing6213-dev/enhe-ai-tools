# AI News HTML Import And Automation Design

## Goal

Add an admin HTML import workflow and an automation-friendly HTML publishing path for ENHE AI news articles. The feature must support pasted HTML, uploaded `.html` files, draft import, direct publish, and future Codex scheduled publishing that generates HTML with the `enhe-ai-news-seo` skill and posts it without manual review.

## Context

The website already stores AI news in the `NewsArticle` model and renders article content from a Markdown-like plain text field. The existing token-protected import API accepts structured JSON and writes the same model fields used by the admin editor. The new HTML workflow should reuse this import pipeline instead of creating a parallel content system.

## Requirements

- Add `/admin/ai-news/import` for logged-in admins.
- Allow admins to paste HTML or upload an `.html` file.
- Allow admins to choose `draft` or `published`.
- Redirect to the article edit page after a successful import.
- Keep the existing JSON import API working.
- Extend the API to accept HTML payloads for automation.
- Add a local script that posts an HTML file to the production import API.
- Make the HTML path safe enough for no-review automation by rejecting unsafe or incomplete HTML.
- Keep imported records visible in the existing AI news admin list and editable in the existing editor.

## HTML Input Contract

The importer accepts an article fragment or a complete no-CSS HTML document produced by the ENHE news skill. It extracts:

- `h1` as `title`.
- `meta[name="description"]`, the first short summary-like paragraph, or the first paragraph as `summary`.
- `meta[name="keywords"]` and admin-provided tags as tags.
- The first `img[src]` as `coverImage` when it is an HTTP(S) URL.
- `time[datetime]` as `publishedAt` when the selected mode is `published`.
- A source section headed by `来源` or `Sources` into `externalSources`.
- `h2`, `h3`, `p`, `ul`, `ol`, `blockquote`, `pre`, and `code` into the site's Markdown-like content format.

The importer rejects:

- Empty HTML.
- Missing title.
- Missing usable content.
- Published imports with no source links.
- `<script>` tags.
- `<style>` tags.
- `style` attributes.
- Inline event handler attributes such as `onclick`.
- Non-HTTP(S) links and image URLs.

## Admin Workflow

`/admin/ai-news/import` contains a compact operational form:

- Upload file input for `.html`.
- Textarea for pasted HTML.
- Select for `草稿` or `直接发布`.
- Optional category name and tags.
- Optional import batch ID.
- Submit button.

If both file and pasted HTML are present, the pasted HTML wins because it is visible and editable before submission. The server action requires an admin session, parses the HTML, imports the article, revalidates affected pages, and redirects to `/admin/ai-news/{id}?saved=1`.

## API Workflow

`POST /api/admin/ai-news/import` continues to accept existing structured JSON. It also accepts:

```json
{
  "format": "html",
  "publishMode": "published",
  "importBatchId": "enhe-ai-news-2026-06-18",
  "html": "<article>...</article>",
  "categoryName": "AI快讯",
  "tags": ["AI资讯", "自动发布"]
}
```

The route verifies the bearer token, converts HTML to the existing import payload shape, and calls the same import service used by JSON imports.

## Automation Workflow

Codex automation can run daily as a cron job in the repo workspace. The automation prompt should:

1. Use the `enhe-ai-news-seo` skill.
2. Research current AI news.
3. Generate one no-CSS HTML article.
4. Save it to a temporary HTML file.
5. Run `scripts/publish-ai-news-html.ts --file <file> --mode published`.
6. Verify the command returns the article ID and public URL.

This is feasible after the HTML script and API path are deployed. It does not require manual review. The risk is content quality and source accuracy, so the import layer must enforce a minimum source-link requirement for published HTML.

## Testing

- Unit-test HTML parsing for title, summary, content, sources, tags, and published date extraction.
- Unit-test rejection of unsafe HTML.
- Unit-test API HTML payload support and backwards-compatible JSON support.
- Unit-test the HTML publish script, including BOM input and plaintext remote URL rejection.
- Source-test that the admin import page exists and links from the AI news admin page.
- Run focused tests, typecheck, lint, and production build before deployment.

## Rollout

Deploy page, API support, parser, and script first. Verify both paths:

- Admin path: import one HTML article as draft and confirm it appears in admin.
- Automation path: use the token script to publish one HTML article as published and confirm public URL.

After both paths work, create a Codex daily automation as a separate step using the app automation tool.
