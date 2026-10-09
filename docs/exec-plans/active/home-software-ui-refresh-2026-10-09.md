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
