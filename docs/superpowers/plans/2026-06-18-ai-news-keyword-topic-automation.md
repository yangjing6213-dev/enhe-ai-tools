# AI News Keyword Topic Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded AI news keyword cloud and topic collections with a data-driven system that aggregates on-site signals, applies SEO admission rules, supports admin keyword intervention, and renders localized final results on the public AI news page.

**Architecture:** Add a small AI news discovery layer on top of existing `NewsArticle`, `NewsTag`, `AnalyticsEvent`, and admin Server Actions. The pipeline will collect keyword candidates and topic candidates from on-site signals, apply SEO admission filtering, merge manual intervention rules, optionally accept an external SEO provider boost through a no-op interface, and return final keyword/topic items to `src/app/ai-news/page-shell.tsx`.

**Tech Stack:** Next.js 15 App Router, React 19, Prisma 6/PostgreSQL, Tailwind CSS v4, Vitest, existing admin Server Actions, existing Tencent deployment workflow.

---

## File Structure

### Create

- `src/lib/ai-news-discovery.ts`
  - Own keyword normalization, SEO filtering, ranking, topic generation, provider abstraction, and final payload shaping.
- `src/lib/ai-news-discovery.test.ts`
  - Behavior tests for keyword normalization, SEO admission, intervention overrides, topic generation, and external boost merge.
- `src/lib/ai-news-discovery-source.test.ts`
  - Source-contract tests for schema fields, public page wiring, analytics event support, and admin action/page integration.
- `src/app/admin/ai-news/keywords/page.tsx`
  - Admin page for keyword intervention management and candidate preview.
- `prisma/migrations/20260618190000_add_ai_news_keyword_interventions/migration.sql`
  - Database migration for manual keyword intervention rules.

### Modify

- `prisma/schema.prisma`
  - Add `NewsKeywordIntervention` model and relation-safe indexes.
- `src/lib/public-content.ts`
  - Add cached public AI news discovery query entrypoint that returns keyword cloud and topic collection items.
- `src/app/ai-news/page-shell.tsx`
  - Remove hardcoded arrays and consume live discovery output.
- `src/lib/analytics.ts`
  - Register the AI news search analytics event name.
- `src/app/api/analytics/route.ts`
  - Keep accepting the new analytics event payload through the existing route.
- `src/components/analytics-tracker.tsx`
  - Ensure submit/click analytics can send AI news search metadata without extra client code.
- `src/app/admin/actions.ts`
  - Add keyword intervention save and delete actions plus revalidation.
- `src/app/admin/layout.tsx`
  - Add the keyword management entry under the AI news admin area.
- `src/lib/admin-i18n.ts`
  - Add admin label for keyword management if needed.

---

## Task 1: Add Source-Contract Coverage First

**Files:**
- Create: `src/lib/ai-news-discovery-source.test.ts`
- Test: `src/lib/ai-news-discovery-source.test.ts`

- [ ] **Step 1: Write the failing source-contract test**

```ts
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function exists(path: string) {
  return existsSync(join(process.cwd(), path));
}

describe("AI news keyword automation source contracts", () => {
  it("adds a discovery service and public content entrypoint", () => {
    expect(exists("src/lib/ai-news-discovery.ts")).toBe(true);

    const publicContent = read("src/lib/public-content.ts");
    expect(publicContent).toContain("getPublicAiNewsDiscovery");
    expect(publicContent).toContain("keywordCloudItems");
    expect(publicContent).toContain("topicCollectionItems");
  });

  it("removes hardcoded keyword/topic constants from the AI news page shell", () => {
    const pageShell = read("src/app/ai-news/page-shell.tsx");

    expect(pageShell).not.toContain("const popularKeywords = [");
    expect(pageShell).not.toContain("const topicCollections = [");
    expect(pageShell).toContain("getPublicAiNewsDiscovery");
    expect(pageShell).toContain("keywordCloudItems");
    expect(pageShell).toContain("topicCollectionItems");
  });

  it("adds schema and admin wiring for keyword intervention management", () => {
    const schema = read("prisma/schema.prisma");
    const actions = read("src/app/admin/actions.ts");
    const adminLayout = read("src/app/admin/layout.tsx");

    expect(schema).toContain("model NewsKeywordIntervention");
    expect(schema).toContain("@@unique([keyword, locale])");
    expect(actions).toContain("upsertNewsKeywordInterventionAction");
    expect(actions).toContain("deleteNewsKeywordInterventionAction");
    expect(adminLayout).toContain("/admin/ai-news/keywords");
    expect(exists("src/app/admin/ai-news/keywords/page.tsx")).toBe(true);
  });

  it("registers the AI news search analytics event", () => {
    const analytics = read("src/lib/analytics.ts");
    expect(analytics).toContain("search_ai_news");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm test -- src/lib/ai-news-discovery-source.test.ts
```

Expected: FAIL because the discovery service, schema model, admin keyword page, and public page wiring do not exist yet.

---

## Task 2: Add Behavior Tests For Discovery Logic

**Files:**
- Create: `src/lib/ai-news-discovery.test.ts`
- Create later: `src/lib/ai-news-discovery.ts`
- Test: `src/lib/ai-news-discovery.test.ts`

- [ ] **Step 1: Write the failing behavior tests**

```ts
import { describe, expect, it } from "vitest";
import {
  applyKeywordInterventions,
  buildAiNewsKeywordCloud,
  buildAiNewsTopicCollections,
  defaultAiNewsExternalSeoProvider,
  normalizeAiNewsKeyword,
  passesAiNewsKeywordSeoRules
} from "@/lib/ai-news-discovery";

describe("AI news discovery helpers", () => {
  it("normalizes keywords and removes noisy fragments", () => {
    expect(normalizeAiNewsKeyword("  AI视频  ")).toBe("AI视频");
    expect(normalizeAiNewsKeyword("AI")).toBeNull();
    expect(normalizeAiNewsKeyword("2026")).toBeNull();
    expect(normalizeAiNewsKeyword("***")).toBeNull();
  });

  it("checks SEO admission rules against article coverage and signal strength", () => {
    expect(
      passesAiNewsKeywordSeoRules({
        keyword: "AI视频",
        articleCount: 3,
        searchCount30d: 0,
        totalHeat: 0
      })
    ).toBe(true);
    expect(
      passesAiNewsKeywordSeoRules({
        keyword: "工具",
        articleCount: 10,
        searchCount30d: 12,
        totalHeat: 100
      })
    ).toBe(false);
    expect(
      passesAiNewsKeywordSeoRules({
        keyword: "AI视频",
        articleCount: 1,
        searchCount30d: 1,
        totalHeat: 1
      })
    ).toBe(false);
  });

  it("applies pin, hide, rename, and weight boost intervention rules", () => {
    const items = applyKeywordInterventions(
      [
        { keyword: "AI视频", score: 10, displayName: "AI视频", articleCount: 4, searchCount30d: 7, totalHeat: 22 },
        { keyword: "OpenAI", score: 8, displayName: "OpenAI", articleCount: 3, searchCount30d: 3, totalHeat: 14 }
      ],
      [
        { keyword: "OpenAI", locale: "zh", isPinned: true, isHidden: false, displayName: "OpenAI 最新", weightBoost: 6 },
        { keyword: "AI视频", locale: "zh", isPinned: false, isHidden: true, displayName: null, weightBoost: 0 }
      ]
    );

    expect(items).toEqual([
      expect.objectContaining({ keyword: "OpenAI", displayName: "OpenAI 最新", isPinned: true })
    ]);
  });

  it("builds a ranked keyword cloud capped to 12 items", async () => {
    const items = await buildAiNewsKeywordCloud(
      {
        locale: "zh",
        candidates: Array.from({ length: 14 }).map((_, index) => ({
          keyword: `AI关键词${index + 1}`,
          articleCount: 3,
          searchCount30d: index + 1,
          totalHeat: 20 - index,
          freshnessDays: 2,
          tagHits: 1,
          keywordFieldHits: 1
        })),
        interventions: [],
        externalProvider: defaultAiNewsExternalSeoProvider
      }
    );

    expect(items).toHaveLength(12);
    expect(items[0]?.keyword).toBe("AI关键词14");
  });

  it("builds exactly five topic collections with keyword fallback", () => {
    const topics = buildAiNewsTopicCollections({
      locale: "zh",
      keywordItems: [
        { keyword: "AI视频", displayName: "AI视频", score: 12, articleCount: 4, searchCount30d: 9, totalHeat: 24, isPinned: false },
        { keyword: "ComfyUI", displayName: "ComfyUI", score: 11, articleCount: 4, searchCount30d: 8, totalHeat: 18, isPinned: false }
      ],
      fallbackTags: [
        { keyword: "本地部署AI", displayName: "本地部署AI", score: 10, articleCount: 4, searchCount30d: 0, totalHeat: 12, isPinned: false },
        { keyword: "AI办公", displayName: "AI办公", score: 9, articleCount: 4, searchCount30d: 0, totalHeat: 10, isPinned: false },
        { keyword: "AI智能体", displayName: "AI智能体", score: 8, articleCount: 4, searchCount30d: 0, totalHeat: 8, isPinned: false }
      ]
    });

    expect(topics).toHaveLength(5);
    expect(topics.map((item) => item.query)).toEqual(["AI视频", "ComfyUI", "本地部署AI", "AI办公", "AI智能体"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm test -- src/lib/ai-news-discovery.test.ts
```

Expected: FAIL because `src/lib/ai-news-discovery.ts` does not exist yet.

---

## Task 3: Add Prisma Model For Keyword Intervention

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260618190000_add_ai_news_keyword_interventions/migration.sql`
- Test: `src/lib/ai-news-discovery-source.test.ts`

- [ ] **Step 1: Add the Prisma model**

Add this model near the other AI news models in `prisma/schema.prisma`:

```prisma
model NewsKeywordIntervention {
  id          String   @id @default(cuid())
  keyword     String
  locale      String
  isPinned    Boolean  @default(false) @map("is_pinned")
  isHidden    Boolean  @default(false) @map("is_hidden")
  displayName String?  @map("display_name")
  weightBoost Int      @default(0) @map("weight_boost")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@unique([keyword, locale])
  @@index([locale, isPinned, isHidden])
  @@map("news_keyword_interventions")
}
```

- [ ] **Step 2: Add the SQL migration**

Create `prisma/migrations/20260618190000_add_ai_news_keyword_interventions/migration.sql`:

```sql
CREATE TABLE "news_keyword_interventions" (
  "id" TEXT NOT NULL,
  "keyword" TEXT NOT NULL,
  "locale" TEXT NOT NULL,
  "is_pinned" BOOLEAN NOT NULL DEFAULT false,
  "is_hidden" BOOLEAN NOT NULL DEFAULT false,
  "display_name" TEXT,
  "weight_boost" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "news_keyword_interventions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "news_keyword_interventions_keyword_locale_key"
  ON "news_keyword_interventions"("keyword", "locale");

CREATE INDEX "news_keyword_interventions_locale_is_pinned_is_hidden_idx"
  ON "news_keyword_interventions"("locale", "is_pinned", "is_hidden");
```

- [ ] **Step 3: Generate Prisma client**

Run:

```powershell
npm run prisma:generate
```

Expected: PASS.

---

## Task 4: Implement Discovery Service

**Files:**
- Create: `src/lib/ai-news-discovery.ts`
- Test: `src/lib/ai-news-discovery.test.ts`

- [ ] **Step 1: Implement the core types and helpers**

`src/lib/ai-news-discovery.ts` must export:

- `normalizeAiNewsKeyword`
- `passesAiNewsKeywordSeoRules`
- `applyKeywordInterventions`
- `buildAiNewsKeywordCloud`
- `buildAiNewsTopicCollections`
- `defaultAiNewsExternalSeoProvider`

The file should also define:

- `AiNewsKeywordCandidate`
- `AiNewsKeywordCloudItem`
- `AiNewsTopicCollectionItem`
- `AiNewsExternalSeoProvider`

- [ ] **Step 2: Use these exact keyword admission constants**

```ts
const minKeywordLength = 2;
const maxKeywordLength = 24;
const minArticleCount = 2;
const minSearchCount30d = 5;
const minTotalHeat = 12;
const minRenderableArticleCount = 3;
const maxKeywordCloudItems = 12;
const topicCollectionCount = 5;
```

- [ ] **Step 3: Implement ranking rules**

Score must combine:

- `tagHits`
- `keywordFieldHits`
- `searchCount30d`
- `totalHeat`
- freshness bonus from `freshnessDays`
- `weightBoost`

Pinned items sort before non-pinned items.

- [ ] **Step 4: Implement the no-op external provider**

```ts
export const defaultAiNewsExternalSeoProvider: AiNewsExternalSeoProvider = {
  async getKeywordBoosts() {
    return [];
  }
};
```

The provider must only boost already admitted keywords and must never create new keywords by itself.

- [ ] **Step 5: Run behavior tests**

Run:

```powershell
npm test -- src/lib/ai-news-discovery.test.ts
```

Expected: PASS.

---

## Task 5: Add Cached Public Discovery Entry Point

**Files:**
- Modify: `src/lib/public-content.ts`
- Test: `src/lib/ai-news-discovery-source.test.ts`

- [ ] **Step 1: Add query helpers inside `src/lib/public-content.ts`**

Add a new cached function:

```ts
const getCachedPublicAiNewsDiscovery = unstable_cache(
  async (locale: "zh" | "en") => {
    // load published news articles with categories and tags
    // load interventions for the locale
    // load recent analytics search events
    // build keyword cloud and topic collections
  },
  ["public-ai-news-discovery"],
  { revalidate: publicContentRevalidate, tags: ["public-news"] }
);
```

- [ ] **Step 2: Query these exact inputs**

- published news articles:
  - `title`
  - `keywords`
  - `seoKeywords`
  - `englishKeywords`
  - `englishSeoKeywords`
  - `viewCount`
  - `isPinned`
  - `isFeatured`
  - `publishedAt`
  - `tagLinks.tag.name`
- keyword interventions by locale
- `analyticsEvent` rows where `eventName = "search_ai_news"` and created within the last 30 days

- [ ] **Step 3: Export the new public helper**

```ts
export async function getPublicAiNewsDiscovery(locale: "zh" | "en") {
  return getCachedPublicAiNewsDiscovery(locale);
}
```

- [ ] **Step 4: Run source-contract test**

Run:

```powershell
npm test -- src/lib/ai-news-discovery-source.test.ts
```

Expected: some assertions pass; page shell and admin actions still fail.

---

## Task 6: Register AI News Search Analytics

**Files:**
- Modify: `src/lib/analytics.ts`
- Modify: `src/app/ai-news/page-shell.tsx`
- Test: `src/lib/analytics.test.ts`

- [ ] **Step 1: Add the event name**

Append `"search_ai_news"` to `analyticsEventNames` in `src/lib/analytics.ts`.

- [ ] **Step 2: Extend analytics test**

Add this assertion in `src/lib/analytics.test.ts`:

```ts
expect(isAnalyticsEventName("search_ai_news")).toBe(true);
```

- [ ] **Step 3: Add metadata-based tracking to the AI news filter form**

The filter form in `src/app/ai-news/page-shell.tsx` must include:

```tsx
data-analytics-event="search_ai_news"
data-analytics-meta-locale={locale}
data-analytics-meta-query={filters.q ?? ""}
data-analytics-meta-category={filters.category ?? ""}
data-analytics-meta-tag={filters.tag ?? ""}
data-analytics-meta-sort={filters.sort}
```

Attach the attributes to the `<form>` so the existing analytics tracker can submit the event on form submit.

- [ ] **Step 4: Run the analytics test**

Run:

```powershell
npm test -- src/lib/analytics.test.ts
```

Expected: PASS.

---

## Task 7: Replace Hardcoded Public Keyword And Topic UI

**Files:**
- Modify: `src/app/ai-news/page-shell.tsx`
- Test: `src/lib/ai-news-discovery-source.test.ts`

- [ ] **Step 1: Remove hardcoded arrays**

Delete:

- `const popularKeywords = [...]`
- `const topicCollections = [...]`

- [ ] **Step 2: Load discovery data in the page shell**

Extend the page loader `Promise.all` to include:

```ts
getPublicAiNewsDiscovery(forceLocale)
```

and destructure:

```ts
const [{ articles, total }, featured, hot, categories, tags, discovery] = await Promise.all([...]);
```

- [ ] **Step 3: Pass live data to the sidebar components**

Update the sidebar components so:

- `KeywordCloud` takes `items`
- `TopicCollections` takes `items`

The link target remains:

```ts
`${buildLocalePath("/ai-news", locale)}?q=${encodeURIComponent(item.query)}`
```

- [ ] **Step 4: Render localized display text**

Each keyword item must render `displayName`.
Each topic item must render `title`.

- [ ] **Step 5: Run source-contract test**

Run:

```powershell
npm test -- src/lib/ai-news-discovery-source.test.ts
```

Expected: page shell assertions pass; admin wiring may still fail.

---

## Task 8: Add Admin Actions For Keyword Interventions

**Files:**
- Modify: `src/app/admin/actions.ts`
- Test: `src/lib/server-action-exports.test.ts`

- [ ] **Step 1: Add `upsertNewsKeywordInterventionAction`**

Implement an exported async server action that:

- requires admin
- parses:
  - `id`
  - `keyword`
  - `locale`
  - `isPinned`
  - `isHidden`
  - `displayName`
  - `weightBoost`
- upserts into `prisma.newsKeywordIntervention`
- writes an admin audit log with action:
  - `news_keyword_intervention.upsert`
- revalidates:
  - `/admin/ai-news/keywords`
  - `/ai-news`
  - `/en/ai-news`

- [ ] **Step 2: Add `deleteNewsKeywordInterventionAction`**

Implement an exported async server action that:

- requires admin
- deletes by `id`
- writes audit action:
  - `news_keyword_intervention.delete`
- revalidates the same paths

- [ ] **Step 3: Run server action export guard**

Run:

```powershell
npm test -- src/lib/server-action-exports.test.ts
```

Expected: PASS.

---

## Task 9: Add Admin Keyword Management Page

**Files:**
- Create: `src/app/admin/ai-news/keywords/page.tsx`
- Modify: `src/app/admin/layout.tsx`
- Modify: `src/lib/admin-i18n.ts`
- Test: `src/lib/ai-news-discovery-source.test.ts`

- [ ] **Step 1: Add the admin navigation entry**

Add a new entry right after `/admin/ai-news`:

```ts
["aiNewsKeywords", "/admin/ai-news/keywords"]
```

- [ ] **Step 2: Add the admin label**

In `src/lib/admin-i18n.ts` add:

- Chinese: `AI资讯关键词`
- English: `AI News Keywords`

- [ ] **Step 3: Build the page**

The page must:

- use `AdminSection`
- query recent candidate preview from `getPublicAiNewsDiscovery("zh")` and `getPublicAiNewsDiscovery("en")`
- query existing `newsKeywordIntervention` rows ordered by:
  - `locale asc`
  - `isPinned desc`
  - `updatedAt desc`
- provide a create/edit form using the existing admin classes
- provide a delete form for existing rows

- [ ] **Step 4: Run source-contract test**

Run:

```powershell
npm test -- src/lib/ai-news-discovery-source.test.ts
```

Expected: PASS.

---

## Task 10: Verify Discovery Logic End To End

**Files:**
- `src/lib/ai-news-discovery.ts`
- `src/lib/public-content.ts`
- `src/app/ai-news/page-shell.tsx`
- `src/app/admin/ai-news/keywords/page.tsx`

- [ ] **Step 1: Run focused tests**

Run:

```powershell
npm test -- src/lib/ai-news-discovery.test.ts src/lib/ai-news-discovery-source.test.ts src/lib/analytics.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run typecheck**

Run:

```powershell
npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Run lint**

Run:

```powershell
npm run lint
```

Expected: PASS.

- [ ] **Step 4: Run build**

Run:

```powershell
npm run build
```

Expected: PASS.

---

## Task 11: Commit, Push, Deploy, And Smoke Check

**Files:**
- All changed files.

- [ ] **Step 1: Commit the feature branch**

```powershell
git add prisma/schema.prisma prisma/migrations/20260618190000_add_ai_news_keyword_interventions/migration.sql src/lib/ai-news-discovery.ts src/lib/ai-news-discovery.test.ts src/lib/ai-news-discovery-source.test.ts src/lib/public-content.ts src/lib/analytics.ts src/lib/analytics.test.ts src/app/ai-news/page-shell.tsx src/app/admin/actions.ts src/app/admin/layout.tsx src/lib/admin-i18n.ts src/app/admin/ai-news/keywords/page.tsx docs/superpowers/plans/2026-06-18-ai-news-keyword-topic-automation.md
git commit -m "feat: automate ai news keywords and topics"
```

- [ ] **Step 2: Merge or cherry-pick onto `main` after verification**

If working from the isolated worktree branch:

```powershell
git -C 'C:\Users\HU\Documents\New project 2' checkout main
git -C 'C:\Users\HU\Documents\New project 2' pull --ff-only origin main
git -C 'C:\Users\HU\Documents\New project 2' cherry-pick <feature-commit-sha>
```

- [ ] **Step 3: Push GitHub**

```powershell
git -C 'C:\Users\HU\Documents\New project 2' push origin main
```

- [ ] **Step 4: Deploy Tencent Cloud**

```powershell
ssh -i C:\Users\HU\.ssh\enhe-ai-tools-tencent.pem ubuntu@111.229.135.3 "cd /opt/enhe-ai-tools && git -c http.version=HTTP/1.1 pull origin main && SKIP_GIT_PULL=1 bash ./deploy.sh"
```

- [ ] **Step 5: Smoke check the live AI news page**

Verify:

- `https://www.enhe-tech.com.cn/ai-news`
- `https://www.enhe-tech.com.cn/en/ai-news`

Expected:

- keyword cloud is no longer hardcoded
- topic collection count is exactly 5
- page loads normally
- admin keyword page is reachable after login

---

## Plan Self-Review

- Spec coverage: this plan covers the approved keyword sources, SEO admission rules, manual intervention controls, topic display count, external-provider no-op architecture, analytics search collection, public page replacement, admin management, verification, and deployment.
- Placeholder scan: no `TBD` or deferred implementation markers remain.
- Type consistency: `NewsKeywordIntervention`, `search_ai_news`, `getPublicAiNewsDiscovery`, `keywordCloudItems`, and `topicCollectionItems` are used consistently across schema, service, public page, and admin flow.
