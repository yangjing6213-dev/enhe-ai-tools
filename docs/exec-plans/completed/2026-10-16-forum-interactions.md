# Forum topic interaction bar

Status: PASS (requested feature and release; legacy test exception recorded below)

## Contract

Replace the topic list and topic-detail interaction row with reply count, share, like count and account-synced bookmark, in that order. Follow the supplied dark rounded icon-button reference within the existing white site layout. Preserve reply-tree behavior, administrator topic deletion, mascot layers and existing content.

Share means sharing the canonical topic link using the native share sheet when supported, otherwise copying the link. A cancelled share is not successful. Logged-in accounts can contribute at most one successful share record per topic; guests can share without modifying the account count. Bookmark state belongs to the authenticated account and persists across devices. Do not fabricate counts.

Use the supplied TypeScript ClickSpark source with white line sparks: 8 sparks, size 14, radius 30, duration 500ms. Keep motion click-driven, nonblocking and idle when unused; disable sparks for reduced-motion settings. Retain keyboard labels, focus indicators, pending/error feedback and usable phone targets.

## Plan

1. Add minimal account bookmark/share storage, authorized actions, query fields and regression tests; validate an additive migration in a new dedicated local test database.
2. Add the shared interaction bar and the supplied click effect; verify share cancellation/fallbacks, bookmark/like state, reply navigation, administrator controls and reduced-motion behavior in a browser.
3. Independently review the diff; run focused tests, lint, typecheck, production build and local integration checks. Prepare a concrete release with migration/rollback evidence; confirm the production database change boundary before release if it is not covered by the user's authorization.

## Evidence

- Baseline branch: codex/enhe-mascot-production-20261016 at fff8428f2c18bdc39665e94216a09e4eca604aa9; deployed application baseline 4654e5dbcf18e05daa447444a7d91bcf2e96998e, with a documentation-only follow-up at branch HEAD.
- Existing forum supports likes and replies but has no bookmark/share models. User explicitly selected account-synced bookmarks.
- Backend, interaction UI and supplied ClickSpark adaptation are assigned independently; main thread owns integration, browser checks and release preparation.
- PASS: 103 focused unit/integration checks (including real local database concurrency/unique-key checks); full lint, typecheck, production build and complete dependency audit (zero vulnerabilities).
- PASS: 8 full-browser scenarios in development mode and the same 8 against the production build. Covered six language/viewport combinations, account bookmark synchronization/isolation, persisted likes, reduced motion, desktop clipboard sharing, guest sharing, mobile cancellation/success, and administrator topic deletion.
- PASS: additive migration applied successfully to a newly created local Docker test database. Only new bookmark/share tables, their indexes and foreign keys are introduced; no existing topic, reply or account rows are rewritten.
- Independent implementation/diff review found no blocking issues. No new dependencies.
- Additional legacy media browser case: FAIL before reaching its interaction assertions because its unchanged header-logo expectation is sizes=154px while the baseline header uses (max-width: 420px) 120px, 154px. This pre-existing assertion is recorded without changing the unrelated logo behavior. Directly affected interaction selectors in that test were updated; new interaction scenarios independently pass.
- User explicitly approved on 2026-10-17: back up first, add the two record tables, push and deploy. Application release 2503b2dce0d2018da303a67818cdb5a527e1cd74 was pushed and deployed after backup/rollback compatibility checks succeeded. The sole new migration 20261016120000_add_forum_bookmarks_shares applied successfully; all 57 migrations are up to date; app, worker and scheduler are healthy.
- PASS: live Chinese/English list and topic-detail pages at 390px and 1440px returned HTTP 200 with reply/share/like/bookmark in order, 44px targets on one row, correct reply anchors and guest login links. Guest copy feedback worked without account-writing actions or count changes; zero browser page errors.
- Account mutation and cross-context persistence checks used only the isolated local test database, removed after verification. Production checks were read-only apart from the explicitly approved additive migration and normal deployment workflow.
- No remaining feature/release work. This completion record is a documentation-only follow-up; the running application remains release 2503b2dc.
