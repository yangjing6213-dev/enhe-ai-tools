# AI Demand Trend Briefing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a website module that publishes AI demand trend morning reports with an indexable evergreen topic page, noindex daily archive pages, public summaries, and logged-in full HTML access.

**Architecture:** Add a dedicated `AiTrendBriefing` Prisma model instead of reusing `NewsArticle`, because daily automated reports must remain separate from indexable editorial news. Expose cached public read helpers in `src/lib/ai-trends.ts`, render shared page shells under `/ai-trends`, and keep the automation entry point in a standalone publish script that validates and upserts report records.

**Tech Stack:** Next.js 15 App Router, React 19 server components, Prisma/PostgreSQL, Vitest, TypeScript, Tailwind CSS.

---

## File Structure

- Create `src/lib/ai-trends.ts`: date slug validation, source-signal normalization, HTML safety validation, public/logged-in payload splitting, Prisma read helpers, and publish input validation.
- Create `src/lib/ai-trends.test.ts`: behavior tests for validation, sanitizer, public/full payload splitting, and published source requirements.
- Create `src/lib/ai-trends-source.test.ts`: source-contract tests for routes, sitemap inclusion/exclusion, metadata noindex rules, and import script presence.
- Modify `prisma/schema.prisma`: add `AiTrendBriefingStatus` enum and `AiTrendBriefing` model.
- Create `prisma/migrations/20260619090000_add_ai_trend_briefings/migration.sql`: database migration for the new enum/table/indexes.
- Create `src/app/ai-trends/page-shell.tsx`: evergreen topic page shell and metadata generator.
- Create `src/app/ai-trends/daily/page-shell.tsx`: daily archive page shell and noindex metadata generator.
- Create `src/app/ai-trends/daily/[date]/page-shell.tsx`: daily detail shell with public summary and logged-in iframe-rendered full report.
- Create route wrappers in `src/app/(zh-public)/ai-trends/...`: Chinese public routes mounted at `/ai-trends`.
- Modify `src/app/sitemap.ts`: add `/ai-trends` only; keep daily pages excluded.
- Modify `src/lib/seo.ts`: recognize `/ai-trends` as a localized public path for language switcher safety if this route is later localized.
- Create `scripts/publish-ai-trend-briefing-html.ts`: automation script to publish/upsert validated report HTML plus summary JSON.
- Create `scripts/publish-ai-trend-briefing-html.test.ts`: script test for BOM stripping, summary payload posting/upsert behavior, and plaintext remote token refusal if using HTTP APIs; if direct DB script is used, test argument parsing and validation via temp files.

## Task 1: Core Library And Data Model

**Files:**
- Create: `src/lib/ai-trends.test.ts`
- Create: `src/lib/ai-trends.ts`
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260619090000_add_ai_trend_briefings/migration.sql`

- [ ] **Step 1: Write failing core behavior tests**

Create `src/lib/ai-trends.test.ts` with tests that import the future functions from `@/lib/ai-trends` and assert:

```ts
expect(isValidAiTrendDateSlug("2026-06-19")).toBe(true);
expect(isValidAiTrendDateSlug("2026-6-19")).toBe(false);
expect(() => sanitizeAiTrendBriefingHtml("<script>alert(1)</script>")).toThrow("script");
expect(() => sanitizeAiTrendBriefingHtml('<a onclick="x()">x</a>')).toThrow("event handler");
expect(() => validateAiTrendBriefingInput({ ...validInput, sourceSignals: [], status: "published" })).toThrow("source");
expect(toAiTrendBriefingView(validBriefing, false)).not.toHaveProperty("fullHtml");
expect(toAiTrendBriefingView(validBriefing, true)).toHaveProperty("fullHtml");
```

- [ ] **Step 2: Run core test to verify RED**

Run: `npm test -- src/lib/ai-trends.test.ts`

Expected: FAIL because `src/lib/ai-trends.ts` does not exist.

- [ ] **Step 3: Add Prisma schema and migration**

Add enum/model to `prisma/schema.prisma`:

```prisma
enum AiTrendBriefingStatus {
  draft
  published
  archived
}

model AiTrendBriefing {
  id                    String                 @id @default(cuid())
  date                  DateTime               @unique
  slug                  String                 @unique
  title                 String
  summary               String
  coreConclusion        String                 @map("core_conclusion")
  publicHighlights      String[]               @default([]) @map("public_highlights")
  fullHtml              String                 @map("full_html")
  sourceSignals         Json?                  @map("source_signals")
  status                AiTrendBriefingStatus  @default(draft)
  publishedAt           DateTime?              @map("published_at")
  isIncludedInTopicPage Boolean                @default(false) @map("is_included_in_topic_page")
  createdAt             DateTime               @default(now()) @map("created_at")
  updatedAt             DateTime               @updatedAt @map("updated_at")

  @@index([status, publishedAt])
  @@index([isIncludedInTopicPage, publishedAt])
  @@map("ai_trend_briefings")
}
```

Create the matching PostgreSQL migration SQL with enum, table, unique constraints, and indexes.

- [ ] **Step 4: Generate Prisma client**

Run: `npx prisma generate`

Expected: Prisma Client generated without schema errors.

- [ ] **Step 5: Implement minimal library**

Implement `src/lib/ai-trends.ts` with exported helpers:

```ts
export function isValidAiTrendDateSlug(value: string): boolean;
export function aiTrendDateSlugToDate(value: string): Date;
export function sanitizeAiTrendBriefingHtml(value: string): string;
export function normalizeAiTrendSourceSignals(value: unknown): AiTrendSourceSignal[];
export function validateAiTrendBriefingInput(input: AiTrendBriefingPublishInput): AiTrendBriefingPublishData;
export function toAiTrendBriefingView(briefing: AiTrendBriefingRecord, includeFullHtml: boolean): AiTrendBriefingView;
export async function getAiTrendBriefingSummaries(limit?: number): Promise<AiTrendBriefingView[]>;
export async function getAiTrendBriefingByDateSlug(slug: string): Promise<AiTrendBriefingRecord | null>;
```

Validation must reject scripts, inline event handlers, `javascript:` URLs, missing full HTML, missing summary/core conclusion, invalid date slugs, and source-less published briefings.

- [ ] **Step 6: Run core test to verify GREEN**

Run: `npm test -- src/lib/ai-trends.test.ts`

Expected: PASS.

## Task 2: SEO Source Contracts

**Files:**
- Create: `src/lib/ai-trends-source.test.ts`
- Modify: `src/app/sitemap.ts`
- Modify: `src/lib/seo.ts`

- [ ] **Step 1: Write failing source-contract tests**

Create `src/lib/ai-trends-source.test.ts` asserting:

```ts
expect(exists("src/app/ai-trends/page-shell.tsx")).toBe(true);
expect(exists("src/app/ai-trends/daily/page-shell.tsx")).toBe(true);
expect(exists("src/app/ai-trends/daily/[date]/page-shell.tsx")).toBe(true);
expect(exists("src/app/(zh-public)/ai-trends/page.tsx")).toBe(true);
expect(exists("src/app/(zh-public)/ai-trends/daily/page.tsx")).toBe(true);
expect(exists("src/app/(zh-public)/ai-trends/daily/[date]/page.tsx")).toBe(true);
expect(read("src/app/sitemap.ts")).toContain('"/ai-trends"');
expect(read("src/app/sitemap.ts")).not.toContain('"/ai-trends/daily"');
expect(read("src/app/robots.ts")).not.toContain("/ai-trends/daily");
expect(read("src/app/ai-trends/daily/page-shell.tsx")).toContain("index: false");
expect(read("src/app/ai-trends/daily/[date]/page-shell.tsx")).toContain("index: false");
```

- [ ] **Step 2: Run source-contract test to verify RED**

Run: `npm test -- src/lib/ai-trends-source.test.ts`

Expected: FAIL because route files and sitemap entry do not exist.

- [ ] **Step 3: Update sitemap and localized path recognition**

Add `/ai-trends` to `staticRoutes` and `staticRouteLastModified` in `src/app/sitemap.ts`.

Add `/^\/ai-trends$/` to `localizedPublicRoutePatterns` in `src/lib/seo.ts`.

- [ ] **Step 4: Add route shell placeholders with metadata**

Create the three shared page-shell files and three Chinese wrappers. Daily shell metadata must set:

```ts
metadata.robots = { index: false, follow: true };
```

Topic page metadata must remain indexable and canonical to `/ai-trends`.

- [ ] **Step 5: Run source-contract test to verify GREEN**

Run: `npm test -- src/lib/ai-trends-source.test.ts`

Expected: PASS.

## Task 3: Page Experience And Access Gating

**Files:**
- Modify: `src/app/ai-trends/page-shell.tsx`
- Modify: `src/app/ai-trends/daily/page-shell.tsx`
- Modify: `src/app/ai-trends/daily/[date]/page-shell.tsx`

- [ ] **Step 1: Add page behavior tests if source contracts are insufficient**

Use source tests to verify daily detail calls `getCurrentUser`, passes `Boolean(user)` to `toAiTrendBriefingView`, renders a login CTA, and does not place `fullHtml` in the public branch.

- [ ] **Step 2: Run tests to verify RED**

Run: `npm test -- src/lib/ai-trends-source.test.ts`

Expected: FAIL until the detail shell contains the access-gating code.

- [ ] **Step 3: Implement evergreen topic page**

Render a compact visual page with:

- Hero title: `人类最渴望用 AI 解决哪些问题`
- One-sentence core conclusion.
- Demand heat ranking across work efficiency, video generation, content creation, programming, education, search/research, marketing/sales, office automation, emotional companionship, health management, finance/legal assistance.
- Opportunity priority map.
- Recent daily summaries from `getAiTrendBriefingSummaries(3)`.

- [ ] **Step 4: Implement archive page**

Render published summaries from `getAiTrendBriefingSummaries(30)` with date, title, core conclusion, public highlights, source count, and login-aware CTA copy.

- [ ] **Step 5: Implement detail page**

Use `isValidAiTrendDateSlug`, `getAiTrendBriefingByDateSlug`, and `getCurrentUser`.

Public branch shows summary, highlights, source signals, and `/login?next=/ai-trends/daily/YYYY-MM-DD` CTA.

Logged-in branch renders full report inside a sandboxed iframe using a safe `srcDoc`.

- [ ] **Step 6: Run tests**

Run: `npm test -- src/lib/ai-trends-source.test.ts src/lib/ai-trends.test.ts`

Expected: PASS.

## Task 4: Automation Publish Script

**Files:**
- Create: `scripts/publish-ai-trend-briefing-html.test.ts`
- Create: `scripts/publish-ai-trend-briefing-html.ts`
- Modify: `src/lib/ai-trends.ts`

- [ ] **Step 1: Write failing script tests**

Test that the script:

- Requires `--file`.
- Requires `--summary-file`.
- Strips UTF-8 BOM from HTML.
- Accepts `--mode draft` or `--mode published`.
- Rejects source-less published summaries through shared validation.

- [ ] **Step 2: Run script test to verify RED**

Run: `npm test -- scripts/publish-ai-trend-briefing-html.test.ts`

Expected: FAIL because the script does not exist.

- [ ] **Step 3: Implement script**

Read HTML and JSON summary files, call `validateAiTrendBriefingInput`, and upsert through `prisma.aiTrendBriefing.upsert`. Print the public URL for published reports.

- [ ] **Step 4: Run script test to verify GREEN**

Run: `npm test -- scripts/publish-ai-trend-briefing-html.test.ts`

Expected: PASS.

## Task 5: Full Verification And Commit

**Files:**
- All changed files.

- [ ] **Step 1: Run targeted tests**

Run: `npm test -- src/lib/ai-trends.test.ts src/lib/ai-trends-source.test.ts scripts/publish-ai-trend-briefing-html.test.ts`

Expected: PASS.

- [ ] **Step 2: Run full tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 4: Run lint**

Run: `npm run lint`

Expected: PASS.

- [ ] **Step 5: Run production build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 6: Inspect git diff**

Run: `git diff --stat` and `git diff --check`

Expected: no whitespace errors, changes scoped to AI trend module.

- [ ] **Step 7: Commit**

Run:

```bash
git add prisma/schema.prisma prisma/migrations/20260619090000_add_ai_trend_briefings src/app/ai-trends src/app/(zh-public)/ai-trends src/app/sitemap.ts src/lib/seo.ts src/lib/ai-trends.ts src/lib/ai-trends.test.ts src/lib/ai-trends-source.test.ts scripts/publish-ai-trend-briefing-html.ts scripts/publish-ai-trend-briefing-html.test.ts docs/superpowers/plans/2026-06-19-ai-demand-trend-briefing-implementation.md
git commit -m "feat: add ai demand trend briefing pages"
```

Expected: commit succeeds on branch `ai-demand-trend-briefing`.

## Self-Review

- Spec coverage: the plan includes the indexable `/ai-trends` page, noindex daily archive/detail pages, public summary gating, logged-in full HTML access, new data model, validation, script publishing, and sitemap rules.
- Placeholder scan: no `TBD`, `TODO`, or "similar to" placeholders remain.
- Type consistency: library names, model fields, route paths, and script names are consistent across tasks.
