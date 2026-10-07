# ENHE visual refresh and release plan

## Goal and locked design

Bring the public ENHE website closer to the supplied blue-energy reference while keeping its existing products, routes, SEO metadata, account flows, and commerce behavior intact. The home page uses a generated night-city image with blue, cyan, and magenta light trails; a readable white wordmark and navigation sit above it; four compact, factual benefit cards follow. Public content areas and cards use white backgrounds, dark text, and clear borders. The homepage hero and footer are intentional blue-background exceptions. The lower call-to-action uses a white background and blue emphasis.

Use 阿里妈妈方圆体 as the same Chinese and English site-wide family. Remove the magnifier glyph while retaining the search destination, add a Home destination, and place the language switch at the far right. Align login, AI Trends, and product detail with the same white-and-blue visual system without changing authentication, SEO, payment, or product behavior.

The testimonial carousel becomes “产品用户评价”, has no pause/play control, uses rounded left/right triangle controls, and continues its existing accessible automatic rotation. All five identities and portraits are fictional generated examples; show a clear bilingual disclosure that they are AI-generated illustrative content and not real customer reviews. Do not imply real customers or verified purchases.

Buttons and cards receive restrained hover/press/focus motion. Respect reduced-motion preferences. Use rounded icon strokes where icons are rendered. Keep keyboard access, contrast, responsive behavior, and existing bilingual support.

## Contract

- Work only in the clean clone `C:\Users\HU\Documents\New project 2\.worktrees\enhe-ui-refresh-20261007` on `codex/enhe-recovery-baseline`.
- Preserve the separate dirty worktree and do not read, stage, or alter its unrelated files.
- No `.env` edits, production database access or writes, schema/migration changes, content publication, or deploy until local implementation and every release gate pass.
- The user has explicitly requested the completed work be pushed to GitHub and deployed to Tencent Cloud. Use the repository's current release workflow and exact reviewed commit only if its gates pass; never skip a gate to force release.
- Keep changes within public-site navigation/shell, homepage, login, AI Trends, product detail, relevant tests, and newly required logo/font/visual assets plus this plan. Do not modify admin business behavior or commerce/auth semantics.
- Use the supplied ENHE logo image from `F:\官网相关资料\LOGO\logo 2.0\ChatGPT Image 2026年8月22日 20_37_00 (2).png`; verify its dimensions and transparency before adding it.

## Acceptance checks

1. Home header has Home, no magnifier glyph, and language switch last; both language routes keep equivalent navigation.
2. The hero uses the generated matching visual, has readable text, and is responsive. Four distinct benefit cards appear below it.
3. Home, login, AI Trends, product detail, and shared public shell use the selected rounded font and white/blue visual rules; existing route content, metadata, and user flows remain intact.
4. Review section names itself “产品用户评价”, labels synthetic material clearly, uses five generated fictional adult portraits, has only previous/next rounded triangle controls, and rotates automatically with accessible pause behavior for hover/focus/hidden/reduced-motion contexts. The lower call-to-action copy fits within two lines at desktop and mobile sizes.
5. Button/card motion includes hover, press, focus-visible, and reduced-motion handling. No contrast regression is introduced.
6. Focused tests run RED before implementation and GREEN after. Then run lint, typecheck, full tests, and production build. Run public-route/browser checks and inspect screenshots where the local tooling permits; mark any unavailable visual check `NOT_RUN`.
7. Before release, review full status/diff/path scope, secrets scan, dependency audit, current remote refs, exact branch/SHA, and the release script's backup/rollback/health gates. Push/deploy only the reviewed SHA if all checks pass.

## Execution sequence

1. Verify the clean clone, inspect current page wiring and release rules, install the lockfile dependencies, and record focused tests that fail for the required changes.
2. Verify official font download/license source; add approved logo, licensed font, generated hero artwork, and fictional portrait assets. Implement navigation, shared design tokens, home sections, login, AI Trends, and product detail with focused tests.
3. Run focused checks, lint, typecheck, full tests, build, and local visual/browser checks; fix only issues caused by this change. Review the diff and release gates, then push and deploy the exact validated commit when gates permit.

## Progress log

- 2026-10-07: Approved visual direction and font choice recorded. Clean clone at `83b764da75236aa57f134f5f12f74208db8685dc`; separate original worktree preserved untouched.
- 2026-10-07: TDD checks were added first; the initial run failed on the missing Home link, language order, old testimonial labels/controls, and absent visual rules. Implemented shared font/palette, generated and optimized hero/portrait assets, supplied logo, four home cards, updated login shell, and light-blue Trends/product-detail surfaces. The magnifier removal was extended to the mobile menu after a new failing test exposed it.
- 2026-10-07: Focused UI/copy/navigation tests pass (29 tests), and `npm run typecheck` passes. Full-suite, build, and browser/screenshot review remain.
- 2026-10-07: Updated legacy visual contracts to assert the approved white/blue palette, one rounded font, Home-first navigation, language-last placement, and redesigned auth shell. Fixed dark native select styling and aligned login/register primary buttons with the blue action style. The expanded focused suite passes (56 tests); full-suite and release gates remain.
- 2026-10-08: Finalized the shared public visual rules and corrected the DB-free “content preparing” actions so they follow the blue/white theme and receive the same keyboard and reduced-motion treatment. TDD reproduced the missing rule before the CSS change; focused tests then passed. Full suite: 518 files passed, 9 skipped; 2,612 tests passed, 90 skipped. Lint and typecheck passed. Production build completed and generated all 121 static pages; with local database variables intentionally unset, Prisma logged the expected database-free fallback errors while the build still completed. Browser review returned HTTP 200 with no page errors for home/login/AI Trends desktop, and home mobile; confirmed the rounded font, no magnifier glyph, blue primary actions, and two-line mobile CTA. Product-detail visual screenshot remains unavailable because this isolated clone has no local product record. Exact release gates and remote/server state remain pending.
