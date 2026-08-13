# ENHE Phase 2A.2 Homepage Candidate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an isolated bilingual ENHE homepage candidate preview with the approved hero, five-product manual stage, five example reviews, brand-value CTA, and guarded locale switching without changing production surfaces.

**Architecture:** A server-rendered `/redesign-preview/home?locale=zh|en` page resolves one locale and passes it to the approved Header, candidate Home, and approved Footer. Static typed dictionaries own copy and public media metadata. Product controls and the review timer are the only client islands.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, scoped CSS, Vitest, Playwright, approved local ENHE assets.

---

## Execution boundaries

- Work only in `C:\Users\HU\Documents\New project 2\.worktrees\enhe-public-shell-candidate-v1`.
- Start from branch `codex/enhe-public-shell-candidate-v1`, short HEAD `878a4bb`, clean worktree.
- Never run reset, restore, clean, stash, checkout, switch, merge, rebase, fetch, pull, amend, or history rewrite.
- Modify only `src/components/redesign/home/**`, `src/lib/redesign/home/**`, `src/styles/redesign/**`, `src/app/redesign-preview/home/**`, approved candidate tests, `public/redesign/home/**`, and `docs/enhe-redesign/phase-2a2/**`.
- Do not modify production routes, root layout, `globals.css`, sitemap, robots, canonical/hreflang, package or lockfiles, Prisma, Runtime Heartbeat, R-008, product details, downloads, orders, payments, OAuth, coupons, user center, admin, production environment, or remote.
- Use explicit staging lists. Never use `git add .`.
- Required commits, in order:
  1. `feat(home): add isolated approved hero candidate`
  2. `feat(home): add manual five-product showcase candidate`
  3. `feat(home): add accessible experience review carousel candidate`
  4. `test(home): add bilingual homepage candidate regression`
  5. `docs(home): record phase 2A.2 homepage candidate review`

## Task 1: Approved bilingual hero candidate

**Files:**

- Create: `src/lib/redesign/home/home-copy.ts`
- Create: `src/components/redesign/home/EnheRedesignHero.tsx`
- Create or modify: `src/styles/redesign/home.css`
- Create: `src/components/redesign/home/home-copy.test.ts`

- [ ] **Step 1: Write the failing copy contract test**

Create a Vitest test that imports the not-yet-created copy module and asserts the exact approved values:

```ts
import { describe, expect, it } from "vitest";
import { HOME_COPY } from "@/lib/redesign/home/home-copy";

describe("homepage approved copy", () => {
  it("keeps the exact bilingual hero and value contract", () => {
    expect(HOME_COPY.zh.h1).toBe("一站式AI平台");
    expect(HOME_COPY.zh.subtitle).toBe(
      "发现真正好用的 AI 工具、智能体与实战方法，让工作更快、创作更自由，把每个灵感变成看得见的成果。",
    );
    expect(HOME_COPY.zh.cta.href).toBe("/software");
    expect(HOME_COPY.en.h1).toBe("The All-in-One AI Platform.");
    expect(HOME_COPY.en.subtitle).toBe(
      "Find genuinely useful AI tools, agents, and practical methods to work faster, create more freely, and turn every spark into a visible result.",
    );
    expect(HOME_COPY.en.cta.href).toBe("/en/software");
    expect(HOME_COPY.zh.value.heading).toBe("让每一个普通人，都能借助 AI，创造过去做不到的事。");
    expect(HOME_COPY.en.value.heading).toBe("Let everyone use AI to create what once felt out of reach.");
  });
});
```

- [ ] **Step 2: Run the focused test and verify the expected RED**

Run:

```text
rtk npx vitest run src/components/redesign/home/home-copy.test.ts
```

Expected: a clean module-not-found or missing-export failure caused by the absent candidate copy module, not a syntax or mock failure. Record `HOME_CANDIDATE_RED_STATUS=EXPECTED_FAIL` in the work log.

- [ ] **Step 3: Add the typed copy dictionary**

Define `RedesignHomeCopy` and `HOME_COPY: Record<RedesignLocale, RedesignHomeCopy>` with the exact Chinese and English label, H1, subtitle, CTA, review heading, example label, value heading, and value CTA. Set the approved CTA paths to `/software` and `/en/software`; do not introduce any new route.

- [ ] **Step 4: Add the server-rendered hero**

Implement `EnheRedesignHero({ locale })` as semantic markup with exactly one `h1`, one subtitle paragraph, one anchor CTA, and the mobile brand-label copy. The component must contain no client directive, database import, API call, internal preview label, or production-only data.

- [ ] **Step 5: Add scoped hero styles**

Extend `src/styles/redesign/home.css` with warm-white background, near-black type, centered generous spacing, the approved sage action button, mobile label placement, visible focus state, and no gradient or continuous animation. Keep selectors under `.redesign-home` so `globals.css` remains untouched.

- [ ] **Step 6: Run GREEN and inspect the diff**

Run:

```text
rtk npx vitest run src/components/redesign/home/home-copy.test.ts
rtk git diff --check
```

Expected: the copy test passes and the diff has no whitespace errors. Confirm only the planned hero files are changed.

- [ ] **Step 7: Create the first exact commit**

Stage only:

```text
rtk git add src/lib/redesign/home/home-copy.ts src/components/redesign/home/EnheRedesignHero.tsx src/components/redesign/home/home-copy.test.ts src/styles/redesign/home.css
rtk git commit -m "feat(home): add isolated approved hero candidate"
```

Verify with `rtk git show --stat --oneline HEAD` and confirm the exact commit message.

## Task 2: Manual five-product showcase

**Files:**

- Create: `src/lib/redesign/home/home-products.ts`
- Create: `src/components/redesign/home/EnheRedesignProductShowcase.tsx`
- Modify: `src/styles/redesign/home.css`
- Create: `src/components/redesign/home/home-products.test.ts`
- Create: `public/redesign/home/ultimate-edition.png`
- Create: `public/redesign/home/infinitetalk.png`
- Create: `public/redesign/home/ai-voice.png`
- Create: `public/redesign/home/lumi-os.png`
- Create: `public/redesign/home/faceswap-studio.png`

- [ ] **Step 1: Write the failing product contract test**

Create tests for the exact five-record order, first-record default, media paths, public detail links, and no timer marker:

```ts
import { describe, expect, it } from "vitest";
import { HOME_PRODUCTS } from "@/lib/redesign/home/home-products";

describe("homepage product candidate", () => {
  it("keeps the approved five-product order and local media", () => {
    expect(HOME_PRODUCTS.map((product) => product.id)).toEqual([
      "ultimate-edition",
      "infinitetalk",
      "ai-voice",
      "lumi-os",
      "faceswap-studio",
    ]);
    expect(HOME_PRODUCTS).toHaveLength(5);
    expect(HOME_PRODUCTS.every((product) => product.mediaSrc.startsWith("/redesign/home/"))).toBe(true);
    expect(HOME_PRODUCTS.every((product) => product.mediaWidth === 1672 && product.mediaHeight === 941)).toBe(true);
  });
});
```

- [ ] **Step 2: Run RED**

Run:

```text
rtk npx vitest run src/components/redesign/home/home-products.test.ts
```

Expected: failure because `HOME_PRODUCTS` does not exist yet. Do not proceed if the test fails for a typo or invalid mock.

- [ ] **Step 3: Copy only approved local media**

Create `public/redesign/home` and copy the five frozen Phase 1A assets without network access:

```text
rtk proxy --% powershell -NoProfile -Command "New-Item -ItemType Directory -Force -Path 'public/redesign/home' | Out-Null; Copy-Item -LiteralPath 'docs/enhe-redesign/phase-1a/prototype/assets/product-media/ultimate-edition.png','docs/enhe-redesign/phase-1a/prototype/assets/product-media/infinitetalk.png','docs/enhe-redesign/phase-1a/prototype/assets/product-media/ai-voice.png','docs/enhe-redesign/phase-1a/prototype/assets/product-media/lumi-os.png','docs/enhe-redesign/phase-1a/prototype/assets/product-media/faceswap-studio.png' -Destination 'public/redesign/home'"
```

Verify each copied file exists and has the SHA-256 recorded in `prototype/assets/product-media-manifest.json`. Do not copy delivery files or private URLs.

- [ ] **Step 4: Add typed product data**

Define one `HomeProduct` type and five records in the approved order. Use the exact Phase 1A factual descriptions, approved alt text, 1672×941 dimensions, local media paths, and existing public product detail links from the approved prototype. Keep locale-specific names and descriptions in the same record shape.

- [ ] **Step 5: Implement the manual product client island**

Implement `EnheRedesignProductShowcase` with `"use client"`, `useState(0)`, `moveProduct(delta)`, modulo wraparound, previous/next buttons, counter text, one visible `article`, 16:9 media, `onError` fallback, and ArrowLeft/ArrowRight handling on a focusable stage. Do not add `setInterval`, autoplay, audio playback, third-party carousel code, database calls, or delivery URLs.

- [ ] **Step 6: Add responsive product styles**

Add a fixed aspect-ratio stage, desktop side controls, mobile controls below the stage, readable product plate and fallback, 44px controls, and no root overflow at 390px. Use only opacity/transform for product transition.

- [ ] **Step 7: Run product GREEN checks**

Run:

```text
rtk npx vitest run src/components/redesign/home/home-products.test.ts
rtk git diff --check
```

Expected: all product assertions pass; confirm the component source contains no automatic timer or forbidden delivery field.

- [ ] **Step 8: Create the second exact commit**

Stage only the product data, component, focused test, CSS, and five approved PNGs:

```text
rtk git add src/lib/redesign/home/home-products.ts src/components/redesign/home/EnheRedesignProductShowcase.tsx src/components/redesign/home/home-products.test.ts src/styles/redesign/home.css public/redesign/home/ultimate-edition.png public/redesign/home/infinitetalk.png public/redesign/home/ai-voice.png public/redesign/home/lumi-os.png public/redesign/home/faceswap-studio.png
rtk git commit -m "feat(home): add manual five-product showcase candidate"
```

Verify the exact commit with `rtk git show --stat --oneline HEAD`.

## Task 3: Accessible experience review carousel

**Files:**

- Create: `src/lib/redesign/home/home-reviews.ts`
- Create: `src/components/redesign/home/EnheRedesignExperienceReviews.tsx`
- Modify: `src/styles/redesign/home.css`
- Create: `src/components/redesign/home/home-reviews.test.ts`
- Create: `public/redesign/home/avatar-1.svg`
- Create: `public/redesign/home/avatar-2.svg`
- Create: `public/redesign/home/avatar-3.svg`
- Create: `public/redesign/home/avatar-4.svg`
- Create: `public/redesign/home/avatar-5.svg`

- [ ] **Step 1: Write the failing review and timing test**

Create a test for count, product associations, star bounds, example labels, and timer constants:

```ts
import { describe, expect, it } from "vitest";
import { HOME_REVIEWS, REVIEW_AUTO_INTERVAL_MS, REVIEW_MANUAL_RESUME_MS } from "@/lib/redesign/home/home-reviews";

describe("homepage experience review candidate", () => {
  it("keeps five labeled example records and approved timings", () => {
    expect(HOME_REVIEWS).toHaveLength(5);
    expect(HOME_REVIEWS.map((review) => review.productId)).toEqual([
      "ultimate-edition",
      "infinitetalk",
      "ai-voice",
      "lumi-os",
      "faceswap-studio",
    ]);
    expect(HOME_REVIEWS.every((review) => review.stars === 4 || review.stars === 5)).toBe(true);
    expect(HOME_REVIEWS.every((review) => review.exampleLabel.length > 0)).toBe(true);
    expect(REVIEW_AUTO_INTERVAL_MS).toBe(5000);
    expect(REVIEW_MANUAL_RESUME_MS).toBe(6000);
  });
});
```

- [ ] **Step 2: Run RED**

Run:

```text
rtk npx vitest run src/components/redesign/home/home-reviews.test.ts
```

Expected: failure because the review module and timing constants do not exist yet.

- [ ] **Step 3: Copy approved illustrative avatars**

Copy only the five approved local SVG avatars into `public/redesign/home`. Verify that each is local, contains no external URL, and has no real personal information.

- [ ] **Step 4: Add typed review data**

Create five records from the approved prototype, preserving exact quote text, names, product associations, 4/5 star values, avatar paths, and descriptive alt text. Use `示例体验反馈` for Chinese and `Example experience feedback` for English.

- [ ] **Step 5: Implement the review client island**

Implement state with the approved middle starting index, manual previous/next controls, CSS side-fade classes, and a single effect that manages interval and resume timeout. Read `matchMedia('(prefers-reduced-motion: reduce)')`; do not start an automatic interval when matched. Stop the interval for hover, focus, pointer, hidden document, and manual interaction. Clear interval, timeout, and media-query listeners on cleanup. Keep all five semantic articles in the DOM and do not emit review structured data.

- [ ] **Step 6: Add responsive review styles**

Add the centered-card layout, side fade, mobile readable card, visible stars, avatar sizing, 44px controls, and reduced-motion transition override. Keep important text in the DOM and avoid continuous translate animation.

- [ ] **Step 7: Run GREEN and source-boundary checks**

Run:

```text
rtk npx vitest run src/components/redesign/home/home-reviews.test.ts
rtk git diff --check
```

Expected: review data and timing assertions pass. Confirm there is no `AggregateRating`, `Review` JSON-LD, verified-purchase claim, third-party carousel dependency, or missing cleanup path.

- [ ] **Step 8: Create the third exact commit**

Stage only review data, component, focused test, CSS, and five avatar SVGs:

```text
rtk git add src/lib/redesign/home/home-reviews.ts src/components/redesign/home/EnheRedesignExperienceReviews.tsx src/components/redesign/home/home-reviews.test.ts src/styles/redesign/home.css public/redesign/home/avatar-1.svg public/redesign/home/avatar-2.svg public/redesign/home/avatar-3.svg public/redesign/home/avatar-4.svg public/redesign/home/avatar-5.svg
rtk git commit -m "feat(home): add accessible experience review carousel candidate"
```

Verify the exact commit with `rtk git show --stat --oneline HEAD`.

## Task 4: Bilingual Home composition and Preview regression

**Files:**

- Create: `src/components/redesign/home/EnheRedesignBrandValue.tsx`
- Create: `src/components/redesign/home/EnheRedesignHome.tsx`
- Create: `src/app/redesign-preview/home/page.tsx`
- Create: `src/app/redesign-preview/home/layout.tsx`
- Create: `src/components/redesign/home/home-preview-regression.test.ts`
- Create or modify: `src/styles/redesign/home.css`
- Modify only if required: `src/components/redesign/enhe-redesign-header.tsx`

- [ ] **Step 1: Write the failing bilingual Preview regression**

Create source-contract tests that assert the new route, guarded production path, metadata, locale query parsing, exact locale propagation, and absence of production route mutations:

```ts
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(process.cwd(), "src");
const read = (relativePath: string) => {
  const path = join(root, relativePath);
  return existsSync(path) ? readFileSync(path, "utf8") : "";
};

describe("bilingual homepage candidate Preview", () => {
  it("defines the guarded route and one-locale shell propagation", () => {
    const page = read("app/redesign-preview/home/page.tsx");
    const layout = read("app/redesign-preview/home/layout.tsx");
    expect(page).toContain("searchParams");
    expect(page).toContain("locale");
    expect(page).toContain("notFound");
    expect(page).toContain("EnheRedesignHeader");
    expect(page).toContain("EnheRedesignHome");
    expect(page).toContain("EnheRedesignFooter");
    expect(layout).toContain("index: false");
    expect(layout).toContain("follow: false");
    expect(layout).toContain("noarchive: true");
    expect(layout).toContain("noimageindex: true");
  });
});
```

- [ ] **Step 2: Run RED**

Run:

```text
rtk npx vitest run src/components/redesign/home/home-preview-regression.test.ts
```

Expected: failure because the home Preview route and composition do not exist.

- [ ] **Step 3: Add the brand-value block and page composition**

Implement the server components so the page order is Header → Hero → Product Showcase → Reviews → Brand Value → Footer. Use the shared `HOME_COPY[locale]` and `locale` for every child. Keep the candidate-only `LOCAL CANDIDATE` label outside `EnheRedesignHome` if a preview label is needed.

- [ ] **Step 4: Add the guarded route and locale links**

Implement `searchParams: Promise<{ locale?: string | string[] }>` in the page, resolve only `en` or `zh`, default invalid values to `zh`, call `notFound()` in production, set `lang={locale}` on the candidate root, and pass `/redesign-preview/home?locale=en` or `?locale=zh` as Header alternate links. Do not add a sitemap entry or production navigation item.

- [ ] **Step 5: Add Preview layout metadata**

Import only candidate tokens, shell CSS, and home CSS in the Preview layout. Set title and robots metadata with `index: false`, `follow: false`, `noarchive: true`, and `noimageindex: true`. Do not set a production canonical.

- [ ] **Step 6: Run GREEN and route-boundary checks**

Run:

```text
rtk npx vitest run src/components/redesign/home/home-preview-regression.test.ts
rtk npx vitest run src/components/redesign/home/home-copy.test.ts src/components/redesign/home/home-products.test.ts src/components/redesign/home/home-reviews.test.ts src/components/redesign/home/home-preview-regression.test.ts
rtk git diff --name-only -- src/app/root-layout-shared.tsx src/app/globals.css src/app/layout.tsx src/app/sitemap.ts src/app/robots.ts package.json package-lock.json prisma
```

Expected: focused candidate tests pass and the forbidden-path diff is empty.

- [ ] **Step 7: Create the fourth exact commit**

Stage only the bilingual composition, Preview route, candidate CSS, regression test, and any minimal Header compatibility change:

```text
rtk git add src/components/redesign/home/EnheRedesignBrandValue.tsx src/components/redesign/home/EnheRedesignHome.tsx src/app/redesign-preview/home/page.tsx src/app/redesign-preview/home/layout.tsx src/components/redesign/home/home-preview-regression.test.ts src/styles/redesign/home.css src/components/redesign/enhe-redesign-header.tsx
rtk git commit -m "test(home): add bilingual homepage candidate regression"
```

Verify the exact commit with `rtk git show --stat --oneline HEAD`.

## Task 5: Full verification, screenshots, report, and results ZIP

**Files:**

- Create or modify: `docs/enhe-redesign/phase-2a2/design.md`
- Create or modify: `docs/enhe-redesign/phase-2a2/implementation-plan.md`
- Create: `docs/enhe-redesign/phase-2a2/review-report.md`
- Create: `docs/enhe-redesign/phase-2a2/submission-checklist.md`
- Create: `docs/enhe-redesign/phase-2a2/allowed-paths.txt`
- Create: `docs/enhe-redesign/phase-2a2/screenshots/zh-home-candidate-1440.png`
- Create: `docs/enhe-redesign/phase-2a2/screenshots/zh-home-candidate-390.png`
- Create: `docs/enhe-redesign/phase-2a2/screenshots/en-home-candidate-1440.png`
- Create: `docs/enhe-redesign/phase-2a2/screenshots/en-home-candidate-390.png`

- [ ] **Step 1: Run fresh automated validation**

Run, in this order:

```text
rtk npm run lint
rtk npm run typecheck
rtk npx vitest run src/components/redesign/home/home-copy.test.ts src/components/redesign/home/home-products.test.ts src/components/redesign/home/home-reviews.test.ts src/components/redesign/home/home-preview-regression.test.ts src/components/redesign/public-shell-candidate.test.ts
rtk npm test
```

Record exact exit codes and counts. Do not claim PASS from a partial run.

- [ ] **Step 2: Run browser acceptance**

Start the Preview dev server on a free local port. Use Playwright to visit `/redesign-preview/home?locale=zh` and `/redesign-preview/home?locale=en` at 1440×900 and 390×844. Assert HTTP 200, one H1, exact locale copy, `/software` or `/en/software` CTA, five products, `01 / 05`, product wraparound, synchronized media and text, five reviews, example labels, stars, visible controls, no horizontal overflow, 44px controls, focus-visible ring, and no unexpected console/page errors. Verify review movement at 5000ms, manual resume at 6000ms, pause/continue, hidden-page pause, and reduced-motion no automatic timer. Verify the production guard with a production-mode route check returning 404 without changing production files.

- [ ] **Step 3: Capture and inspect four screenshots**

Capture fullPage screenshots using the exact names listed above. Use the actual query locale to render one language at a time. Open all four files with image inspection and confirm the complete homepage contains Header, Hero, product stage, reviews, value block, and Footer with no accidental mixed language or focus ring.

- [ ] **Step 4: Check Docker and Build honestly**

Run `rtk docker version` and `rtk docker info`. If the Linux Engine is available, create one temporary `postgres:16-alpine` container on a random localhost port, apply existing migrations without seed, run `rtk npm run build`, and always remove the container. If Docker is unavailable, do not use production DB, do not invent `DATABASE_URL`, do not alter rendering, and record `BUILD=OPEN_LOCAL_DOCKER_UNAVAILABLE` or the exact real build failure.

- [ ] **Step 5: Write the review report and checklist**

Record the exact five commit IDs and `git show --stat` output, RED/GREEN evidence, copy lock, product order/media hashes, review mapping, timing evidence, browser matrix, screenshot dimensions, Build status, forbidden-path checks, clean-worktree status, and explicit non-actions. The allowed-path file must list only the candidate source, tests, approved media, and `docs/enhe-redesign/phase-2a2/**`.

- [ ] **Step 6: Verify ZIP contents before commit**

Create `C:\Users\HU\Desktop\ENHE-Phase2A.2-Homepage-Candidate-Results.zip` with only `docs/enhe-redesign/phase-2a2/**`. Re-open the ZIP using `System.IO.Compression.ZipFile`, read every entry stream to EOF, verify no bad CRC, verify no source, node_modules, `.next`, `.env`, database, secret, private URL, or Git credential entry, and record file count and SHA-256.

- [ ] **Step 7: Create the fifth exact commit**

Stage only the Phase 2A.2 design/plan/report/checklist/allowed-path files and four screenshots:

```text
rtk git add docs/enhe-redesign/phase-2a2/design.md docs/enhe-redesign/phase-2a2/implementation-plan.md docs/enhe-redesign/phase-2a2/review-report.md docs/enhe-redesign/phase-2a2/submission-checklist.md docs/enhe-redesign/phase-2a2/allowed-paths.txt docs/enhe-redesign/phase-2a2/screenshots/zh-home-candidate-1440.png docs/enhe-redesign/phase-2a2/screenshots/zh-home-candidate-390.png docs/enhe-redesign/phase-2a2/screenshots/en-home-candidate-1440.png docs/enhe-redesign/phase-2a2/screenshots/en-home-candidate-390.png
rtk git commit -m "docs(home): record phase 2A.2 homepage candidate review"
```

Verify all five commits with:

```text
rtk git log --oneline -5
rtk git show --stat --oneline HEAD~4
rtk git show --stat --oneline HEAD~3
rtk git show --stat --oneline HEAD~2
rtk git show --stat --oneline HEAD~1
rtk git show --stat --oneline HEAD
```

- [ ] **Step 8: Verify final state before handoff**

Run `rtk git status --short --branch`, `rtk git diff --check`, the forbidden-path diff check, and the ZIP re-read/hash check again. Final status is `COMPLETE_WITH_BUILD_GATE_OPEN` only if focused tests, full tests, lint, typecheck, and visual checks pass while Build is genuinely blocked by local Docker/database availability. Otherwise report the actual failing gate.

## Final receipt fields

Record these fields in `review-report.md` with evidence:

```text
PHASE_2A_2_STATUS=
PHASE_2A_2_VISUAL_STATUS=
PHASE_2A_2_BUILD_STATUS=
HOMEPAGE_CANDIDATE_STATUS=
HOMEPAGE_CANDIDATE_MERGE_STATUS=
WORKTREE_PATH=
BRANCH=
START_HEAD=878a4bb
HERO_COMMIT=
PRODUCT_SHOWCASE_COMMIT=
REVIEWS_COMMIT=
REGRESSION_TEST_COMMIT=
DOCS_COMMIT=
FINAL_HEAD=
HOME_CANDIDATE_RED_STATUS=
HOME_CANDIDATE_GREEN_STATUS=
LOCKED_COPY_MATCH=
CTA_ROUTES=
PRODUCT_COUNT=5
PRODUCT_ORDER_MATCH=
PRODUCT_AUTO_ROTATION=NO
REVIEW_COUNT=5
REVIEW_LABEL=
REVIEW_AUTO_INTERVAL_MS=5000
REVIEW_MANUAL_RESUME_MS=6000
REDUCED_MOTION_AUTO_TIMER=NO
HERO_TESTS=
PRODUCT_SHOWCASE_TESTS=
REVIEWS_TESTS=
REDUCED_MOTION_TESTS=
PREVIEW_TESTS=
FULL_TESTS=
BUILD=
PREVIEW_DEV_HTTP_STATUS=200
PREVIEW_PRODUCTION_EXPECTED_STATUS=404
PREVIEW_NOINDEX=YES
PREVIEW_NOFOLLOW=YES
PREVIEW_IN_SITEMAP=NO
SCREENSHOT_COUNT=4
SCREENSHOT_WIDTHS=
ROOT_LAYOUT_CHANGED=NO
GLOBALS_CSS_CHANGED=NO
PRODUCTION_HOME_CHANGED=NO
PRODUCTION_NAVIGATION_CHANGED=NO
PRODUCTION_SITEMAP_CHANGED=NO
R008_CHANGED=NO
PACKAGE_CHANGED=NO
LOCKFILE_CHANGED=NO
PRISMA_CHANGED=NO
WORKTREE_CLEAN=
UNAUTHORIZED_PATHS=
PUSHED=NO
RESULT_ZIP_PATH=C:\Users\HU\Desktop\ENHE-Phase2A.2-Homepage-Candidate-Results.zip
RESULT_ZIP_SIZE=
RESULT_ZIP_SHA256=
RESULT_ZIP_FILE_COUNT=
ZIP_BAD_CRC=
```

## Plan self-review

- Scope coverage: hero, exact copy, product order/media/fallback/manual controls, review content/timers/reduced-motion/cleanup, bilingual guarded Preview, responsive/a11y/browser/build/ZIP gates, five required commits, and final receipt fields are each assigned above.
- Completeness check: every implementation step has concrete files, commands, expected evidence, status gates, and commit messages; no unfinished step remains.
- Type consistency: `RedesignLocale` is the existing `"zh" | "en"` type; `HOME_COPY`, `HOME_PRODUCTS`, and `HOME_REVIEWS` are the named data exports used by their stated consumers; timing constants are exported from `home-reviews.ts` and consumed by the review island tests.

## Execution receipt note

The implementation follows the required five-commit sequence. Because the no-amend boundary was preserved, small compatibility and regression corrections discovered during verification were included in the next still-required commit rather than rewriting history: the exact commit contents are recorded in `review-report.md`. The final documentation commit hash is supplied by the handoff after Git creates it.
