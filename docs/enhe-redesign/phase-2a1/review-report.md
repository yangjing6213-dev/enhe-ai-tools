# ENHE Phase 2A.1 public shell candidate review

## Scope

- Worktree: `C:\Users\HU\Documents\New project 2\.worktrees\enhe-public-shell-candidate-v1`
- Branch: `codex/enhe-public-shell-candidate-v1`
- Base: `1b3df7c706c5b7f9d8c8a844787da5708e702683`
- Preview route: `/redesign-preview/shell`
- Old private-folder route: `/__redesign-preview/shell`

The candidate remains isolated. Production header, footer, root layout, globals, sitemap, robots, package files, lockfiles, Prisma, Heartbeat, and R-008 files were not changed.

## Receipt

```text
ROUTE_SOURCE_ADDED=YES
PREVIEW_ROUTE_DEV_ONLY=YES
PREVIEW_DEV_HTTP_STATUS=200
PREVIEW_PRODUCTION_EXPECTED_STATUS=404
PRODUCTION_PUBLIC_ROUTE_EXPOSED=NO
PRODUCTION_NAVIGATION_CHANGED=NO
PRODUCTION_SITEMAP_CHANGED=NO
PRODUCTION_EXISTING_ROUTES_REPLACED=NO
PHASE_2A_1_STATUS=COMPLETE_WITH_BUILD_GATE_OPEN
PUBLIC_SHELL_CANDIDATE_STATUS=READY_FOR_VISUAL_REVIEW
PUBLIC_SHELL_MERGE_STATUS=BLOCKED_BY_HEARTBEAT_R008_AND_BUILD
```

The production 404 is source-verified through the `NODE_ENV === "production"` `notFound()` guard; a production HTTP request was not claimed because the production build could not finish without the database gate.

## Route and indexing verification

- Dev HTTP `/redesign-preview/shell`: `200`.
- Dev HTTP `/__redesign-preview/shell`: `404`.
- Preview HTML robots metadata: `noindex, nofollow, noarchive, noimageindex`.
- Preview metadata has no canonical, hreflang, Open Graph, or structured-data entry.
- Sitemap source contains no redesign preview route.
- Candidate navigation source contains no redesign preview link.
- Preview source contains no `File.fileUrl`, `File.filePath`, order, payment, download, secret, or Git data.

## Browser and visual verification

Playwright verification used the local dev route. The Next development indicator was removed from the captured DOM only; no application source was changed.

- Mobile menu opens with `aria-expanded=true`, locks body scrolling, and moves focus into the drawer.
- Escape closes the drawer and returns focus to the trigger.
- Overlay close works.
- 390px and 720px narrow-viewport checks had no horizontal overflow.
- Reduced-motion emulation was enabled.
- Chinese and English specimen captures were inspected at desktop and mobile widths.

The English captures focus the English administrator header specimen. The preview page currently mounts the shared Chinese footer specimen once; the footer component has an independent English column definition, but an English-footer browser capture is not represented by these page screenshots.

Screenshots:

- `screenshots/zh-shell-1440.png`
- `screenshots/zh-shell-390.png`
- `screenshots/en-shell-1440.png`
- `screenshots/en-shell-390.png`

## Validation

```text
npm run lint: PASS
npm run typecheck: PASS
npm test -- candidate: PASS (7 tests)
npm test -- full: PASS (437 files passed, 9 PostgreSQL files skipped; 2100 tests passed, 90 skipped)
runtime-heartbeat focused test: PASS (6 tests)
```

`npm run build` compiled successfully and completed lint/type checking, then failed during static page generation because `DATABASE_URL` is unavailable. Docker is also unavailable (`dockerDesktopLinuxEngine` daemon not found). No production database, deployment, or secret configuration was changed.

## Merge gate

This candidate is ready for visual review only. Merge remains blocked by the separately tracked Heartbeat/R-008 gate and the unavailable production build/database gate.
