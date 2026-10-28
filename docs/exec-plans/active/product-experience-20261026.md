# Product experience release — 2026-10-26

## Scope and authorization

User explicitly requested implementation, push and production deployment of nine product/account improvements. This release starts from the currently deployed `a7df34d1fcfaf5d12b67af4684c6e03327274ea0`, preserving the latest workflows, recovery pages, homepage and forum changes. Worktree: `enhe-forum-titles-20261026`; branch: `codex/product-experience-20261026`. The unrelated dirty recovery worktree is excluded.

1. Align AI Skills with existing product trust, creator and purchase cards; make refund information independent of purchase state. Review badges must reflect actual stored review records, not assumed approval.
2. Add product QR/link sharing after changelog, footer homepage QR, requested button colors and focused account usability corrections. User clarified: hide the long URL on the page; copied URLs still use the existing site domain. No external shortening service or new domain.
3. Count first successful paid product orders once, preserve free acquisition behavior, verify both payment methods, run release checks, publish the exact reviewed tree, and verify production.

## Decisions

- No change to pricing, payment entitlement, refund conditions or unrelated UI.
- No historical order backfill or invented security approval.
- Product payment counts are cumulative successful purchases; repeated callbacks/downloads must not increment again. Refunds do not decrement this cumulative count.
- QR codes are generated using the already installed `qrcode.react`; no external QR service.
- No real money transfer during automated tests. Production configuration/gateway availability and local transaction tests are distinct from a completed customer payment.
- No database migration is expected. Preserve existing production data and unrelated backups/images.

## Work and evidence

- Product detail condition root causes: safety/creator restricted to software; refund card coupled to the purchase form.
- Root sharing tests: missing component failure reproduced; 13 sharing/footer tests pass after implementation.
- Account agent: recovery button affected by forced global text color; fixes scoped locally. AI Skills omitted from purchased products; auto payment showed a manual-proof warning.
- Payment agent: inspect callback, order reconciliation, manual approval and admin status transitions, including row-lock concurrency with a temporary local PostgreSQL database.
- Current logs: `D:/ENHE-Audits/2026-10-26/product-experience`.
- User confirmed the four published AI Skills are their products and have all been manually safety-reviewed. Exact slugs: `seo-geo-skill`, `ai-skill`, `a-skill`, `skill`. An audited, compare-before-update script will fill only missing creator/review fields using the existing SearchScope administrator as the creator reference.
- Live read-only gateway checks matched the latest successful WeChat and Alipay orders by merchant, order, amount and transaction. Alipay query returned the observed `alipay4` alias while callback/store used `alipay`; added this exact read-only response alias, retaining all matching checks.
- Independent review caught an administrator-confirmed first payment on a cancelled order not being counted. Added a failing regression, then corrected the allowed prior states; cancelled automatic callbacks remain rejected by the existing caller.
- Validation: 3,699 full-suite tests passed, 128 database/opt-in tests skipped; 18 dedicated local PostgreSQL concurrency tests passed separately. Dependency audit: zero vulnerabilities. Fresh and upgrade paths: 64 migrations, no drift. Lint, typecheck and production build pass; build contains no database connection errors. Targeted final checks: 32 passed.
- Account browser validation covers both languages, 320/390/1280 widths, recovery controls, keyboard focus and gold/white logout contrast. Page footer decoration is hidden only on user pages so it cannot obstruct account forms.

## Release checklist

- [x] Focused behavior and concurrency tests
- [x] Typecheck and lint
- [x] Dependency audit, migration drill and release shell checks
- [x] Original product/account full unit tests and production build
- [x] Product/account browser validation, desktop/mobile and Chinese/English; isolated retry of eight AI-news browser cases passed
- [x] Final AI-trends tests, lint/typecheck and production build after the added scope
- [x] Diff/scope review; remote exact-tree verification required before branch update
- [ ] Push and production deployment from the verified latest baseline
- [ ] Live feature/health checks and clear payment validation limits

## AI trends scope added by the user

- Rechecked the 2026-06-19 briefing and 2026-06-30 video specifications. Preserve the indexable evergreen topic page, existing `/daily` URLs, `noindex,follow` archives, source evidence, and signed-in full-report access.
- Prepared the 2026-10-28 issue using ten official sources verified on 2026-10-27. Only the October 26 GitHub project update is within the stated seven-day window; older material retains original publication dates and is described as background. No measured market-demand or revenue claims are made.
- The user reviewed and approved this specific report and its nine-second video on 2026-10-28. Approval covers publication alongside the product/account release. Preview: `D:/ENHE-Audits/2026-10-26/product-experience/ai-trends-20261027/review.html`.
- Rendered the new 1920x1080 H.264 video successfully in an isolated Linux container, 998,087 bytes. Poster visually inspected. Report/video dry-run validation passed with ten sources and six directions; no database writes occurred during validation.
- Removed unsupported numeric score display and ordering. Preserve editorial order. English views must not manufacture conclusions when a Chinese report has no English translation.
- Updated weekly wording and publication fallback so failed rendering cannot reuse a prior issue's video. Dry runs now skip database-engine teardown entirely.
- Created active Codex weekly preparation task `ai-2`, Mondays at 09:00 Asia/Shanghai. It prepares source-backed report/video drafts and requests human review, as required by the user's AGENTS.md; it does not autonomously publish, deploy or email. Local files require the desktop host/application to be running.
- Current server and GitHub release branch were rechecked at `a7df34d1fcfaf5d12b67af4684c6e03327274ea0`; the server checkout is clean and the application is running that image.
- Windows Application Control currently blocks native compiler/test libraries. Do not disable the policy. Linux isolated validation is used instead; this is a local verification limitation, not an observed production failure. The latest host lint and typecheck passed. The final complete-source Linux build passed (exit 0), including lint, typecheck, 100/100 static pages and build traces, with no database connection errors. The API upload routes and existing workflow, Skill, bilingual trend and recovery routes are present. All 3,585 Git source files match the build snapshot on both host and container (zero changed or missing files); snapshot SHA256: 603ee40fc900db887c43e889577ca01f39aa99d0229aa90f41132e145304fdad. An earlier incomplete snapshot result was superseded and was not used for release. Forty trend tests passed in the combined run; the five human-copy tests then passed independently after an initial import timeout under concurrent build load, without changing assertions or time limits.
