# Home and Software UI Refresh — 2026-10-09

## Approved direction

- Use the approved homepage headline: `懂你的AI一站式平台，你需要的，都在这里。`
- Preserve the existing white canvas, blue accent, responsive layout, and software-card animation.
- Use the supplied Iconfont collection (`cid=22664`) for the homepage feature and navigation-arrow icons; keep icon paths local so the site does not depend on a third-party runtime request.
- Replace the footer text lockup with the supplied wordmark rendered in black, and keep footer groups collapsed initially.
- Keep the disclosure that carousel portraits and quotes are AI-generated and are not real customer feedback. It must remain readable to visitors.
- Limit divider cleanup to decorative public-site rules; preserve form boundaries, focus indicators, and necessary control outlines.

## Scope

1. Update bilingual homepage hero, product section, and review copy; make the brand line blue without a badge; center the product section heading; retain an accessible review pause control and hover pause/resume while changing the interval from five to 2.5 seconds.
2. Replace the four homepage feature icons and product carousel/link arrows with icons from the supplied collection. Remove visible decorative separators in the public marketing shell and product-card interiors without removing card boundaries or keyboard focus indicators.
3. Replace footer text branding with the supplied black logo, bold footer group headings, remove the software page's redundant `AI工具` H1, size its eyebrow to match `全部产品`, and align software cards with the AI Skills card structure. Keep their existing hover/motion behavior and use fixed card heights with square corners.
4. Add/update focused regression tests before implementation; run focused tests, lint, typecheck, build, and applicable browser checks. Review the final diff, commit, push the approved branch, deploy using the repository release workflow, and verify the live site.

## Exclusions and constraints

- Do not change payment behavior, admin pages, unrelated content pages, product data, or the existing software-card animation.
- Do not hide or recolor the AI-generated review disclosure to make it disappear on the white background.
- Do not copy user work from the separate dirty recovery worktree.

## Verification record

- Baseline: isolated branch `codex/home-software-ui-refresh-20261009`, clean at `c067e708f2857c650b71b4cfbfd49592735e5c85`.
- Focused tests: PASS (70 tests); responsive/customer-support targeting regression tests: PASS (31 tests).
- Full Vitest suite: PASS (2,687 passed, 97 skipped).
- `npm run lint`: PASS. `npm run typecheck`: PASS after stopping the local preview server, which had held Prisma's Windows engine file open.
- Browser check against the local production homepage route: PASS for the approved headline, removed header separator, and transparent side review cards. Software preview check: PASS (19 cards, 3-column desktop grid, fixed 751px cards, square corners).
- `git diff --check`: PASS; Git reports only expected LF/CRLF conversion notices.
- Browser acceptance review found stale checks for the previous hero text, logo label background, review title, and primary button text; updated those expectations to the approved design. Contrast scanning also found the small blue logo label needed a darker Radix blue for readable white-background text.
- Current commit's full release workflow is run through `scripts/push-and-deploy.ps1`, which repeats audit, migration checks, tests, typecheck, lint, build, browser checks, push, and deployment.

## Follow-up — 2026-10-10

Approved scope: swap the shared header/footer logo sources without changing their CSS dimensions; double the recommendation eyebrow to 2rem and match review-heading typography; keep footer chevrons 8px from their headings; use AI Skill-style software card content and square, flush-top covers while preserving hover/rail motion.

Implementation: reuse the existing localized summary/highlight helpers and actual catalog prices/counts. Show secondary English names on Chinese cards, value summary, capability list, category audience, price/delivery, and localized detail action. Do not invent supported-agent badges or metrics. Keep the 751px standard footprint and allow growth with user-enlarged root text. Align the development preview with the production style sheet and contain bilingual navigation on narrow screens.

Verification before commit:
- PASS: 162 targeted component/catalog/unit checks.
- PASS: homepage browser acceptance across six viewport widths; 12 bilingual software preview checks, including 320–1440px layouts, square corners, zero cover gap, all card actions contained, hover transform, keyboard focus and enlarged text.
- PASS: TypeScript, full ESLint, diff whitespace check; source Gitleaks scan (no findings).
- Screenshots reviewed locally under ignored `output/ui-followup/`.
- Release: use the existing protected `scripts/push-and-deploy.ps1` workflow for the exact committed SHA. Full release checks and live verification are recorded in local release receipts.

## Header search follow-up — 2026-10-10

Approved scope: remove the shared tagline, swap the existing logo sources again without changing image dimensions, use black account/language outlines and 4px public button corners, and replace the navigation Search link with an inline search field. Keep the field in the shared header so search remains reachable on every public route. Desktop places it between the logo and navigation; narrow layouts give it its own row.

Recommendations read only published software/AI Skill products with nonzero download counts, ordered by actual downloads descending with a stable ID tie-breaker, limited to five and cached for five minutes. Public names, categories, counts and canonical localized links are the only browser data. An unavailable read leaves a usable search form and an honest empty message. Reuse the existing search route. No schema, payment, product-data, environment or dependency changes.

Use official shadcn Input/Popover source with the existing local utility and Radix dependency; retain MIT attribution. Verify keyboard navigation, Escape, outside click, product links, bilingual queries, logo sizes, black outlines, button shape and 320–1440px layouts.

Local checks before release: 53 focused tests passed; bilingual header checks at six viewport widths and the existing homepage interaction suite passed; fixture recommendation links, keyboard navigation and dismissal passed. TypeScript, full ESLint and source secret scan passed. The full protected release workflow and production data/UI verification follow the commit.

Final local evidence (2026-10-10): 2691 unit tests passed, 97 skipped; TypeScript, full ESLint, production build, dependency audit (0 vulnerabilities), source/bundle secret scans, and focused header accessibility scan passed. Production browser run passed 327 tests and skipped 139 environment-gated tests; one obsolete seven-item mobile-nav expectation failed after the requested Search link removal. The expectation was corrected to six items and its exact browser test passed (1/1). No application change followed the successful build. Protected Docker-backed release checks and live deployment remain pending.

Local release blocker: Docker Desktop 4.86.0 could not initialize stale Windows runtime sockets. The official signed 4.94.0 installer completed an in-place upgrade. The persistent Docker data disk was backed up and verified byte-identical immediately after upgrade. The engine still cannot start because Windows refuses access to the old Secrets Engine socket; ordinary and administrator parent-directory rename attempts both failed. No factory reset, uninstall, data/volume deletion, or production change was performed. Next prerequisite is a user-controlled Windows restart, then engine verification and the existing exact-SHA release workflow. Detailed local recovery evidence is in ignored `.local-audit/docker-recovery-20261010.md`.


## Blue palette and product autoplay follow-up — 2026-10-10

Previous header release completed at 657e15517f937886e3918afc47c5fa653cc5edd4 after Docker recovery; GitHub and production matched. New approved scope: half-width desktop/tablet search (mobile remains full width), circular icon-only support launcher, #0D3A6D footer with white logo/text and centered combined copyright/filing links, #0462C2 UI blue accents and blue account/language controls, supplied homepage copy with bold value heading, and automatic featured-product rotation.

Preserve existing cover assets and 240ms directional transition. Rotate every six seconds only while visible; pause on hover, focus, explicit pause, hidden tab or reduced-motion preference. Keep manual arrows and keyboard switching, reset the interval after interaction, and silence automatic screen-reader announcements. Retain readable AI-example disclosure. No payments, credentials, schema, dependencies or product-data changes.

Validation: targeted browser checks cover responsive colors/controls and autoplay pause/resume; update existing changed UI expectations, inspect desktop/mobile screenshots, then use the protected release workflow and verify live colors, carousel and exact deployed SHA. Evidence goes in ignored .local-audit/blue-ui-* files.

Local verification for this follow-up: PASS, 2691 unit tests (97 environment-gated skips), production build including lint/type checks, responsive bilingual header/footer checks, product manual/automatic motion checks, and twelve public text-contrast scans. Initial failures were old design expectations and black text that no longer met contrast on the darker blue; updated relevant expectations and used white text on solid-blue actions, including shared account/admin controls. No admin or payment behavior changed. Source and final browser-bundle secret scans found no leaks. Desktop/mobile screenshots and the computed palette on six public routes were reviewed. The exact committed release must still pass the protected deployment runner and live checks; private receipts remain in .local-audit/blue-ui-*.
