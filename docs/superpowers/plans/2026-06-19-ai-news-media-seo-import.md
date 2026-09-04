# AI News Media SEO Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure AI news automation generates topic-specific cover images and importable inline media, and the website renders those media assets for SEO.

**Architecture:** Keep the existing `NewsArticle` schema. Store the first content image as `coverImage`, preserve additional article images as Markdown image blocks in `content`, parse/render those blocks in the public detail page, and render the existing video fields as a safe video resource card.

**Tech Stack:** Next.js App Router, TypeScript, Vitest, Prisma, local Codex skill files, Codex automation.

---

### Task 1: Import And Render Media Blocks

**Files:**
- Modify: `src/lib/ai-news-html-import.test.ts`
- Modify: `src/lib/ai-news-html-import.ts`
- Modify: `src/lib/ai-news.test.ts`
- Modify: `src/lib/ai-news.ts`
- Modify: `src/app/ai-news/[slug]/page-shell.tsx`

- [x] Add a failing import test where the first `<img>` becomes `coverImage` and a later `<figure><img alt><figcaption>` becomes Markdown image content.
- [x] Add a failing content-rendering test for Markdown image syntax: `![alt](url "caption")`.
- [x] Implement importer conversion of inline `figure/img` blocks to Markdown image blocks, skipping the first featured image.
- [x] Implement `NewsContentBlock` image parsing and render it as semantic `figure`, `img`, and optional `figcaption`.
- [x] Render `videoUrl`, `videoTitle`, and `videoDescription` as a safe detail-page video card when present.

### Task 2: Skill And Automation Media Contract

**Files:**
- Modify: `C:/Users/HU/.agents/skills/enhe-ai-news-seo/enhe-ai-news-seo/SKILL.md`
- Modify: `C:/Users/HU/.agents/skills/enhe-ai-news-seo/enhe-ai-news-seo/assets/html-template.html`
- Modify: `C:/Users/HU/.agents/skills/enhe-ai-news-seo/enhe-ai-news-seo/scripts/validate_html.py`
- Update automation: `enhe-ai`

- [x] Require topic-specific, non-reused Unsplash cover images.
- [x] Require at least one body media asset: inline content image or reliable video URL.
- [x] Require descriptive alt text and captions that include natural SEO keywords.
- [x] Make validator fail when only one image exists and no video URL exists.
- [x] Update automation prompt to validate media SEO before publishing.

### Task 3: Verification And Release

- [x] Run `npm test -- src/lib/ai-news-html-import.test.ts src/lib/ai-news.test.ts`.
- [x] Run existing import/API/script tests.
- [x] Run `npm run typecheck`.
- [x] Run the updated skill validator on a sample HTML file.
- [x] Commit, push to `main`, deploy to Tencent Cloud, and check `/api/health`.
