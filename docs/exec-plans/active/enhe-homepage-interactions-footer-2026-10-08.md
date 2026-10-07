# ENHE homepage interaction and footer polish

## Contract

- Goal: implement the user's 2026-10-08 homepage/header/footer refinements and publish the verified result to the already approved GitHub branch and Tencent Cloud through the guarded release workflow.
- Work only in the clean isolated checkout `C:\Users\HU\Documents\New project 2\.worktrees\enhe-ui-refresh-20261007`, based on deployed `d794f4022083a5e23c776c41e3a1c8e2546c6e91`.
- Preserve login, product, search, language routing, testimonial disclosure and automatic rotation. Do not touch the separate dirty checkout, `.env`, production content/database directly, or deployment files outside the established workflow.
- Reuse the installed upstream Emil Kowalski design/animation skills; do not add a runtime UI dependency.

## Acceptance criteria

1. Homepage Chinese brand line reads “给你的人生添加AI外挂” below and aligned with the logo; the home hero has no background image and uses centered dark text and action.
2. The signed-in dropdown has readable dark text. Language and account controls share one visual shape and exchange their current positions. Desktop navigation spacing is visibly wider.
3. The four feature links have no horizontal or vertical divider lines.
4. The product showcase heading is about half its previous size and remains on one line at desktop widths. The “01 / 05” counter is gone. Product and review controls are unframed filled triangles, placed at the sides and vertically centered on their cards. Product detail links use a triangle icon.
5. Footer groups use accessible expandable disclosures on an AppSumo-like near-black green surface; a back-to-top control returns to the page header.
6. Public-site buttons have clear, restrained hover/press feedback, fine-pointer hover gating, keyboard focus styling, and reduced-motion support.
7. Existing route behavior remains intact. Focused tests, full project release gates, and local browser checks pass before the guarded exact-SHA push/deploy.

## Planned scope

- Homepage copy, header/footer components, home and shell visual styles, footer token, focused source/component tests, one DB-free browser acceptance spec, and this plan record.
- No authentication/data semantics, SEO metadata, content, schema, migration, dependency, or admin changes.

## Progress

- `verified`: clean release worktree and branch match deployed HEAD `d794f4022083a5e23c776c41e3a1c8e2546c6e91`; another checkout contains unrelated dirty changes and will remain untouched.
- `verified`: AppSumo reference and upstream `emilkowalski/skills` were checked. The relevant Emil design/motion skills are already installed in the active Codex skill environment.
- `verified`: acceptance tests were first run against the unchanged baseline and failed as expected; the focused component suite now passes 39 tests across 5 files.
- `verified`: database-free Chromium acceptance passed at 1440, 1024, 900, 768, 390, and 320 pixels, including layout overflow, brand alignment, account-menu contrast, arrow placement, product/review previous-next switching, footer disclosure, hover feedback, and back-to-top behavior.
- `verified`: independent code review found no P1/P2 blockers; its minor finding about missing review-arrow switching coverage was addressed with product and review previous-next assertions and a passing six-width browser rerun. The final test-only addendum review is pending.
- `verified`: the first full unit-suite run exposed two stale assertions that conflicted with the approved language/account order and filled-triangle icon. Updated those expectations; both affected suites now pass (11 tests). The complete release gate must be rerun against the final commit.
- `in_progress`: final test-only review, then complete project release checks and guarded exact-ref push/deploy.
- `pending`: guarded exact-ref GitHub push and Tencent Cloud deployment after every release gate passes.
