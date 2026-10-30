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

## Production acceptance follow-up

- Initial release `055b13e44125bee48fc40c299befbf4a541f0dfa` deployed successfully with matching Git tree `538c11c98e6e02939e75bb7996358c63790c48dc`; all runtime health checks passed. Applied only the four user-confirmed Skill creator/review records. Both existing WeChat and Alipay orders pass the deployed read-only gateway query; no new payment was made.
- Live acceptance found a pre-existing publication edge case: a reviewed draft carried `publishedAt: null`, which was preserved even with published status. The approved new report was saved but excluded from public reads. Only this issue's missing timestamp was repaired after exact id/title/body/status checks; the approved HTML/video were unchanged, and prior reports were preserved. The shared validator now supplies the current time for a published record with an empty date; drafts remain undated. A failing regression preceded the fix.
- The dedicated Chinese/English AI Prompt Management workbench bypasses the generic product-detail page. Added the existing sharing component after its FAQ; this free workbench has no changelog or paid refund promise. Two real-rendering regressions preceded this four-line integration.
- Follow-up verification: 32 targeted tests, complete lint and typecheck pass. The final deployment builds the exact follow-up Git tree before switching the running application. Existing broader validation is retained for unchanged code.
- Public follow-up checks confirmed the new report, source/date labels, archive access and login boundaries. Both languages played the approved video beyond one second without a media error. Remaining final-release acceptance and deployed identity are recorded in `D:/ENHE-Audits/2026-10-26/product-experience/release-receipt-20261028.json`; consult that receipt before considering another release.
- Final phone screenshots exposed footer artwork overlapping the newly added workbench sharing controls. Reserve bottom space only on this new sharing wrapper (240px on small screens, 320px from the medium breakpoint) so the existing mascot retains its placement and motion. No other page styles or functions change. The final release receipt records the before/after browser geometry and final deployment.

## Release-gate recheck — 2026-10-30

- The first exact-ref release run stopped at full E2E with 17 failures; no push or deployment occurred.
- Reproduced and corrected stale card-motion expectations: top-level cards must remain static under the existing approved UI rule, while nested cards still glow. Reduced-motion and touch cases continue to be covered.
- Made the homepage keyboard test pause the review carousel and capture its initial quote only after focus is confirmed; this removes a race with the 3-second automatic rotation.
- The mobile-nav close test now verifies the actual captured exit animation (duration/easing/properties) instead of checking a transient drawer attribute after its exit animation can already have unmounted it.
- The shared-shell viewport matrix now loads each route once and resizes the same page through its viewport list, avoiding nine redundant server navigations per route while checking live responsive behavior.
- Targeted rechecks: 16 passed, 1 intentionally skipped across the card-motion, language-switch, and AI News contrast files; homepage + three mobile drawer widths passed; both Chinese and English AI News topic routes passed the nine-width matrix.
- The release script must still run its complete E2E suite and all other exact-ref checks before any push or deployment.
- The next complete E2E run finished with 423 passed, 194 database/opt-in skips, and five test timeouts; the release script correctly stopped without pushing or deploying. The failures were in test execution: the homepage check reloaded the same page six times, the drawer test waited past a short overlay animation, two topic-shell matrices exceeded their default 30-second budget under load, and a 30-round navigation stress test exceeded its default budget.
- Adjusted those checks only: the homepage now loads once before viewport changes, the duplicate close event is sent in the same browser event cycle, and the three high-cost cases have a 90-second budget without reducing their assertions or round counts.
- Focused production-build recheck of all affected cases: 7 passed, including the 30-round navigation test and all four Chinese/English topic-shell viewport matrices. Full exact-ref release validation is still required.

## User scope extension — 2026-10-30

The user added five items to the next combined release: rename only the topic-level reply control to “评论” (keep nested reply labels), halve the footer dinosaur artwork, make login placeholders readable in dark mode, let administrators enable/disable and edit the entry popup title/body/ending, and add the supplied Gradient Waves effect above the footer. The existing page layouts and unrelated controls stay unchanged.

Acceptance checks: focused forum/auth/footer/announcement tests; admin save path requires server-side admin authorization and audit logging; public popup reflects saved bilingual settings and reappears after a new revision; wave animation remains decorative, responsive, and respects reduced-motion/browser capability. Status: implementation and local acceptance checks pass; exact release script and deployment remain pending.

### Implementation and evidence

- Forum topic detail: only the top-level form now says “评论” / “Comment”; nested reply forms keep “回复” / “Reply”. Focused rendering assertions verify all three labels.
- Footer dinosaur: desktop size/offset changed from 396px/48px to 198px/24px; mobile maximum size and offset are halved. Existing motion and placement are unchanged.
- Mobile dark theme: auth placeholder text uses the site’s muted text color instead of hardcoded black. Browser check sets the real saved `theme=dark` preference before navigation so hydration cannot reset the test to light mode.
- Entry notice: editable Chinese and English title/body/ending plus an enable switch live in Admin → 网站设置. Saves require server-side admin authentication, validate length/content, increment a display revision, write the existing `site_settings` row, log an admin audit record, and refresh public settings. No schema change. Browser dismissal remains per browser and an edited revision is shown again.
- Footer Gradient Waves: integrated the supplied component and settings above the footer; uses a responsive 240px desktop / 180px mobile region, medium quality, DPR 1, and the effect’s existing visibility/reduced-motion handling. A fallback gradient remains if WebGL is unavailable. The region is decorative and does not cover footer controls. Added the upstream MIT + Commons Clause notice and source attribution.
- Focused unit tests: 6 files, 22 tests pass, including admin authorization, saved bilingual values, revision increment, disabled state, and audit logging.
- Full unit suite on the exact source snapshot: 657 files passed, 13 skipped; 3,731 tests passed, 128 skipped (database/opt-in cases).
- `npm run lint`: PASS. `npm run typecheck`: PASS. `npm run build`: PASS; all 100 static pages generated, and the output had no database-connection warning.
- Browser acceptance: 13 focused mobile/auth/popup/wave checks passed; the isolated read-only Admin settings visual fixture passed at 7 viewport widths and confirmed the six editable fields and enable switch are visible. The user-facing popup was checked in Chinese and English; the footer effect produced its canvas in Chromium.
- The full browser suite has not yet completed against the final commit. The release script will perform its own exact-ref audit and full browser run before allowing the push/deployment.
