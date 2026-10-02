# ENHE Recovery Master Backlog

Status: CONTROLLED_RECOVERY

## 2026-10-03 current verification checkpoint

- This local batch follows the owner-selected single shared masthead, keeping
  AI News/Topics as local navigation. Review found that an older global lead
  could appear on page 1 and again on its actual later page. A new regression
  reproduced it; page 1 now uses the configured lead only when that story is
  in the first-page results, otherwise it leads with the first current result.
  This preserves pagination and lets the older article appear once in its real
  page. Filtered results still lead with their first match, and later pages do
  not repeat the lead card or featured strip.
- The same review found that the admin visual test restricted its host only
  when script diagnostics were enabled. A shared guard now rejects missing,
  malformed, credential-bearing, and non-loopback base URLs before adding the
  fixture cookie. The parser returns a validated URL; Cookie setup and request
  checks use its normalized origin, so accepted URLs with trailing slashes or
  paths remain same-origin. Focused tests cover localhost, IPv4/IPv6 loopback,
  malformed URLs, credentials, and remote hosts (11 URL cases). The populated-
  detail browser matrix passed one test covering 9 record types across 7 widths
  (63 route/width visits). A hydration warning from the
  initial screenshot run was traced to Playwright's default transparent-caret
  mutation before React hydrated; using `caret: "initial"` produced no warning.
- Five focused AI News/admin fixture test files passed 60/60. Targeted ESLint
  and `npm run typecheck` passed. `npm run build` exited 0 and generated
  121/121 static pages with the three database URL variables empty. Prisma
  printed empty-URL validation messages while database-backed pages used their
  local fallback; no database connection occurred, so real content remains
  unverified.
- The live path set is 289 rows (145 tracked modified, 144 untracked, 0 staged),
  manifest SHA-256
  `c1375c01aff06649cc4b55a65d40931606770d3c30d386c322317b87dabea95b`.
- This is still `PARTIAL_LOCAL_ACCEPTANCE`: the release candidate is not
  selected; exact review of other path groups and independent receipt review
  remain open; full Vitest remains partial at the unchanged protected D4R
  worktree-scope assertion; `/admin/geo-monitoring` remains owner-deferred and
  untouched. No `.env`, database, staging, commit, push, Tencent Cloud, or
  publication operation occurred.

### 2026-10-03 AI News route and candidate verification follow-up

- The owner confirmed one shared site masthead with the Latest/Topics local
  navigation. Browser reproduction showed that `/ai-news` and `/en/ai-news`
  did not render that local navigation; both root and paginated list states now
  use `AiNewsWorkspaceShell`, and the public header receives the active route.
  The existing TypeShare contract still rejects duplicate account/language
  controls and extra mastheads. AI News, Topics, and deep-route browser checks
  passed 32/32 at database-free loopback URLs.
- The original full Vitest run reported 2,444 passed, 90 skipped, and 3 failed.
  Two failures were metadata tests whose mocked “configured database” mode did
  not isolate Prisma; hoisted DB mocks and local-only URL stubs now make those
  test assumptions explicit. Eight focused source suites passed 49/49, and the
  tightened reduced-motion contract passed 6/6. The full suite must be rerun
  after the exact candidate commit because its protected D4R scope assertion
  requires a clean worktree.
- Full ESLint and TypeScript checks passed. `npm run build` exited 0 and
  generated 121/121 pages with the three database URL variables empty; Prisma
  printed expected empty-URL validation messages, so live database content is
  still unverified. Independent review found no unresolved finding in the
  current UI/test slice.
- The isolated candidate branch is `codex/enhe-release-candidate-20261003`,
  based on `41b7af32fa7a3a9fccfd8512c0d20ffda029458c`. Its pre-commit inventory
  is 109 dirty paths (60 tracked modifications, 49 untracked, 0 staged). This
  count is candidate-only and is not the separate 291-row source worktree
  inventory. No `.env`, database, remote, publication, or Tencent Cloud action
  occurred.

## 2026-10-02 current verification checkpoint

- The owner selected one shared public masthead, retaining the two-link AI
  News/Topics local navigation and removing repeated section/account/language
  controls. Current-tree TypeShare checks passed 7/7 Vitest cases and 24/24
  Playwright cases (72 bilingual route/width cases and 16 keyboard cases).
  The UI already matched the selected structure, so no runtime page component
  changed. The browser server was loopback-only and all three database URL
  variables were explicitly empty.
- Release-control regressions passed in the full suite: input bounds for test
  and SSH ports, SSH account validation, protection against deleting a
  cache through an outside symlink, and refusal to load the admin visual
  identity fixture without an explicit loopback-host marker. The focused
  release/admin guard set now passes 62/62; both the main admin-shell and
  empty-tools local browser smokes passed 1/1. Review then found two boundary
  gaps: the empty-tools launcher omitted its loopback marker, and Prisma
  migration checks did not override `DIRECT_URL`. Both were reproduced with
  failing tests, fixed locally, and independently re-reviewed with no
  remaining Critical, Important, or Minor finding in those slices. Targeted
  ESLint and `git diff --check` passed. `npm run typecheck` passed. The earlier
  local build passed and generated 121/121 static pages with database URL
  variables empty; Prisma notices on
  database-backed routes mean their real content remains unverified.
- The release wrapper's branch argument now rejects shell metacharacters
  before remote command interpolation, explicitly permits safe underscore-
  prefixed Git names, and still validates Git syntax before fetch. The
  focused source suite passed 29/29; targeted ESLint, TypeScript, PowerShell
  AST parsing, and direct .NET regex checks passed. Independent re-review
  found no remaining issue. A separate static review of the high-risk push,
  deploy, database, Docker, and SSH boundaries found 0 Critical/Important/
  Minor issues; it cannot establish whether a local database port is forwarded
  to a remote service. The wrapper itself was not run.
- Fresh full Vitest remains `PARTIAL`: 510 test files passed, 9 skipped, and 1
  failed; 2,548 tests passed, 90 skipped, and 1 failed. The only failure is the
  preserved D4R worktree-scope assertion in the protected
  `src/lib/production-motion-final-source.test.ts`; it rejects later authorized
  paths and is not reported as an application regression.
- The refreshed complete status receipt records 287 paths (145 tracked
  modified, 142 untracked, 0 staged), 286 non-receipt byte hashes, and 94 owned/overlap
  paths with 93 hashes. The canonical path/status digest is
  `d80821fb5e0a2ef2b9e65182a1d650d8cf6192ac7c38bc660bee86ee1033a04a`. One
  zero-byte file named `console.log((index+1)+'` appeared after the previous
  receipt; after rechecking its exact path and 0-byte size, it was removed
  under the owner's earlier explicit authorization. Hashes are self-audited for this snapshot; its last
  independent audit applies to an earlier snapshot. Exact hunk review remains
  open, so path classification is not release approval.
- The plan remains in local candidate review. The frozen D4R result, owner-
  deferred GEO route, database-backed content, and 22 absent historical browser
  logs remain unresolved or unverified. GitHub push (Oct 3), Tencent read-only
  preflight (Oct 4), deployment gate (Oct 5), and post-release checks (Oct
  6–8) remain gated on an exact reviewed candidate and their separate gates.
  No production database, `.env`, GitHub, Tencent Cloud, publication, staging,
  commit, or push operation occurred.

## 2026-10-02 continuation — root build and test configuration review

- Reviewed the exact dirty hunks in .gitignore, eslint.config.mjs,
  next.config.ts, and tsconfig.json. The supporting settings only isolate or
  ignore generated .next-admin-visual fixture output; the TypeScript config
  includes its generated types. The Next config's standalone tracing root
  remains a shared build setting and was checked against the earlier
  standalone runtime verification.
- TDD reproduced that the local admin preview's first configuration gate
  accepted DIRECT_URL, SEO_AUDIT_TEST_DATABASE_URL, and an ftp: loopback URL.
  It already rejected production mode, DATABASE_URL, and non-loopback hosts.
  The gate now refuses all three configured database URL variables and
  permits only HTTP(S) loopback origins. A focused runtime test covers
  acceptance and rejection cases.
- The four relevant fixture/config test files passed 64/64; targeted ESLint
  and npm run typecheck passed. Typecheck ran Prisma client generation and
  TypeScript only; it did not connect to a database. No full build or full
  test-suite rerun was needed for this config guard. Exact review of the
  remaining candidate paths is still open, and review does not approve remote
  inclusion. No .env, database, GitHub, Tencent, stage, commit, or deployment
  operation occurred.

## 2026-10-02 continuation — design reference baseline audit

- Read the four untracked design reference files as specifications, not as live
  acceptance receipts or authority to change unrelated paths. DESIGN.md dates
  its implementation scan to 2026-09-21. The mobile-overlay and active-route
  gaps listed there are historical baseline notes; current shell contract tests
  cover an aria-current route link and a non-interactive overlay element.
- The AI News spec asks that legacy glass classes be migrated or scoped. The
  production route is now scoped to the redesign tokens, and its focused
  stylesheet neutralizes the old glass/surface treatments. The owner-selected
  one-masthead structure retains only Latest/Topics local navigation. Public
  shell and TypeShare source tests passed 21/21; the separate bilingual
  TypeShare browser suite's latest result remains 24/24 from the preceding
  local check.
- No design reference or runtime UI file changed in this read-only pass. These
  references remain outside the candidate unless explicitly included after
  exact candidate review. Their contract tests do not verify database-backed
  article facts, real source ownership, or a production browser session.

## 2026-10-02 continuation — standalone E2E runner isolation

- The Playwright launcher already set HOSTNAME to 127.0.0.1 and cleared the
  database variables for standalone DB-free checks, but direct invocation of
  scripts/start-production-e2e.cjs inherited the caller's values. TDD added
  failing tests before the fix.
- The runner now rejects any non-empty DATABASE_URL, DIRECT_URL, or
  SEO_AUDIT_TEST_DATABASE_URL before clearing build cache or starting the
  server. With empty values it pins HOSTNAME to 127.0.0.1 and explicitly sets
  all database variables empty before requiring the standalone Next server.
  It continues to clear only the contained standalone fetch cache and refuses
  symlinked paths.
- The script's focused cache/isolation suite passed 7/7; Node syntax, targeted
  ESLint, and npm run typecheck passed. Typecheck generated the Prisma client
  and ran tsc without a database connection. The CLI runner itself was not
  invoked, so no cache was cleared and no server started.
- The exact script/test hunks are reviewed locally, but the release candidate
  remains unselected. No .env, database, remote, publication, stage, commit,
  push, SSH, or deployment operation occurred.

## 2026-10-02 continuation — AI News DB-free and editorial acceptance

- With DATABASE_URL, DIRECT_URL, and SEO_AUDIT_TEST_DATABASE_URL explicitly
  empty, nine AI News source suites passed 85/85. They cover detail/topic
  metadata, imports that must avoid Prisma, fail-closed slug lookup, evidence
  states, and topic route validation.
- Four local browser specs passed 14/14: Chinese/English DB-free detail
  routes, AI News editorial surfaces, unknown-topic 404 handling, and the
  Topics index at 320, 390, and 1440px in both locales. Playwright owned the
  loopback-only server; no real content database was used.
- Next.js printed a Webpack/Turbopack configuration notice and Node printed
  NO_COLOR/FORCE_COLOR warnings; the browser cases still passed. These are
  tool/runtime notices, not page failures. Local page checks do not verify
  production news facts or source ownership.
- No product source changed in this verification pass. The exact AI News
  candidate hunks and all remaining path groups are still under review; no
  release inclusion, database, .env, remote, publishing, staging, commit,
  push, or deployment is authorized by these test results.

## 2026-10-02 continuation — explicit Playwright database profiles

- Review first flagged `commercial-flow.spec.ts` because it creates and deletes
  database records, then traced its top-level `test.skip`: without both an
  explicit mutation switch and a local test database, its setup hooks do not
  run, so the old profile did not write to a database. We nevertheless made
  profile membership clearer: `playwright.config.ts` now excludes it whenever
  `DATABASE_URL` is empty and includes it only in the explicit test-database
  profile. The focused release/server-isolation tests passed 55/55 after the
  new profile assertion failed as expected before the change.
- Playwright discovery passed without starting a server or connecting to a
  database: DB-free profile `462` tests in `26` files, with the three direct
  database-writer specs excluded; configured local-test profile `428` tests
  in `25` files, with all three writer specs included and four DB-free-only
  specs excluded. The configured profile used a non-routable fixture URL for
  discovery only.
- The admin AI News import browser test also passed `1/1` in the local visual
  fixture with database URLs empty and script-parse/runtime diagnostics enabled.
  It returned the expected page without page or console errors. The three
  historical import diagnostic logs referenced by the receipt are absent from
  the current worktree, so the older `Invalid or unexpected token` event's
  cause remains unverified.
- The push/deploy runbook now describes the complete database-writing browser
  suite and its dedicated-local-test-database requirement. The DB-free
  `npm run build` rerun passed and generated `121/121` static pages. It emitted
  expected Prisma messages because the database URL was empty. Setting
  `outputFileTracingRoot` to this worktree removed the outer-workspace tracing
  ambiguity; standalone runtime files were present and a local smoke returned
  200 with a rendered `<main>` on `/about`, `/ai-news`, and `/en/about`. The
  smoke used an ephemeral process-only auth value; live database content
  remains unverified.
- Full `npm run lint`, `npm run typecheck`, and targeted ESLint passed. Full Vitest remains
  `PARTIAL` at the unchanged protected D4R worktree-scope assertion: `510`
  files passed, `9` skipped, `1` failed; `2,548` tests passed, `90` skipped,
  `1` failed. No assertion or protected path was altered.
- At the earlier 2026-10-01 intermediate checkpoint, after the explicitly
  authorized zero-byte-file removal and plan/handoff updates, the receipt was
  refreshed and self-audited at 280 paths (139
  tracked modified, 141 untracked, 0 staged), with 279 non-receipt hashes and
  the matching manifest digest above. Exact candidate hunk review and remaining
  owner gates stay open; local standalone packaging and route startup now pass.
  No database, `.env`, remote, publishing, staging, commit, push, SSH, or
  deployment action occurred.
- A separate 0-byte worktree `index.lock`, last written `2026-09-26T19:29:31Z`,
  remains present with no active Git process at the last check. An exact-file Git
  restore was refused before changing it; the one generated `next-env.d.ts`
  side effect was restored by matching its verified pre-test SHA-256. The lock
  is preserved and blocks staging/commit until explicitly dispositioned.

## 2026-10-02 continuation — DB-free browser review corrections

- A read-only review found that the DB-free browser checks did not explicitly
  prove formal `/software` routes stayed empty, and catalogue/support collision
  coverage was silently omitted in that profile. Both gaps were corrected in
  the E2E tests; the database-dependent collision checks now appear as explicit
  skips, and the test name for the preview/formal category panel is accurate.
- The independent reviewer rechecked the two changed E2E files and confirmed
  both Important findings and the Minor naming finding are closed. The
  post-review DB-free focused browser run passed `5/5`; two local-database-only
  catalogue checks were explicitly skipped. Target ESLint, official
  `npm run typecheck` with database URLs empty, and scoped `git diff --check`
  passed.
- The full DB-free Playwright suite has now rerun after the final correction:
  `466` tests, `406` passed, `60` skipped, `0` failed. The previously observed
  `403 passed / 55 skipped / 4 failed` result remains diagnostic history. This
  is local development-server evidence only; database-backed catalogue checks
  remain outside this run. The dedicated standalone-production Playwright
  follow-up passed `3/4`; the category motion case correctly skips because the
  standalone bundle excludes local previews. The formal-route/bundle test
  passed with `22` script assets and no preview-route leakage. This was a
  loopback-only run with a process-only test auth value. Full Vitest remains
  `PARTIAL` at `2,548 passed / 90 skipped / 1` unchanged protected D4R
  worktree-scope failure.
- No runtime source changed. The 286-path manifest is unchanged; raw-byte
  hashes and the receipt's capture time are refreshed after these test and
  governance edits. Exact candidate hunk review, database-backed content,
  production assets, and release gates remain open.

## Historical local closure snapshot — 2026-10-01 Task 8

- Task 7V uses one shared site header for account/language entry and one AI News-local navigation for Latest/Topics. Task 8 TypeShare checks distinguish the mobile menu trigger from its account link. The earlier matrix passed 8/8 bilingual routes across 390/900/1024/1100/1280px (40 route/width combinations); that browser pass and its no-findings review apply to the earlier snapshot. The current 2026-10-01 follow-up fixes a route-current marker and expands the unrun browser contract as recorded below. Admin review confirmed its former database/request guards; service-worker/WebSocket channels remain untested, with no matching source usage found.
- The release-safety follow-up validates event names in DB-free analytics mode, rejects non-loopback Playwright sites/databases, skips database-mutating E2E unless explicitly enabled with a loopback database whose name marks it `test` or `e2e`, aborts admin-fixture writes before the app, and blocks non-loopback commercial-flow requests. The release runner defaults to local checks without fetch/push/SSH/deploy; `-Push` explicitly enables GitHub refresh/push and `-Deploy` requires `-Push`. The runner requires a named branch, uses that same branch as the migration-upgrade baseline, requires the local database name to contain a delimited `test` or `e2e` marker, and restores the caller's database URL variables after local checks.
- The 2026-10-01 follow-up fixes AI News `aria-current` to require an exact route match in desktop and mobile navigation. TypeShare now has 24 tests (72 bilingual route/width cases plus 16 keyboard cases), including the exact active state of the AI News Latest local link. Every Playwright web server binds to `127.0.0.1`; DB-free servers receive empty database URLs and browser requests are restricted to loopback. The latest TypeShare browser suite passed 24/24 and the local build generated 121 pages. Database-backed content remains unverified; the older 8-route/40-width pass is historical.
- On 2026-10-01 the owner confirmed the single-masthead standard: one shared site header, one account/language entry, and the two-link AI News/Topics local navigation. The TypeShare source and browser contracts now explicitly reject a second AI News header/banner or repeated controls. Fresh checks passed 3/3 Vitest and 24/24 Playwright cases (72 route/width and 16 keyboard cases); the existing UI already matched, so no production component changed.
- Chinese empty AI News states now show “待核验”; the software empty-state announcement sits outside the product list. Focused Vitest and DB-free browser checks are recorded in the active release-safety contract and the current receipt below.
- The full Vitest run remains `PARTIAL` because the unchanged protected D4R scope assertion rejects later authorized paths; the latest full run had 2,503 tests pass / 90 pending / 1 fail. The JSON receipt at `docs/handoffs/enhe-shell-final-local-closure-2026-09-30.json` is the authority for the latest path and byte-hash snapshot; no dirty path is approved for release solely by its classification.
- The current path receipt has 279 rows (138 tracked / 141 untracked / 0 staged), 278 non-receipt file hashes, and 90 owned paths / 89 hashes after adding the empty-tool guidance task evidence. The live path digest and independent audit state are kept in the JSON receipt; path ownership does not authorize release inclusion.
- Overall release readiness remains partial: exact hunk review, the owner-deferred GEO page, database-backed content, and unresolved historic browser events remain open. No production database, deployment, content publication, staging, commit or push occurred in this batch.
- Latest review follow-up closed the release runner's default database-variable leak and remote Docker-context risk. Ordinary Vitest runs now have empty database URLs; database-writing Vitest and browser suites require separate explicit switches. The admin login return now maps `/en/admin/...` to `/admin/...` with `locale=en`, and the redesigned admin topbar restores account and language controls. Focused Vitest passed 54/54, the local admin browser fixture passed 1/1, lint/typecheck/build passed, and the TypeShare browser suite remains 24/24. The empty-database build generated 121 static pages; real database content remains unverified.
- Admin review found the account and language controls disappeared below 640px. A scoped admin-only style fix now keeps both visible at 320/390/480px, hides the redundant “view site” button while the ENHE home link remains available, and passes the no-overflow browser matrix (1/1); the test also checks the controls remain visible at exactly 640px. This closes that Minor finding; the broader exact-hunk review remains open. Current local checks: TypeShare 24/24, focused Vitest 54/54, lint, typecheck, diff-check, and local build 121 pages passed. Full Vitest remains PARTIAL at 2,503 passed / 90 pending / 1 protected D4R failure.
- The final admin path audit caught that `src/app/admin/admin-nav.tsx` and its unit test were runtime/test dependencies of an authorized layout but absent from the owned list. They are now explicitly scoped and pending exact-hunk review; do not omit either from any release candidate.
- The release-check follow-up separates synthetic admin visual fixtures from default production E2E while retaining the signed-out admin-shell test. Standalone migration checks repeat the local Docker-context guard; both PostgreSQL image runs use `--pull=never`. Build database URLs are masked with a non-secret loopback placeholder, telemetry is disabled, and the caller's settings are restored. Focused source tests pass 23/23; independent platform review found no remaining issue. No Docker, migration, database, build, or release browser run was performed.
- FAQ, tutorial, and changelog editors now explain how to add an AI software entry only when their required tool list is empty. The existing required selector and save actions remain unchanged. Focused Vitest passed 20/20; the guarded DB-free browser test passed all three routes at 390px and 1280px, and the populated-editor matrix passed across its six widths with the notice absent. Target ESLint passed. Independent code review caught and closed one Minor fixture-guard gap: `SEO_AUDIT_TEST_DATABASE_URL` is now rejected too. A final read-only review found no remaining Critical, Important, or Minor issue. The review also led to removing an unused `/s` regex flag in the existing release-workflow source test; its 23 tests and `npx tsc --noEmit --pretty false` now pass without changing the `ES2017` target. Contract: `docs/exec-plans/active/enhe-admin-empty-tool-guidance-2026-10-01.md`.


## Latest local closure snapshot — 2026-09-30

- Current bounded contract: `docs/exec-plans/active/enhe-shell-final-local-closure-2026-09-30.md`; handoff: `docs/handoffs/ENHE-LOCAL-WEBSITE-CLOSURE-2026-09-30.md`. The adjacent JSON receipt records exact current paths/statuses and owned-file hashes, not unrelated dirty-file bytes. Earlier snapshots below remain historical.
- AI News now has bilingual collection routes; BYOX quick links, direct fragments, history traversal, keyboard placement and instant navigation have behavior coverage. Admin populated-image controls, SEO warning labels and package-picker focus received scoped fixes. Translation-success styling is explicitly wired and component-tested without claiming an originally reproduced browser defect.
- Latest controlled full Vitest: **517 files passed, 1 failed; 2,490 tests passed, 90 pending, 1 failed**. The sole failure is the unchanged frozen D4R current-worktree-scope assertion. Earlier 2026-09-30 counts are historical; the initial runner's localhost URL override was removed before the complete suite was rerun.
- Public browser regression **32/32** and final BYOX navigation **16/16** passed. Lint, official typecheck and local build passed; build generated **121** static pages with expected empty-database errors on database-dependent pages. The final admin matrix and preservation snapshot are recorded in the current handoff.
- Final follow-up: the complete admin matrix passed **17/17** with script diagnostics enabled. Public accessibility refresh passed **34**, with **4** existing intentional skips; this includes the reproduced-and-fixed home side-card contrast and manually measured star contrast (1.41 to 5.24), while AI News's historical status-label contrast findings did not recur. Files storage-warning contrast was independently reproduced and fixed. Latest focused component/style tests passed **14/14**, including the new synthetic pending state; the complete Vitest count above is the last full run, not a sum with these later checks.
- The previously reported admin import-page script error did not recur in **3** further sequential fresh-server checks; each covered the same three AI News admin routes and captured 18 script responses without browser exceptions or syntax errors. One response body was unavailable per run, and the historic failure remains unexplained.
- Task 7D current-head follow-up (2026-09-30): the old DB-free browser setup did not activate its guarded auth/database fixture because the default dev script forces Turbopack while the replacement hook is Webpack-only. Playwright fixture mode now starts a local Webpack server, refuses production/non-local/non-empty-DB conditions, and never reuses an existing server. AI News desktop routes passed 1/1, direct import passed 1/1, and Chinese/English empty learning routes passed 2/2. Diagnostic results: direct import 6 script responses, 0 syntax failures, 0 parse failures, 0 runtime exceptions, 0 capture errors; three-route workflow 18 script responses with 0 syntax failures, 0 parse failures, 0 runtime exceptions, and one uncaptured development hot-update response. The prior `Invalid or unexpected token` and hydration event remain unlocated and `UNVERIFIED`; no claim of historical repair. The three old named import logs are absent from their paths in this checkout.
- Task 7E admin content route follow-up (2026-09-30): the 7 list and 9 editor routes already covered at 390px also passed the focused DB-free 320px Playwright matrix (`2/2` tests, `16/16` routes). No document/main/surface overflow, external request, app write, page error, or console error was observed. Target ESLint, official typecheck, and diff-check passed; no runtime source changed. Task 7 remains **PARTIAL**: GEO is owner-deferred/not accepted, the frozen D4R guard is unresolved, and the earlier public hydration and admin import-script events remain unlocated despite subsequent successful runs. The handoff maps each accessibility requirement to its evidence and preserves axe incomplete items. Real database flows and production operations were not tested. Missing product/article content does not block empty-site work. No production DB, `.env` edit, deployment, publication, staging, commit or push occurred.
- Task 7F admin tool-management route follow-up (2026-09-30): `/admin/software`, `/admin/software/new`, `/admin/online-tools`, `/admin/online-tools/new`, `/admin/skill-learning`, `/admin/skill-learning/new`, `/admin/ai-skills`, and `/admin/ai-skills/new` passed the focused DB-free 320px Playwright test (`1/1`, `8/8` routes). No document/main/surface overflow, external request, app write, page error, or console error was observed. Target ESLint and official typecheck passed; no runtime source changed. Task 7 remains **PARTIAL**: GEO is owner-deferred/not accepted, the frozen D4R guard is unresolved, and the earlier public hydration and admin import-script events remain unlocated despite subsequent successful runs. The handoff maps each accessibility requirement to its evidence and preserves axe incomplete items. Real database flows and production operations were not tested. Missing product/article content does not block empty-site work. No production DB, `.env` edit, deployment, publication, staging, commit or push occurred.
- Task 7G admin operations narrow-screen follow-up (2026-09-30): `/admin`, `/admin/audit`, `/admin/development`, `/admin/releases`, `/admin/seo-audit`, `/admin/seo-insights`, and `/admin/messages` passed the guarded DB-free browser matrix at 320px, 390px, and 1440px (`1/1` test, `21/21` route/width combinations). No document/main overflow, external request, application write, page error, or console error was observed. Target ESLint and official typecheck passed; no runtime source changed. Overall Task 7 remains **PARTIAL** for the separately recorded owner-deferred GEO route, frozen D4R guard, and unlocated historical browser events.
- Task 7H admin account and commerce mobile follow-up (2026-09-30): user list/detail, order/payment list/detail, refund list/detail, payment codes, and license generator passed the focused DB-free 320px checks (`3/3` specs, `10/10` routes); existing desktop and 390px assertions passed in the same run. No document overflow, external request, attempted business write, page error, or console error was observed. Target ESLint and official typecheck passed; no runtime source changed. Overall Task 7 remains **PARTIAL** for the separately recorded owner-deferred GEO route, frozen D4R guard, and unlocated historical browser events.
- Task 7I AI News admin workflow narrow-screen follow-up (2026-09-30): `/admin/ai-news`, `/admin/ai-news/new`, and `/admin/ai-news/import` passed the focused DB-free 320px Playwright check (`1/1`). All pages returned HTTP 200 with the expected heading, UNVERIFIED notice, active navigation, and list/form surface; the list stayed internally scrollable. No document/main overflow, external request, app write, page error, or console error was observed. Target ESLint and official typecheck passed; no runtime source changed. Overall Task 7 remains **PARTIAL** for the separately recorded owner-deferred GEO route, frozen D4R guard, and unlocated historical browser events.
- Task 7J populated admin status 320px follow-up (2026-09-30): the existing saved-software-image and SEO-run error/failed/high states passed their focused DB-free Playwright checks at 320px, retaining the existing contrast thresholds and showing no document overflow (`2/2` tests). Existing 1280px/390px checks passed in the same cases. No external/write request or browser error was observed. Target ESLint and official typecheck passed; no runtime source changed. Overall Task 7 remains **PARTIAL** for the separately recorded owner-deferred GEO route, frozen D4R guard, and unlocated historical browser events.
- Task 7K admin form accessibility follow-up (2026-09-30): replaced a zero-size assertion on the empty settings fixture with the real AI News HTML import form. Local DB-free Playwright passed `1/1` at 640px under 200% root-font-size simulation and forced colors; keyboard navigation reached the skip link, main target, and HTML textarea with a visible focus outline. Target ESLint, official typecheck, and diff-check passed; no production source changed. Refreshed the exact owned-file receipt and byte-wise revalidated the existing path-manifest digest against the current row set; Task 7 remains **PARTIAL** for the separately recorded owner-deferred GEO route, frozen D4R guard, and unlocated historical browser events.
- Task 7L admin operations responsive matrix (2026-09-30): the seven admin home, audit, development, release, SEO, and message routes passed at all six design widths (320/390/480/768/1024/1440px; `42/42` route/width checks) in the local DB-free fixture. No overflow, external/write request, or browser error was observed. Target ESLint and official typecheck passed; no runtime source changed. Task 7 remains **PARTIAL** for the separately recorded owner-deferred GEO route, frozen D4R guard, and unlocated historical browser events.
- Task 7M account and commerce responsive matrix (2026-09-30): the 10 synthetic-data user, order/payment, refund, payment-code, and license routes gained checks at 480/768/1024/1440px (`40/40` additional route/width checks); existing 320/390/1280 checks passed in the same run. Expected surfaces were visible with no page overflow, external/write request, or browser error. Target ESLint and official typecheck passed; no runtime source changed. Task 7 remains **PARTIAL** for the separately recorded owner-deferred GEO route, frozen D4R guard, and unlocated historical browser events.
- Task 7N AI News, tools, and content-management responsive matrix (2026-09-30): 27 routes passed at 320/390/480/768/1024/1440px (`162/162` combinations). The 1024px check found and fixed a shared admin content-grid intrinsic-width overflow; the AI News table now stays inside the main area and scrolls within its own surface. Full lint, official typecheck, and the focused DB-free Playwright matrix passed; no external/write request or browser error occurred. Task 7 remains **PARTIAL** for the separately recorded owner-deferred GEO route, frozen D4R scope guard, and unlocated historical browser events.
- Task 7O settings and disabled-plans responsive matrix (2026-09-30): `/admin/settings` and `/admin/plans` passed across 320/390/480/768/1024/1280/1440px (`14/14` combinations). Real settings fields/empty state and the disabled-plan notice/link remained visible and contained; no form or business action ran. No external/write request or browser error occurred. Full lint and official typecheck passed; no runtime source changed. Task 7 remains **PARTIAL** for the owner-deferred GEO route, frozen D4R scope guard, and unlocated historical browser events.
- Task 7P populated admin states responsive matrix (2026-09-30): the saved software-image, synthetic SEO warning/error, and files-storage notice routes passed at 320/390/480/768/1024/1280/1440px (`21/21` route/width checks). Existing contrast thresholds stayed in place; no external/write request or browser error occurred. Full lint, official typecheck, and diff-check passed. No runtime source changed or business action ran. Task 7 remains **PARTIAL** for the owner-deferred GEO route, frozen D4R scope guard, and unlocated historical browser events.
- Task 7Q missing dynamic admin detail records (2026-09-30): corrected the DB-free Prisma fixture so unmatched `findUnique` queries return `null`, then verified nine AI News/content/tool detail routes return 404 across seven widths (`63/63`). The TDD red run reproduced a 500 caused by the fixture's empty-array fallback. Existing user/order/payment/refund and populated software/SEO fixture checks passed `6/6`; full lint and official typecheck passed. No application source or production data changed. Task 7 remains **PARTIAL** for the owner-deferred GEO route, frozen D4R scope guard, and unlocated historical browser events.
- Task 7R populated admin content editors (2026-09-30): six existing-record editors (AI News article/topic, product demo, FAQ, changelog, tutorial) passed at seven widths (`42/42`) using synthetic local records. Review caught test-data spillover into `/admin/files`; the test first reproduced two leaked tool options, then the three editor queries were narrowed to `{ id, name }` and the fixture to that exact shape. The files check passed `1/1`, the populated matrix passed again `1/1`, the missing-record matrix passed `63/63`, content-editor matrix passed `1/1`, and user/order/payment/refund checks passed `3/3`. Full lint/typecheck passed. No real content or business action was touched. Task 7 remains **PARTIAL** for the owner-deferred GEO route, frozen D4R scope guard, and unlocated historical browser events.
- Task 7S protected-order warning mobile wrap (2026-09-30): reproduced the 390px overflow (`418px` document width) and fixed only the warning paragraph wrapping. Final order/payment/refund regression passed `3/3`, including 390px; full lint/typecheck passed. Warning copy and delete protection remain unchanged. Task 7 remains **PARTIAL** for the owner-deferred GEO route, frozen D4R scope guard, and unlocated historical browser events.
- Task 7T current-head probe for historic browser errors (2026-09-30): the guarded admin import test passed `1/1`; public zh/en AI News listing tests passed `2/2` at 320/390/1440px with no current browser errors or failed requests. The historic log files cited in the previous receipt are absent from this checkout, so the old incidents remain **UNVERIFIED** and no fix is claimed. A fresh `npm run build` exited `0` and generated `121/121` static pages; because `DATABASE_URL` was explicitly empty, DB-backed content remains unverified. The build reran the declared topic-seed generator on its already-dirty output path; previous raw bytes were not captured. Task 7 remains **PARTIAL** for owner-deferred GEO, the frozen D4R guard, and historic incidents.
- Task 8 shell current-head verification: focused Vitest passed `7` files / `27` tests, and DB-free Playwright passed `36/36` across the bilingual contentless routes, responsive checks, and public editorial routes including About. Approved About-copy checks passed; no content package or production database was used.
Worktree: `C:\Users\HU\Documents\New project 2\.worktrees\enhe-recovery-baseline`
Base HEAD: `26b4f189d0d79d8e885e9f39205aca18bd2d04f1`
Current development HEAD: `41b7af32fa7a3a9fccfd8512c0d20ffda029458c`

Operating mode: `AUTONOMOUS_LOCAL_DEVELOPMENT`
Owner standing authorization: `APPROVED`
Execution policy: `ONE_TASK_AT_A_TIME=REQUIRED`
Push status: `NOT_PUSHED`
Publish status: `BLOCKED`
Content evidence: `UNVERIFIED`

## Current stage

正常开发前的受控恢复阶段。新 recovery worktree 是唯一开发主线；旧 worktree 的 207 项 dirty/untracked 状态保持冻结，不清理、不迁移、不覆盖。

Current local batch: `R27 -> R28 -> R29` (completed at `467bd6e50f8e8f1ffb5f77bdd39851501f1155e4`)
Batch progress: `3/3`

Analytics DB-free investigation: the observed `/api/analytics` 503 is the
existing fail-closed storage contract. The route explicitly reports a dropped
event as 503, while the browser sender ignores the response body and handles
network rejection. `R26` was therefore not created; no analytics code changed.

Latest local wave `NEXT-WAVE-TOPIC-CHECKPOINT-AND-ANALYTICS-DBFREE` is closed at
`b6bb1c35d571610cd855765e845be27ef9974977`:

- `TOPIC_DBFREE_STATUS=PASS`; commit `1f6600d3b90b5d5260af48fe6e924e75217a1b28`.
- `ANALYTICS_DBFREE_STATUS=PASS`; commit `b6bb1c35d571610cd855765e845be27ef9974977`.
- `FULL_BROWSER_ACCEPTANCE=PASS` with known-topic routes 200, unknown-topic 404,
  `UNVERIFIED`, `noindex, follow`, no topic collection/FAQ schema, and DB-free
  analytics responses without Prisma initialization errors.
- `RECEIPT_PATH=C:\Users\HU\.codex\enhe-control\receipts\next-wave-topic-checkpoint-and-analytics-dbfree-final-2026-09-21.json`
- `RECEIPT_SHA256=6f7c22ac0807371c105dff1b6f631cfb405c8a880122822f48581159d0438cdc`
- `CONTENT_EVIDENCE=UNVERIFIED`; `PRODUCTION_CHANGED=NO`; `PUBLISH_STATUS=BLOCKED`.
- `PRODUCT_NEXT_TASK=NONE`; no formal release-batch candidate is currently
  recorded. Owner-selected local continuation is documented below and remains
  outside the formal batch.

## Owner-selected local continuation (not a formal R30)

- `LOCAL-CONSOLIDATION-GATE-2026-09-25`: `PASS_LOCAL_ONLY_SNAPSHOT`; receipt
  `docs/handoffs/ENHE-LOCAL-CONSOLIDATION-GATE-2026-09-25.md` records the
  current-head DB-free verification and local control-plane reconciliation;
  release and content gates remain closed.
- `AI-NEWS-TOPIC-DBFREE-SEO-SCHEMA`: `VERIFIED_LOCAL_ONLY`; contract
  `docs/exec-plans/active/enhe-ai-news-topic-dbfree-seo-schema.md` covers only
  zh/en topic preview robots/schema browser assertions. It does not change
  production behavior, content evidence, publication status, or the formal
  `PRODUCT_NEXT_TASK=NONE` state.
- `AI-NEWS-FOCUS-BOUNDARY`: `VERIFIED_LOCAL_ONLY`; contract
  `docs/exec-plans/active/enhe-ai-news-focus-boundary.md` adds the scoped light
  surface focus ring/guard and DB-free topic focus proof. It does not change
  content, database behavior, publication status, or the formal next-task state.
- `AI-NEWS-DETAIL-DBFREE-ROUTE-METADATA`: `VERIFIED_LOCAL_ONLY`; contract
  `docs/exec-plans/active/enhe-ai-news-detail-dbfree-route-metadata.md` proves
  the zh/en unavailable detail 404 metadata/schema boundary. It is test-only and
  does not change detail production behavior or publication status.
- `AI-NEWS-TOPIC-SCHEMA-ASSERTION-HARDENING`: `VERIFIED_LOCAL_ONLY`; contract
  `docs/exec-plans/active/enhe-ai-news-topic-schema-assertion-hardening.md`
  parses JSON-LD `@graph` nodes before checking forbidden types. It is test-only
  and does not change topic production behavior or publication status.
- `AI-NEWS-SKIP-LINK-RUNTIME`: `VERIFIED_LOCAL_ONLY`; contract
  `docs/exec-plans/active/enhe-ai-news-skip-link-runtime.md` verifies bilingual
  first-Tab and Enter focus movement into `#main-content` on DB-free routes. It
  is test-only and does not change public-shell production behavior.
- `AI-NEWS-ZOOM-FORCED-COLORS`: `VERIFIED_LOCAL_ONLY`; contract
  `docs/exec-plans/active/enhe-ai-news-zoom-forced-colors.md` covers the
  DB-free 200% text-zoom and forced-colors accessibility boundary for bilingual
  AI News index/topic routes. It closed verification-only with no production
  change; it does not create a formal R30 or alter content, database behavior,
  publication status, or deployment state.
- `AI-NEWS-FILTER-LOCALE-PRESERVATION`: `VERIFIED_LOCAL_ONLY`; contract
  `docs/exec-plans/active/enhe-ai-news-filter-locale-preservation.md` closes the
  DB-free query-preserving language-switch boundary for AI News listing URLs.
  It closed as a local-only helper, route wiring, and regression test slice;
  it is not a formal R30 and keeps content evidence, publication, database,
  and deployment gates unchanged.
- `PUBLIC-SHELL-DEEP-ROUTE-LOCALE`: `VERIFIED_LOCAL_ONLY`; contract
  `docs/exec-plans/active/enhe-public-shell-deep-route-locale.md` covers
  bilingual AI News topic active-route and locale-path preservation in the
  existing public shell. It closed as a DB-free browser evidence slice with no
  production change; it is not a formal R30 and does not alter publication,
  content, database, or deployment state.
- `CURRENT-HEAD-FULL-SUITE-RECONCILIATION`: `VERIFIED_LOCAL_ONLY`; contract
  `docs/exec-plans/active/enhe-current-head-full-suite-reconciliation.md`
  records the reproducible three-file full-Vitest control-plane drift and its
  exact local alignment. This was green at that earlier worktree snapshot;
  the current full-suite status is PARTIAL at the frozen D4R scope guard.
  Frozen historical ranges remain unchanged and no formal R30 is created.
- `VITEST-DBFREE-PARALLEL-STABILITY`: `VERIFIED_LOCAL_ONLY`; contract
  `docs/exec-plans/active/enhe-vitest-dbfree-parallel-stability.md` records
  the single-test timeout isolation that removes the DB-free metadata
  parallel cascade. It is test-only; production, database, publication, and
  deployment behavior are unchanged.
- `PUBLIC-SHELL-MENU-48PX-TARGET`: `VERIFIED_LOCAL_ONLY`; contract
  `docs/exec-plans/active/enhe-public-shell-menu-target.md` aligns the public
  shell mobile menu trigger with the locked 48px touch target and proves the
  DB-free bilingual accessibility/overflow boundary. It remains outside the
  formal `R27 -> R28 -> R29` batch and leaves content, publication, database,
  deployment, and `PRODUCT_NEXT_TASK=NONE` unchanged.
- `SOFTWARE-FILTER-48PX-TARGET`: `VERIFIED_LOCAL_ONLY`; contract
  `docs/exec-plans/active/enhe-software-filter-target.md` aligns the software
  catalogue category, pagination, and load-more controls with the locked 48px
  control height while retaining 44px compact category pills. DB-free
  catalogue semantics, content evidence, publication, database, deployment,
  and `PRODUCT_NEXT_TASK=NONE` remain unchanged.
- `SOFTWARE-CARD-ACTION-48PX-TARGET`: `VERIFIED_LOCAL_ONLY`; contract
  `docs/exec-plans/active/enhe-software-card-action-target.md` covers the
  primary card action's shared 48px token alignment. It is a local-only
  presentation slice and does not change catalogue data, DB-free semantics,
  content evidence, publication, database, deployment, or `PRODUCT_NEXT_TASK=NONE`.
- `SOFTWARE-FOCUS-GUARD`: `VERIFIED_LOCAL_ONLY`; contract
  `docs/exec-plans/active/enhe-software-focus-guard.md` covers the locked
  yellow ring plus dark outer guard for software catalogue controls. It is a
  local-only accessibility slice and does not change catalogue data, DB-free
  semantics, content evidence, publication, database, deployment, or
  `PRODUCT_NEXT_TASK=NONE`.
- `SOFTWARE-CARD-TITLE-WRAP`: `VERIFIED_LOCAL_ONLY`; contract
  `docs/exec-plans/active/enhe-software-card-title-wrap.md` covers arbitrary
  wrapping for long software card titles at 320px. Source contract is 10/10,
  bilingual preview title-wrap checks are 2/2, the full preview file is 6/6,
  and the DB-free production catalogue is 12/12. It is a local-only responsive
  slice and does not change catalogue data, DB-free semantics, content
  evidence, publication, database, deployment, or `PRODUCT_NEXT_TASK=NONE`.
- `SOFTWARE-CATEGORY-SHEET-CONTAINMENT`: `VERIFIED_LOCAL_ONLY`; contract
  `docs/exec-plans/active/enhe-software-category-sheet-containment.md` covers
  the mobile category panel's 320px viewport boundary in zh/en. Source and D4R
  checks are 19/19, the bilingual preview file is 8/8, and the DB-free
  production catalogue is 12/12. It is a local-only layout slice and does not
  change filter semantics, catalogue data, DB-free behavior, content evidence,
  publication, database, deployment, or `PRODUCT_NEXT_TASK=NONE`.
- `SOFTWARE-200PCT-ZOOM-BOUNDARY`: `VERIFIED_LOCAL_ONLY`; contract
  `docs/exec-plans/active/enhe-software-zoom-boundary.md` adds the missing
  bilingual 200% text-zoom containment evidence at 390px. The preview file is
  10/10, focused source/D4R checks are 19/19, and no overflow defect was
  found. It is a local-only accessibility verification slice and does not
  change data, DB-free semantics, content evidence, publication, database,
  deployment, or `PRODUCT_NEXT_TASK=NONE`.
- This continuation is executed under the owner's standing local-development
  authorization and remains outside the closed `R27 -> R28 -> R29` batch until
  an explicit consolidation decision is made.

## Completed

- `E1-NB-R16` Tutorials DB-free empty state：本地实现、focused test 4/4、目标 ESLint 和 localhost 验收已完成；仅本地关闭，不代表内容事实或生产发布已验证。
- Recovery baseline：branch、HEAD、clean worktree 和 R16 focused baseline 已验证。
- `E1-NB-R17` Skill-learning DB-free UNVERIFIED preview parity：
  - `STATUS=COMPLETED_LOCAL_ONLY`
  - `IMPLEMENTATION=GREEN_FOCUSED`
  - `LOCAL_ACCEPTANCE=PASS`
  - `COMMIT=3c2a0f05c46b0f7160475794a47aed50cd339947`
  - `CONTENT_EVIDENCE=UNVERIFIED`
  - `PUBLISH_STATUS=BLOCKED`
  - DB-free settings/public-content guards 已通过；`/skill-learning`、`/en/skill-learning`、`/tutorials`、`/en/tutorials` 四个 localhost 路由已通过，R16 focused regression 已通过。
  - R17 已本地提交；该结论不代表内容事实已验证，也不代表允许发布。
- `E1-NB-R18` Account Services DB-free UNVERIFIED preview parity：
  - `STATUS=COMPLETED_LOCAL_ONLY`
  - `IMPLEMENTATION=GREEN_FOCUSED`
  - `LOCAL_ACCEPTANCE=PASS`
  - `COMMIT=5e04d35a53cc8c18df22d969556cef31b042ee1c`
  - `CONTENT_EVIDENCE=UNVERIFIED`
  - `PUBLISH_STATUS=BLOCKED`
  - `OWNER_ACCEPTANCE=PASS_LOCAL_ONLY`
  - Focused tests 22/22、目标 ESLint、`/account-services` 与 `/en/account-services` localhost 验收均通过；DB-free settings/public-content Prisma 查询为 0。
  - R18 已本地提交；该结论不代表服务内容已验证，也不代表允许发布。

- `E1-NB-R19` Product Paths DB-free UNVERIFIED preview parity:
  - `STATUS=COMPLETED_LOCAL_ONLY`
  - `IMPLEMENTATION=GREEN_FOCUSED`
  - `LOCAL_ACCEPTANCE=PASS`
  - `COMMIT=b0a39e9f2ff4a8424484db29447eaa3e12213868`
  - `CONTENT_EVIDENCE=UNVERIFIED`
  - `PUBLISH_STATUS=BLOCKED`
  - `OWNER_ACCEPTANCE=PASS_LOCAL_ONLY`
  - All six localized product-path routes passed localhost acceptance with DB-free Prisma query count 0, explicit UNVERIFIED state, noindex/follow, and no product cards or product-fact schemas.
  - R19 is committed locally only; it does not verify product facts and does not authorize publication.

## Current blockers and gates

- 教程一手内容仍未验证，`TUTORIAL_CONTENT_EVIDENCE=UNVERIFIED`。
- `PUBLISH_STATUS=BLOCKED`；未授权生产发布、部署或远程事实声明。
- `DATABASE_URL=UNSET`；本地开发须保持 DB-free 边界，不得连接真实数据库。
- Historical pre-admin-expansion full Vitest was `PASS_LOCAL_ONLY`: `484` files passed, `9`
  skipped (`2375` passed, `90` skipped). The earlier three control-plane
  contract failures were aligned under a separately contracted local-only
  correction, and the DB-free metadata test's parallel timeout cascade was
  isolated with a local test-only timeout; no production runtime or deployment
  behavior changed. The later current local acceptance is `PARTIAL`: the
  frozen D4R test also checks current uncommitted/untracked paths and rejects
  admin paths independently of its allowlist. It has not been weakened.
- 旧 worktree `C:\Users\HU\Documents\New project 2\.worktrees\enhe-phase2c5b-p0-runtime-assets-v1` 的 207 项状态受保护。

## Candidate tasks

| ID | State | Proposed scope | Acceptance |
|---|---|---|---|
| RECOVERY-BASELINE-DEVELOPMENT | COMPLETED | Established the clean recovery line and advanced the verified local baseline through R22 | `BASELINE_HEAD=d29e3dd88c0adf8c6c72764f3622572a1da89d7c`; local-only acceptance; publication blocked |
| E1-NB-R17 | COMPLETED_LOCAL_ONLY | Skill-learning DB-free UNVERIFIED preview parity with settings/public-content DB-free guards | Focused implementation and local acceptance passed; content remains unverified; commit `3c2a0f05c46b0f7160475794a47aed50cd339947` |
| E1-NB-R18 | COMPLETED_LOCAL_ONLY | Account Services DB-free UNVERIFIED preview parity | `IMPLEMENTATION=GREEN_FOCUSED`; `LOCAL_ACCEPTANCE=PASS`; `OWNER_ACCEPTANCE=PASS_LOCAL_ONLY`; commit `5e04d35a53cc8c18df22d969556cef31b042ee1c`; content unverified and publication blocked |
| E1-NB-R19 | COMPLETED_LOCAL_ONLY | Product Paths DB-free UNVERIFIED preview parity | `IMPLEMENTATION=GREEN_FOCUSED`; `LOCAL_ACCEPTANCE=PASS`; `OWNER_ACCEPTANCE=PASS_LOCAL_ONLY`; commit `b0a39e9f2ff4a8424484db29447eaa3e12213868`; content unverified and publication blocked |
| E1-NB-R20 | COMPLETED_LOCAL_ONLY | Software Catalog DB-free UNVERIFIED preview parity | `IMPLEMENTATION=GREEN_FOCUSED`; `LOCAL_ACCEPTANCE=PASS`; commit `697ebd78fbd78b0cf786b30295936e52d451cf64`; content unverified and publication blocked |
| E1-NB-R21 | COMPLETED_LOCAL_ONLY | Public Search DB-free UNVERIFIED preview parity | `IMPLEMENTATION=GREEN_FOCUSED`; `LOCAL_ACCEPTANCE=PASS`; commit `350ec0a3e0e1edd2b87de6cac391f1f6c197dd76`; content unverified and publication blocked |
| E1-NB-R22 | COMPLETED_LOCAL_ONLY | AI News Listing DB-free UNVERIFIED preview parity | `IMPLEMENTATION=GREEN_FOCUSED`; `LOCAL_ACCEPTANCE=PASS`; commit `d29e3dd88c0adf8c6c72764f3622572a1da89d7c`; content unverified and publication blocked |
| E1-NB-R23 | COMPLETED_LOCAL_ONLY | AI Trends DB-free UNVERIFIED preview boundary | `IMPLEMENTATION=GREEN_FOCUSED`; `LOCAL_ACCEPTANCE=PASS`; commit `0f304c46abf03ba1b9c6d1e928a7a04661c2f839`; content unverified and publication blocked |
| E1-NB-R24 | COMPLETED_LOCAL_ONLY | Bilingual public-shell skip-to-content navigation | `IMPLEMENTATION=GREEN_FOCUSED`; `LOCAL_ACCEPTANCE=PASS`; commit `c35eb6e7ac0094a7e2286baecb16f249f1fa254c`; desktop/mobile keyboard and layout acceptance passed; publication remains blocked |
| E1-NB-R25 | COMPLETED_LOCAL_ONLY | Replace machine-facing AI News answer labels | `IMPLEMENTATION=GREEN_FOCUSED`; `LOCAL_ACCEPTANCE=PASS`; commit `cb04661d189ca7e37f6116236ec15e8765271b6c`; news facts, JSON-LD, and indexing behavior unchanged; content unverified and publication blocked |
| E1-NB-R27 | COMPLETED_LOCAL_ONLY | AI Trends human-facing answer labels | `IMPLEMENTATION=GREEN_FOCUSED`; `LOCAL_ACCEPTANCE=PASS`; commit `d186c7f2e74c85c702ce97bd3d4f2a74e8714f47`; trend facts, sources, JSON-LD, metadata, and DB-free behavior unchanged; content unverified and publication blocked |
| E1-NB-R28 | COMPLETED_LOCAL_ONLY | AI News Topic human-facing answer labels | `IMPLEMENTATION=GREEN_FOCUSED`; `LOCAL_ACCEPTANCE=PASS`; commit `4f546434c01e4fbb9633ec826de1156dbbd844e3`; topic content, facts, JSON-LD, metadata, and indexing unchanged; content unverified and publication blocked |
| E1-NB-R29 | COMPLETED_LOCAL_ONLY | AI Topic Hub human-facing answer copy | `IMPLEMENTATION=GREEN_FOCUSED`; `LOCAL_ACCEPTANCE=PASS`; commit `5f7dc711f1288fa1e425f32a81286ba7f037852c`; topic data, comparison rows, links, JSON-LD, metadata, and indexing unchanged; content unverified and publication blocked |
| NEXT-WAVE-TOPIC-DBFREE | COMPLETED_LOCAL_ONLY | AI News topic DB-free preview boundary | `TOPIC_DBFREE_STATUS=PASS`; commit `1f6600d3b90b5d5260af48fe6e924e75217a1b28`; browser routes and content boundary passed; content unverified and publication blocked |
| NEXT-WAVE-ANALYTICS-DBFREE | COMPLETED_LOCAL_ONLY | Analytics DB-free request boundary | `ANALYTICS_DBFREE_STATUS=PASS`; commit `b6bb1c35d571610cd855765e845be27ef9974977`; unset `DATABASE_URL` uses compatible empty `204`, configured-database behavior preserved; publication blocked |
| CONTENT-EVIDENCE-RECONCILIATION | BLOCKED | Reconcile first-party tutorial/content evidence only when an approved source is available | Source bytes/hash and publication approval independently verified |
| PHASE-2C.6 RELEASE | NOT APPROVED | Production publication/deployment | Separate production, database, deployment and factual-evidence approvals |

## Operating rules

- `UNVERIFIED` is not `FAILED`, but it never authorizes publication.
- Every implementation task needs a current contract with exact file ownership and tests before code changes.
- Do not touch the frozen old worktree or automatically classify its 207 entries; all 207 entries remain frozen after R18 closure.
- No push, deployment, production database access, SSH or Docker without separate approval.

## Authoritative current-head addendum — 2026-09-27

- CURRENT_HEAD=41b7af32fa7a3a9fccfd8512c0d20ffda029458c
- CURRENT_HEAD_FULL_VITEST=484 files passed, 9 skipped; 2375 tests passed, 90 skipped under the controlled one-worker command npm test -- --run --maxWorkers=1 --minWorkers=1.
- PARALLEL_RETRY_NOTE=the two-worker run had one environmental timeout in deploy/enhe-ai-tools/scripts/runtime-heartbeat.test.mjs; the isolated test was 5/5 and the controlled full run was green.
- WORKTREE_STATUS=57 tracked modified paths, 79 untracked paths, 0 staged paths, 136 status paths after this addendum; the exact path/byte manifest is the external receipt C:\Users\HU\.codex\enhe-control\receipts\enhe-current-head-governance-alignment-2026-09-27.json.
- The exact contentless public-shell batch is 16 runtime/test paths plus its governance receipt; the preserved seed stat-only path is excluded from content scope; all other paths remain existing or other-batch dirty and are not reclassified.
- PRODUCT_NEXT_TASK=NONE remains the formal release-lane value. Owner-directed local continuation is WEBSITE-SHELL-AND-ADMIN-CONVERGENCE.
- The local route plan is: finish public shell framework, retain About copy, redesign the 48 admin page routes by family, and prepare the empty site without waiting for product/article content. Content can be supplied and validated later. The detailed plan is docs/superpowers/plans/2026-09-27-enhe-shell-and-admin-convergence.md.
- Content, production database, Tencent Cloud, commit, push, and publication gates remain closed.

## Current-head continuation refresh — 2026-09-27

- CURRENT_HEAD remains `41b7af32fa7a3a9fccfd8512c0d20ffda029458c`.
- The refreshed worktree inventory is 147 status paths: 65 tracked modified, 82 untracked, 0 staged. The authoritative external receipt is `C:\Users\HU\.codex\enhe-control\receipts\enhe-current-head-governance-alignment-2026-09-27.json`; its LF path-manifest SHA is `57518DFD51AE721B029E1CA793680618A97CF1A127767ECD93F8F451CF06037A` and byte-manifest SHA is `E164528476D615BD9F3002EEB75ED00F5275AE842ECABECA66608B4624E1240D`.
- Public route-family Task 2A is locally green for the targeted About, Legal, Search, AI Topics, Build Your Own X, and Pricing bilingual routes: focused Vitest 49/49, route-family Playwright 12/12, contentless regression 24/24, lint PASS, official typecheck PASS, and focused axe 0 violations.
- Pricing's absent-`DATABASE_URL` 500 is closed locally as a DB-free `UNVERIFIED` 200 with `noindex, follow`; no configured-database path was changed. Auth layouts remain a named private-boundary follow-up.
- The broad accessibility smoke is PARTIAL outside this slice; home/AI-News/topic contrast findings and mobile `/login` console evidence remain follow-up items in the dated external audit, not release blockers silently marked green.
- PRODUCT_NEXT_TASK=NONE remains the formal release-lane value. The next owner-directed local continuation is Task 3: admin shell foundation. No content package, production DB, Tencent Cloud, commit, push, or publication authorization is implied.

### Task 3A admin shell foundation refresh — 2026-09-27

- CURRENT_HEAD remains `41b7af32fa7a3a9fccfd8512c0d20ffda029458c`; the refreshed inventory is `154` status paths (`69` tracked modified, `85` untracked, `0` staged). The external receipt records path and raw-byte hashes: path `A1A14584F77613BE6E89D59C84FDCAC04D3754555E91245386957CD0E23C9865`, bytes `75F2335E820071F919B7FD3C2F918F72B0D320F15A1BB58DA8BE5A41B9BD21DA`.
- Task 3A is locally green: admin source/i18n/middleware `10/10`, signed-out DB-free E2E `1/1`, public/contentless regression `36/36`, lint PASS, official typecheck PASS, and build exit `0`.
- `/admin` unauthenticated requests now stop in middleware with a localized login redirect before database-backed page rendering; `requireAdmin()` remains the layout/server authorization boundary. Authenticated admin browser/screenshot acceptance is `NOT_RUN` because no local admin fixture or database was authorized.
- The seven current-local admin paths are classified `CURRENT_LOCAL_ADMIN_SHELL`; unrelated dirty paths remain preserved. PRODUCT_NEXT_TASK=NONE, content evidence is unverified, and production database/Tencent Cloud/commit/push/publication gates remain closed.

### Final continuation inventory refresh — 2026-09-27

- After the operations-family compatibility contract, the current worktree is `155` status paths (`69` tracked modified, `86` untracked, `0` staged), still at HEAD `41b7af32fa7a3a9fccfd8512c0d20ffda029458c`.
- Final path/byte manifest SHA-256 values are held in the external receipt referenced above.
- The operations presentation contract is `2/2` green and remains scoped to the admin shell; configured-data queries/actions were not changed. Task 3 authenticated browser verification and Task 4 data-backed route verification remain NOT_RUN without an authorized local fixture/database.

### Typeshare reference alignment — 2026-09-27

- STATUS=`VERIFIED_LOCAL`; owner-directed local UI/architecture batch only.
- Reference evidence: `C:\Users\HU\.codex\enhe-control\typeshare-audit-2026-09-27\typeshare-reference-design-audit.md` plus desktop/mobile captures and computed-style summary.
- About now uses the quiet 1024px editorial pattern; AI News uses a 220px desktop rail, 69px workspace topbar, compact content column, and the same shell for DB-free `UNVERIFIED` state; admin uses the 220px/69px application shell while preserving server authorization and route ownership.
- Focused source/contentless tests: `16/16`; Typeshare alignment + AI News + admin DB-free E2E: `13/13`; lint PASS; typecheck PASS; build PASS with existing DB-free Prisma and multi-lockfile warnings.
- Current worktree inventory for this batch: `154` status paths (`77` tracked modified, `77` untracked, `0` staged); exact path/hash rows are in `C:\Users\HU\.codex\enhe-control\receipts\enhe-typeshare-alignment-2026-09-27.json`.
- Current HEAD remains `41b7af32fa7a3a9fccfd8512c0d20ffda029458c`; no commit, push, production DB, Tencent Cloud, or publish action occurred. Content evidence remains `UNVERIFIED` and publication remains `BLOCKED`.

### Typeshare alignment final verification refresh — 2026-09-27

- `CURRENT_HEAD=41b7af32fa7a3a9fccfd8512c0d20ffda029458c`; the external receipt uses `git status --untracked-files=all` and records `168` complete file rows (`78` tracked modified, `90` untracked, `0` staged), with final path and raw-byte hashes.
- The local UI batch is `VERIFIED_LOCAL`: About has the quiet editorial shell; AI News has the 220px/69px app workspace, DB-free topic parity, mobile collapse, and isolated footer/support chrome; admin keeps the same app geometry with authorization and data actions unchanged.
- Focused source/contentless tests are `9` files, `40/40`; Typeshare alignment E2E is `6/6`; AI News detail/topic/listing plus admin DB-free E2E is `9/9`; lint, typecheck and build PASS.
- Full Vitest remains `PARTIAL` at the frozen governance boundary: `488` files passed, `9` skipped (`2388` tests passed, `90` skipped), with only `production-motion-final-source.test.ts` failing because its exact D4R path allowlist does not include the current pre-existing dirty scope. No allowlist expansion was made.
- Content evidence remains `UNVERIFIED`; production database, Tencent Cloud, commit, push and publication gates remain closed.

## Owner-directed website shell and admin continuation refresh (2026-09-30)

- Local UI work remains on branch `codex/enhe-recovery-baseline` at HEAD `41b7af32fa7a3a9fccfd8512c0d20ffda029458c`; no commit, push, production connection, Tencent Cloud operation, or publication was performed.
- Admin content Task 5A (AI News list/editor/import) and Task 5B (software, online service, skill-learning, and AI Skill shared list/editor) are locally verified. The tool-management change is limited to the shared presentation component and scoped styles; form actions, authorization, media uploads, price specifications, and purchase/delete protection are preserved.
- Fresh checks for this continuation: focused admin/content suite 9 files/36 tests passed; `npm run lint` passed; `npm run typecheck` passed; local production build exited 0 with a process-only database URL fixed to `127.0.0.1:1`; DB-free authenticated Playwright passed 1/1 across 3 AI News and 8 tool-management routes. The browser check observed no external requests, non-read requests, page errors, console errors, or document-level horizontal overflow.
- The build emitted expected Prisma connection failures to the unreachable loopback port while rendering database-backed routes. Build success is local compilation evidence only; it does not verify database-backed content.
- The earlier full Vitest result remains historical and was not rerun in this continuation. CONTENT_EVIDENCE remains `UNVERIFIED`; PUBLISH_STATUS remains `BLOCKED`; production database, deployment, commit, push, and publication gates remain closed.
- That earlier next slice (product-demo/tutorial management) and the subsequent Task 5/6 families have since closed locally; the current work is final local shell closure and supplemental acceptance.
- Correction (2026-09-30): `C:\Users\HU\.codex\enhe-control\receipts\enhe-admin-content-workflow-2026-09-30.json` does not exist. The earlier claim of complete current status/raw-byte rows at that path is withdrawn; historical receipts do not establish current inventory.

### Task 7 whole-site acceptance refresh — 2026-09-30

- Initial Task 7 snapshot: HEAD `41b7af32fa7a3a9fccfd8512c0d20ffda029458c`, with 218 `git status --short` entries. Existing dirty paths are preserved; this refresh does not claim a new complete path/hash receipt.
- Public DB-free browser acceptance passed 100 tests with 4 intentional skips, including the new AI News mobile workspace navigation, deep-route locale, keyboard, zoom, and forced-colors coverage. Admin visual acceptance passed 9/9; `/admin/geo-monitoring` remains `NOT_RUN` because route rendering calls `geoQuery.upsert()` and the no-write fixture blocks that database mutation.
- Lint, typecheck, and diff checks passed. Build exited 0 and generated 119 static pages, but the absent `DATABASE_URL` caused expected Prisma query errors on database-backed routes; those routes remain unverified.
- Controlled full Vitest is `PARTIAL`: 500 files passed, 9 skipped, 1 failed; 2,433 tests passed, 90 skipped, 1 failed. The only failure is the unchanged frozen D4R path allowlist in `production-motion-final-source.test.ts`; no allowlist expansion was made. The transient admin order-detail width report did not reproduce in 3 isolated runs or the final 9/9 admin matrix.
- Task 7 remains open. Content stays `UNVERIFIED`, publication stays `BLOCKED`, and production database, Tencent Cloud, commit, push, and publication gates remain closed.
- Owner decision (2026-09-30): keep `/admin/geo-monitoring` behavior unchanged and retain its `NOT_RUN` / not-accepted status. This is a deferred route check, not a passed acceptance gate. Other independent local website-shell checks may continue; no database connection, write-bypassing fixture, or route data-initialization change is implied.

### Task 7A/7B supplemental local acceptance — 2026-09-30

- Task 7A is locally verified: the existing admin content browser spec passed 1/1 with eight additional 320px/390px checks for AI News, AI Skill, online-tool, and skill-learning list entrypoints. The initial test timing issue was resolved by awaiting page load before measuring CSS; no application source was changed.
- Task 7B is locally verified: `/login`, `/register`, `/en/login`, and `/en/register` passed 8/8 mobile shell tests, including localized primary buttons, password visibility toggles, field containment, and zero browser errors, external requests, or non-read requests. No form was submitted; real authentication remains unverified. The older mobile login console finding was not reproduced in this scope.
- Targeted ESLint, final `npm run typecheck`, and diff checks passed. Full Vitest/build and the earlier full browser matrices were not rerun for these test/document-only changes; their prior results are not replaced by this supplemental evidence.

### Task 7C supplemental package-picker state check — 2026-09-30

- The focused package-picker browser checks passed `2/2`: visible keyboard focus and pending/completed upload feedback. For the state check, Playwright intercepted and fulfilled the synthetic `POST /api/admin/ai-skill-upload` before it reached the application server; no real upload, API processing, database, or storage operation occurred.
- ESLint for `tests/e2e/admin-populated-accessibility.spec.ts` and `npx tsc --noEmit` passed. Full Vitest/build and the full browser matrix were not rerun; the prior counts and the frozen D4R failure remain unchanged.
- Task 7 remains `PARTIAL`; this adds local UI-state evidence only. GEO stays owner-deferred/not accepted, prior browser events remain unexplained, and production, publication, staging, commit, and push gates remain closed.
- The current worktree receipt records `252` complete path rows (`236` compact entries; `124` tracked modified, `128` untracked, `0` staged) at unchanged HEAD `41b7af32fa7a3a9fccfd8512c0d20ffda029458c`; its path-manifest SHA-256 is `d6e3430383a52bd0ca627a40ffe3adcd47fa8466b035eb760cd3462dd88f926d`. The earlier `219` count was the initial compact snapshot, not the current count. No whole-worktree raw-byte inventory is claimed.
- Task 8's public shell portion is now verified `PASS_LOCAL_ONLY` at the current HEAD: 36/36 DB-free Playwright checks and 27/27 focused Vitest checks passed, including the retained About copy. Later content publication still requires its own source package and validation; deployment, production database, commit, and push still require separate authorization. Overall Task 7 remains `PARTIAL` with GEO not accepted and the frozen D4R failure recorded.

## Owner plan execution checkpoint — 2026-09-30

- The owner reset the schedule from 2026-09-30, with no holidays and immediate progression when a stage finishes early. The planned sequence includes local acceptance, exact GitHub candidate review/push, Tencent Cloud preflight, and deployment; this checkpoint has not performed a remote write or deployment.
- Baseline reconciliation returned to the recorded 252 paths: 124 tracked modified, 128 untracked, 0 staged, at `41b7af32fa7a3a9fccfd8512c0d20ffda029458c`. The path/status SHA-256 remains `d6e3430383a52bd0ca627a40ffe3adcd47fa8466b035eb760cd3462dd88f926d`; 43 paths are current-batch-owned-or-overlap and 209 previously unclaimed paths are now grouped by purpose (89 website implementation, 63 tests/fixtures, 49 plan/handoff records, 4 design references, 4 root tool/config files). This purpose grouping is not commit permission; a detailed source review and exact inclusion/exclusion decision remain pending. The generated `next-env.d.ts` preview reference was restored to its recorded 268-byte CRLF baseline.
- Fresh full Vitest: 503 files passed, 9 skipped, 1 failed; 2453 tests passed, 90 skipped, 1 failed. The sole failure is the frozen D4R worktree-scope guard: its focused run found 118 current-scope paths outside the historical D4R allowlist. This is scope evidence, not a reproduced page/runtime defect; the guard remains unchanged.
- Fresh lint, official typecheck, and empty-`DATABASE_URL` build exited 0. Public DB-free Playwright exited 0 (the same route group is historically recorded as 36/36); the AI News admin all-breakpoint group and seven-route operations group each passed 1/1. The full admin config was stopped after its local Node process grew from about 5.0 GB to 5.4 GB; that attempt is `PARTIAL`, not a pass.
- The 22 historical incident-log paths remain absent, so the old browser incidents stay `UNVERIFIED`. `/admin/geo-monitoring` remains owner-deferred and unaccepted. No production database, `.env`, GitHub, Tencent Cloud, staging, commit, push, or publication operation was used in this checkpoint.

## Current execution checkpoint — 2026-10-01

- The owner directed execution of the dated plan, including a scoped GitHub push and Tencent Cloud release. No remote write or production operation has occurred in this checkpoint.
- This paragraph is a historical 2026-09-30 checkpoint: its 253-path count and note that the then-refreshed receipt was stale by one path are superseded by the 2026-10-01 Task 8 snapshot at the top of this file and its matching JSON receipt. Do not use these historical numbers as the current path or hash evidence.
- Independent purpose review is complete but does not authorize candidate inclusion. It identified source, tests, config, design, and governance groups; exact hunk review remains open, and zero paths have been approved solely by that classification. Do not batch all dirty files into a release.
- The GitHub default branch currently has unrelated history and the repository has no `main`; the recovery branch has its own verified remote tracking ref. Do not merge or deploy across the unrelated histories by assumption. After local candidate acceptance, push only the exact reviewed recovery-branch ref and confirm the published SHA before Tencent preflight.
- Current local test envelope remains partial: focused feature checks pass, while full Vitest has one unchanged frozen D4R scope-check failure; the complete admin visual matrix was stopped at the local resource limit; DB-backed content was not verified. Keep these limits visible in the release gate.
- Schedule reset on 2026-10-01: receipt and source review (Oct 1–2), exact GitHub candidate push (Oct 3), read-only Tencent preflight (Oct 4), deployment gate (Oct 5), and post-release verification/corrections through Oct 8. No holidays; advance immediately when a gate passes early.
- Task 7U local design-token correction is accepted after its bilingual 6-route / two-width E2E (6/6), public accessibility plus zoom/forced-colors checks (24 passed, 4 skipped), all-public contentless/text-contrast regressions (36/36), lint, typecheck, and diff check. Independent focused code review found no Critical/Important issue; its Minor test-clarity suggestion was addressed and the E2E rerun passed. This does not approve a release candidate; exact source/hunk review continues next, while the prior full-suite D4R/admin/DB-backed limitations remain open.
- D4R scope note: `src/lib/production-motion-final-source.test.ts` is currently dirty relative to HEAD (` M`, 236 additions/17 deletions), but its exact bytes still match protected SHA-256 `5a4e1557e504ddf24d2c1ca9302760f5bf85756a1d54e1a6a841549c75006859`. It predated Task 7U, was not edited there, and remains classified as an unauthorized test path; preserve and exclude it from a website release candidate. A clean-status claim would be inaccurate.

## Current execution checkpoint — 2026-10-02

- The owner-selected AI News standard is one shared site masthead plus the local Latest/Topics navigation. Browser and source contracts enforce the one-masthead structure and reject repeated account/language controls.
- Follow-up review found four small issues in the local shell/tests: live status regions included action links, the admin input focus style overrode its dark outline, DB-free tests did not restore stubbed environment state, and the standalone test launcher used the caller's working directory. Each was reproduced before its fix; the protected source guard was preserved.
- Fresh public + TypeShare Playwright checks passed 48/48. The admin focus-ring browser check passed 1/1. Full lint and official typecheck passed. `npm run build` passed and generated all 121 static pages with all database URL variables empty; Prisma logged expected missing-`DATABASE_URL` fallback messages, so database-backed content remains unverified. `next-env.d.ts` remains at its 268-byte baseline SHA-256 `f4e8976c19fc926644d72610bf1058bd6bf52add97e46a02bc0b912a751625c0` and is clean.
- Fresh full Vitest remains `PARTIAL`: 510 files passed, 9 skipped, 1 failed; 2,548 tests passed, 90 skipped, 1 failed. The sole failed assertion is the unchanged protected D4R worktree-scope guard, which rejects the already-dirty wider worktree. It was not weakened or edited.
- The current receipt contains 286 paths (145 tracked modified, 141 untracked, 0 staged), 285 non-receipt raw-byte hashes, and 91 owned/overlap paths with 90 hashes; path-manifest SHA-256 is `de5374b357bbe409ceba6bbf87047136b889600aeeea8aa0c4791bf3988807f8`. Six modified E2E files were added to this snapshot; their exact candidate disposition remains pending. This proves inventory only; 189 previously unclaimed paths remain outside a release candidate pending exact review or exclusion.
- At the intermediate checkpoint before the final test-only corrections, the DB-free Playwright run had 462 tests: 403 passed, 55 skipped, and 4 failed. The focused checks passed after those corrections; the full suite had not yet been rerun at that point. Its final rerun is recorded above: 466 tests, 406 passed, 60 skipped, and 0 failed. The earlier 462-test run is diagnostic history, not the current browser-suite status.
- No `.env` was read or changed; no database, remote repository, Tencent Cloud, publishing, staging, commit, push, SSH, or deployment operation was used. Continue with exact candidate-path and hunk review; local build/test success does not grant release or deployment approval.

## 2026-10-02 continuation — production-mode DB-free E2E correction

- Independent review of the six motion-related E2E paths found that DB-free production mode could still navigate to `/redesign-preview/software`, which is intentionally absent from the standalone production bundle. A first red reproduction on the 320px category-motion case returned HTTP 404 where the test expected 200.
- The correction is test-only: preview-interaction checks now skip before navigation when the standalone server and empty database are combined; formal `/software` and `/en/software` contentless-shell checks remain active. No application runtime source changed.
- After the fix, the affected standalone-production checks completed 16 cases: 2 passed and 14 preview-only interactions skipped by design, 0 failed. The three affected specs also completed their development-server suite: 204 total, 160 passed, 44 environment-specific skips, 0 failed. Targeted ESLint and direct TypeScript checking passed. This complements, and does not replace, the separate full DB-free Playwright result of 466 tests (406 passed, 60 skipped, 0 failed).
- The independent reviewer rechecked all six E2E paths after correction: no remaining Critical or Important finding; one Minor note remains about a surrounding test possibly opening a formal route before its helper skips the preview interaction. It does not cause a 404 and does not invalidate the dedicated formal-shell checks.
- The full-worktree receipt and raw-byte hashes have been refreshed to this HEAD snapshot and self-checked. Full Vitest remains partial at its last recorded result (2,548 passed, 90 skipped, one unchanged protected D4R scope failure). Exact candidate hunk review, configured-database checks, and all release gates remain open; no database, `.env`, remote, Git write, or deployment operation occurred.

## 2026-10-02 continuation — bounded UI candidate review

- Fresh local checks passed for the selected public and admin groups: AI News/TypeShare browser 24/24, public shell accessibility 16 passed/4 skipped, contentless browser 24/24 plus source 4/4, About/editorial routes 12/12 and copy checks 10/10, and focused navigation/editorial source suites 20/20.
- Nine isolated admin fixture checks passed across the shared shell, AI News, commerce/refunds, settings/plans, user pages, empty-tool guidance, and software management. Fixture tests used loopback servers, empty database URL variables, synthetic records, and blocked external/mutating requests.
- The About diff preserves its existing bilingual content. No application source changed in this review. Raw inventory and protected hashes were rechecked: 287 path rows (145 tracked modified, 142 untracked, 0 staged), manifest `d80821fb5e0a2ef2b9e65182a1d650d8cf6192ac7c38bc660bee86ee1033a04a`, 286 raw file hashes, and 2 protected hashes all match.
- The release candidate is still unselected. Full Vitest remains partial at one unchanged protected D4R scope failure; the earlier full admin matrix retains one non-reproduced navigation abort. Exact review for other path groups, independent full-receipt review, database-backed checks, and release gates remain open.
