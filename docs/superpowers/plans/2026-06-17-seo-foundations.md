# SEO Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the site's technical SEO foundations without changing product behavior, then verify rendered metadata and structured data.

**Architecture:** Keep the current cookie-based bilingual experience, but harden SEO at the metadata, sitemap, structured-data, and shared-data caching layers. Cache public database reads with Next.js server caching, add reusable JSON-LD helpers, and normalize page-level metadata generation so canonical URLs, H1 coverage, and title/description templates stay consistent.

**Tech Stack:** Next.js 15 App Router, Prisma, Vitest, Playwright, JSON-LD

---

### Task 1: Technical SEO foundations
- [ ] Add failing tests for canonical coverage, public-page H1 usage, sitemap `lastModified`, and shared public-data caching.
- [ ] Implement metadata updates for public pages and normalize canonical generation.
- [ ] Add explicit H1 support for public top-level pages.
- [ ] Replace request-time sitemap `lastModified` values for static pages with stable route metadata.
- [ ] Cache shared public data reads with Next.js server caching.

### Task 2: Structured data
- [ ] Add failing tests for site-wide JSON-LD, breadcrumb JSON-LD, and tool detail schema coverage.
- [ ] Implement reusable JSON-LD helpers/components.
- [ ] Inject `WebSite` and `Organization` schema site-wide.
- [ ] Inject breadcrumb schema on public pages.
- [ ] Inject detail-page schema for software, services, and courses.

### Task 3: Title and description templates
- [ ] Add failing tests for title truncation and long tool-detail title handling.
- [ ] Implement reusable SEO title/description helpers.
- [ ] Apply the helpers to page metadata, with extra care for tool detail pages.

### Task 4: Verification
- [ ] Run focused Vitest coverage for the new SEO contracts.
- [ ] Run repo-wide `npm test`, `npm run lint`, and `npm run typecheck`.
- [ ] Use Playwright to inspect rendered meta tags, JSON-LD, sitemap, robots, and mobile layout.
