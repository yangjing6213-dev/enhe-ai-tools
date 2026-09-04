# AI News HTML Import And Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build admin and automation paths that import ENHE AI news from no-CSS HTML into the existing AI news CMS.

**Architecture:** Add a focused HTML-to-import-payload parser, then reuse the existing `importAiNewsArticle` service for persistence. Admin form submissions and token API calls both call the same conversion layer so draft, published, audit, revalidation, and editor behavior stay consistent.

**Tech Stack:** Next.js App Router, server actions, Prisma, Zod, Vitest, Node scripts with `fetch`.

---

## File Map

- Create `src/lib/ai-news-html-import.ts`: Parse and validate HTML, convert it into the existing `AiNewsImportPayload` shape.
- Create `src/lib/ai-news-html-import.test.ts`: Unit tests for extraction and unsafe HTML rejection.
- Modify `src/lib/ai-news-import.ts`: Export the import source channel if useful and accept converted payloads unchanged.
- Modify `src/app/api/admin/ai-news/import/route.ts`: Branch HTML payloads into the parser, keep existing JSON behavior.
- Modify `src/app/api/admin/ai-news/import/route.test.ts`: API tests for HTML payload support and unsafe HTML rejection.
- Modify `src/app/admin/actions.ts`: Add `importNewsArticleHtmlAction`.
- Create `src/app/admin/ai-news/import/page.tsx`: Admin page with paste/upload HTML form.
- Modify `src/app/admin/ai-news/page.tsx`: Add link to HTML import page.
- Create `scripts/publish-ai-news-html.ts`: CLI script for automation publishing of HTML files.
- Create `scripts/publish-ai-news-html.test.ts`: CLI behavior tests.
- Add source contract test if needed to ensure page route/link exists.

## Task 1: HTML Parser

**Files:**
- Create: `src/lib/ai-news-html-import.ts`
- Test: `src/lib/ai-news-html-import.test.ts`

- [ ] **Step 1: Write failing parser tests**

Test these behaviors:

```ts
import { describe, expect, it } from "vitest";
import { buildAiNewsImportPayloadFromHtml } from "@/lib/ai-news-html-import";

describe("AI news HTML import parser", () => {
  it("extracts article fields from no-CSS HTML", () => {
    const payload = buildAiNewsImportPayloadFromHtml({
      html: `
        <article>
          <h1>OpenAI 发布新的智能体能力</h1>
          <time datetime="2026-06-18">2026年6月18日</time>
          <meta name="description" content="这是一条面向 ENHE 用户的 AI 智能体新闻摘要。">
          <meta name="keywords" content="AI智能体, 本地部署AI, AI教程">
          <img src="https://images.unsplash.com/photo-1" alt="AI workspace">
          <h2 id="facts">事实概述</h2>
          <p>OpenAI 发布了新的智能体能力，开发者可以将其用于自动化工作流。</p>
          <ul><li>支持多步骤任务</li><li>强调安全边界</li></ul>
          <h2 id="sources">来源</h2>
          <ul><li><a href="https://example.com/news">官方公告</a></li></ul>
        </article>
      `,
      publishMode: "published",
      importBatchId: "html-test",
      tags: ["自动发布"],
      categoryName: "AI快讯"
    });

    expect(payload.publishMode).toBe("published");
    expect(payload.publishedAt?.toISOString()).toBe("2026-06-18T00:00:00.000Z");
    expect(payload.article.title).toBe("OpenAI 发布新的智能体能力");
    expect(payload.article.summary).toBe("这是一条面向 ENHE 用户的 AI 智能体新闻摘要。");
    expect(payload.article.coverImage).toBe("https://images.unsplash.com/photo-1");
    expect(payload.article.tags).toEqual(["AI智能体", "本地部署AI", "AI教程", "自动发布"]);
    expect(payload.article.externalSources).toEqual([
      { title: "官方公告", url: "https://example.com/news", sourceType: "source" }
    ]);
    expect(payload.article.content).toContain("## 事实概述");
    expect(payload.article.content).toContain("- 支持多步骤任务");
  });

  it("rejects unsafe HTML", () => {
    expect(() =>
      buildAiNewsImportPayloadFromHtml({
        html: "<article><h1>Bad</h1><script>alert(1)</script></article>",
        publishMode: "draft"
      })
    ).toThrow("HTML cannot contain script tags.");
  });
});
```

- [ ] **Step 2: Run parser tests and confirm failure**

Run: `npm test -- src/lib/ai-news-html-import.test.ts`

Expected: FAIL because `@/lib/ai-news-html-import` does not exist.

- [ ] **Step 3: Implement parser**

Create `buildAiNewsImportPayloadFromHtml(input)` with:

- Unsafe HTML checks.
- Tag stripping helper for text extraction.
- Regex-based extraction for allowed no-CSS HTML from the ENHE skill.
- Conversion to existing `AiNewsImportPayload`.
- Default source when draft has no source: ENHE site URL.
- Published mode requires at least one external source link.

- [ ] **Step 4: Run parser tests and confirm pass**

Run: `npm test -- src/lib/ai-news-html-import.test.ts`

Expected: PASS.

## Task 2: API HTML Payload Support

**Files:**
- Modify: `src/app/api/admin/ai-news/import/route.ts`
- Modify: `src/app/api/admin/ai-news/import/route.test.ts`

- [ ] **Step 1: Write failing API tests**

Add tests that post:

```json
{
  "format": "html",
  "publishMode": "draft",
  "html": "<article><h1>HTML News</h1><p>Summary text long enough for import.</p><h2>来源</h2><a href=\"https://example.com\">Example</a></article>"
}
```

Expect `importAiNewsArticle` to receive a structured payload with `article.title === "HTML News"`.

- [ ] **Step 2: Run route tests and confirm failure**

Run: `npm test -- src/app/api/admin/ai-news/import/route.test.ts`

Expected: FAIL because the route treats HTML payload as invalid JSON import shape.

- [ ] **Step 3: Implement route branch**

In `POST`, after `request.json()`, if payload has `format: "html"`, call `buildAiNewsImportPayloadFromHtml(payload)`, otherwise pass payload through unchanged.

- [ ] **Step 4: Run route tests and confirm pass**

Run: `npm test -- src/app/api/admin/ai-news/import/route.test.ts`

Expected: PASS.

## Task 3: Admin HTML Import Page

**Files:**
- Modify: `src/app/admin/actions.ts`
- Create: `src/app/admin/ai-news/import/page.tsx`
- Modify: `src/app/admin/ai-news/page.tsx`
- Test: source-contract tests if needed

- [ ] **Step 1: Write source test**

Create or extend a source test to assert:

- `src/app/admin/ai-news/import/page.tsx` exists.
- It imports `importNewsArticleHtmlAction`.
- `src/app/admin/ai-news/page.tsx` links to `/admin/ai-news/import`.

- [ ] **Step 2: Run source test and confirm failure**

Run the focused source test.

Expected: FAIL because page/action/link do not exist.

- [ ] **Step 3: Implement server action**

Add `importNewsArticleHtmlAction(formData)`:

- `requireAdmin()`.
- Read `html` textarea.
- If textarea empty, read `htmlFile` when it is a `File`.
- Parse `publishMode`.
- Parse `categoryName`, `tags`, `importBatchId`.
- Call `buildAiNewsImportPayloadFromHtml`.
- Call `importAiNewsArticle`.
- Revalidate admin and public paths.
- Redirect to returned admin URL with `?saved=1`.
- On errors, redirect back to `/admin/ai-news/import?error=...`.

- [ ] **Step 4: Implement admin page**

Create form with:

- File input `htmlFile`.
- Textarea `html`.
- Select `publishMode`.
- Input `categoryName`.
- Input `tags`.
- Input `importBatchId`.
- Submit button.

- [ ] **Step 5: Add list page link**

Add a secondary link beside “新增资讯” to `/admin/ai-news/import`.

- [ ] **Step 6: Run source test and confirm pass**

Run the focused source test.

Expected: PASS.

## Task 4: HTML Publish Script

**Files:**
- Create: `scripts/publish-ai-news-html.ts`
- Create: `scripts/publish-ai-news-html.test.ts`

- [ ] **Step 1: Write failing script tests**

Test:

- Rejects plaintext non-local HTTP.
- Accepts BOM HTML files.
- Posts `{ format: "html", html, publishMode }`.
- Reports non-JSON HTTP failure text.

- [ ] **Step 2: Run script tests and confirm failure**

Run: `npm test -- scripts/publish-ai-news-html.test.ts`

Expected: FAIL because script does not exist.

- [ ] **Step 3: Implement script**

Mirror `scripts/publish-ai-news.ts`, but:

- Reads an HTML file.
- Strips UTF-8 BOM.
- Builds `{ format: "html", html, publishMode, importBatchId?, tags?, categoryName? }`.
- Posts to `AI_NEWS_IMPORT_URL`.

- [ ] **Step 4: Run script tests and confirm pass**

Run: `npm test -- scripts/publish-ai-news-html.test.ts`

Expected: PASS.

## Task 5: Verification And Deployment

**Files:**
- All changed files.

- [ ] **Step 1: Run focused tests**

Run:

```powershell
npm test -- src/lib/ai-news-html-import.test.ts src/app/api/admin/ai-news/import/route.test.ts scripts/publish-ai-news-html.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run quality checks**

Run:

```powershell
npm test
npm run typecheck
npm run lint
$env:DATABASE_URL='postgresql://postgres:postgres@localhost:5432/enhe_ai_tools?schema=public'; npm run build
```

Expected: PASS. Build may log existing database fallback errors during static generation but must exit 0.

- [ ] **Step 3: Commit and push**

Commit with:

```bash
git add docs/superpowers src scripts
git commit -m "feat: import ai news from html"
git update-ref refs/heads/main HEAD
git push origin main
```

- [ ] **Step 4: Deploy**

Use the existing Tencent Cloud deployment flow:

```powershell
ssh ubuntu@111.229.135.3 'cd /opt/enhe-ai-tools && git -c http.version=HTTP/1.1 pull origin main && SKIP_GIT_PULL=1 ./deploy.sh'
```

If GitHub pull fails, use a git bundle upload as done previously.

- [ ] **Step 5: Verify both production paths**

Admin path:

- Open `/admin/ai-news/import`.
- Import one HTML article as draft.
- Confirm it redirects to edit page.

Automation path:

- Run `scripts/publish-ai-news-html.ts --file <html> --mode published` against production.
- Confirm the returned public URL works.

## Self-Review

- Spec coverage: The plan covers admin paste/upload, API HTML payload, script automation path, safety validation, and production verification.
- Placeholder scan: No unresolved placeholders remain.
- Type consistency: The parser returns `AiNewsImportPayload`; API, admin action, and script all feed existing `importAiNewsArticle`.
