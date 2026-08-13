# ENHE Phase 2A.2 Homepage Candidate Design

## Status

- Approved visual baseline: `878a4bb`
- Candidate branch: `codex/enhe-public-shell-candidate-v1`
- Scope: isolated homepage candidate only
- Production homepage and public routes remain unchanged

## Goal

Build a candidate-only bilingual homepage preview with the approved hero copy, a manual five-product stage, five clearly labeled example experience reviews, the approved brand-value CTA, and the existing approved public shell.

## Architecture

The preview route is a server-rendered page at `/redesign-preview/home` with a validated `?locale=zh|en` query parameter. Invalid or missing values fall back to Chinese. Header, homepage, and footer receive the same resolved locale. The route remains guarded in production with `notFound()` and carries noindex, nofollow, noarchive, and noimageindex metadata.

Only two client islands are planned: the product stage for manual index changes and the review carousel for timer, visibility, reduced-motion, and interaction state. Copy and content remain static typed data; no database, API, context, File model, order, download, payment, OAuth, or production-home dependency is introduced.

## Candidate units

- `src/lib/redesign/home/home-copy.ts`: typed Chinese and English hero, section, CTA, and brand-value copy.
- `src/lib/redesign/home/home-products.ts`: the five approved products, fixed order, local media paths, factual descriptions, alt text, and existing public detail links.
- `src/lib/redesign/home/home-reviews.ts`: five approved example feedback records, names, product associations, avatar paths, alt text, stars, and example labels.
- `src/components/redesign/home/EnheRedesignHome.tsx`: server-side page composition.
- `src/components/redesign/home/EnheRedesignHero.tsx`: one H1, subtitle, and one locale-specific CTA.
- `src/components/redesign/home/EnheRedesignProductShowcase.tsx`: manual five-product stage, fixed 16:9 media, counter, controls, keyboard behavior, and fallback.
- `src/components/redesign/home/EnheRedesignExperienceReviews.tsx`: five-card example carousel, manual controls, 5000ms automatic interval, 6000ms manual resume, pause guards, cleanup, and reduced-motion behavior.
- `src/components/redesign/home/EnheRedesignBrandValue.tsx`: approved value statement and catalog CTA.
- `src/styles/redesign/home.css`: candidate-scoped homepage layout and responsive styles; global CSS remains untouched.
- `src/app/redesign-preview/home/page.tsx` and `layout.tsx`: guarded bilingual preview route.
- `public/redesign/home/**`: only copied approved local ENHE public media and approved illustrative avatar assets.

## Locked copy

### Chinese

- Label: `给人生加一个 AI 外挂`
- H1: `一站式AI平台`
- Subtitle: `发现真正好用的 AI 工具、智能体与实战方法，让工作更快、创作更自由，把每个灵感变成看得见的成果。`
- CTA: `开始探索AI` → `/software`
- Value: `让每一个普通人，都能借助 AI，创造过去做不到的事。`

### English

- Label: `An AI upgrade for everyday life`
- H1: `The All-in-One AI Platform.`
- Subtitle: `Find genuinely useful AI tools, agents, and practical methods to work faster, create more freely, and turn every spark into a visible result.`
- CTA: `Start exploring AI` → `/en/software`
- Value: `Let everyone use AI to create what once felt out of reach.`

## Product and review behavior

Products remain in the approved order: Ultimate Edition / 无所不能版, InfiniteTalk, AI Voice Generator / AI语音生成, LumiOS / Lumi-OS, and FaceSwap Studio. The first item is visible initially. Previous and next controls wrap through all five records and update the counter, name, description, media, alt text, and detail link from one index. Product switching never auto-rotates or plays audio. Media keeps its approved 1672×941 ratio and displays a readable fallback if loading fails.

Reviews render all five records in the DOM, open on the approved centered middle record, and retain neighboring records with side fade. Normal motion uses a 5000ms interval. A manual button, arrow-key, drag, or pointer interaction stops the interval and schedules a 6000ms resume. Hover, focus, pointer activity, and hidden-page state pause the timer. Reduced motion creates no automatic timer but retains manual controls. Every timer, timeout, and media-query listener is cleaned up on unmount.

Every review carries `示例体验反馈` or `Example experience feedback`, a 4- or 5-star display, an approved illustrative avatar alt, and one product association. No review structured data or verified-purchase claim is emitted.

## Visual and responsive rules

The page keeps the approved warm-white canvas, near-black type, sage-green action color, yellow brand label, generous TypeShare-style whitespace, and deep green footer. No blue-purple gradient, neon, glassmorphism, cursor effect, particle background, or continuous decorative animation is introduced.

Desktop uses a centered hero, a stable 16:9 product stage with side controls, a centered review card with fading neighbors, and a strong final value block. Below 768px the brand label moves above H1, the stage controls move below the media, reviews retain a readable primary card, and all controls remain at least 44px. The scoped stylesheet must keep the document root free of horizontal overflow at 390px.

## Verification contract

TDD starts with failing tests for exact bilingual copy and CTA routes, five-product order and manual wraparound, media synchronization and fallback, review count/content/timers/reduced-motion/cleanup, accessibility, and guarded Preview locale synchronization. The candidate test suite must show the expected RED before implementation and GREEN after each minimal implementation slice.

Fresh validation must include lint, typecheck, all candidate tests, the full test suite, and Playwright checks for both locale query states at 1440px and 390px. Browser checks cover the five product changes, review timing and controls, reduced motion, keyboard/focus-visible behavior, 44px targets, no horizontal overflow, complete full-page screenshots, and no unexpected console errors. Build status is reported honestly: if the local Docker Linux Engine is unavailable, no production database or fabricated `DATABASE_URL` is used and the phase remains build-gated.

## Scope gates

No changes are permitted to the production homepage, existing public routes, root layout, `globals.css`, sitemap, robots, canonical/hreflang, package or lockfiles, Prisma, Runtime Heartbeat, R-008, product details, downloads, orders, payments, OAuth, coupons, user center, admin, production environment, or remote. No push is performed.

## Actual compatibility notes

- The repository middleware already normalizes `?locale=zh|en` with a 308 redirect, removes the query, writes the locale cookie, and forwards `x-enhe-locale`. The preview page therefore resolves an explicit query first and uses that middleware header as the fallback; `src/middleware.ts` remains unchanged.
- The preview layout includes standalone `<html><body>` tags because this repository has no top-level `src/app/layout.tsx`. This keeps the isolated App Router preview valid without changing any production layout.
- The visual review passed after the browser matrix and production-guard checks. The candidate remains isolated and is not production-ready for merge while the separately gated Heartbeat/R-008 and scope review conditions remain open.
