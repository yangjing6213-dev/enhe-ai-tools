# ENHE Phase 2A.1.1 bilingual public shell candidate review

## Scope and baseline

- Worktree: `C:\Users\HU\Documents\New project 2\.worktrees\enhe-public-shell-candidate-v1`
- Branch: `codex/enhe-public-shell-candidate-v1`
- Start HEAD: `7052ce8`
- Preview route: `/redesign-preview/shell`
- Old private-folder route: `/__redesign-preview/shell`

The only implementation change in this correction is candidate Footer localization plus the Preview specimen pairing needed to render the same locale in Header, mobile menu, language switch, and Footer. Production public routes and the previously approved shell components remain isolated and unchanged.

## Final receipt

```text
PHASE_2A_1_1_STATUS=COMPLETE_WITH_BUILD_GATE_OPEN
PHASE_2A_1_1_VISUAL_STATUS=PASS
PHASE_2A_1_1_BUILD_STATUS=OPEN
PUBLIC_SHELL_CANDIDATE_STATUS=READY_FOR_VISUAL_APPROVAL
PUBLIC_SHELL_MERGE_STATUS=BLOCKED_BY_HEARTBEAT_R008_AND_BUILD

FOOTER_I18N_COMMIT=1defa15
DOCS_REVIEW_COMMIT=docs(ui): finalize bilingual public shell candidate review
FOOTER_I18N_RED_STATUS=EXPECTED_FAIL
FOOTER_I18N_GREEN_STATUS=PASS

PREVIEW_DEV_HTTP_STATUS=200
PREVIEW_PRODUCTION_EXPECTED_STATUS=404
PREVIEW_NOINDEX=YES
PREVIEW_NOFOLLOW=YES
PREVIEW_IN_SITEMAP=NO

SCREENSHOT_COUNT=4
SCREENSHOT_WIDTHS=1440,390,1440,390
ZH_FOOTER_SCREENSHOTS=2
EN_FOOTER_SCREENSHOTS=2
EN_SCREENSHOT_FOOTER_LANGUAGE=EN
ZH_SCREENSHOT_FOOTER_LANGUAGE=ZH

PRODUCTION_PUBLIC_ROUTE_EXPOSED=NO
PRODUCTION_NAVIGATION_CHANGED=NO
PRODUCTION_SITEMAP_CHANGED=NO
PRODUCTION_EXISTING_ROUTES_REPLACED=NO
ROOT_LAYOUT_CHANGED=NO
GLOBALS_CSS_CHANGED=NO
R008_CHANGED=NO
PACKAGE_CHANGED=NO
LOCKFILE_CHANGED=NO
PRISMA_CHANGED=NO
PUSHED=NO
```

## Root cause and implementation

The Footer component accepted `locale`, but its previous English dictionary was incomplete and the Preview mounted only one Footer instance with `locale="zh"` after both Header specimens. Therefore the English Header could never produce an English Footer.

The fix uses a candidate-local typed static dictionary: `Record<RedesignLocale, RedesignFooterCopy>`. The dictionary owns the brand intro, three link-column definitions, copyright, filing display policy, and accessible Footer name. It does not read a database, cookie, URL, API, or production i18n state.

The Preview now renders an explicit Chinese specimen with `EnheRedesignHeader locale="zh"` and `EnheRedesignFooter locale="zh"`, and an English specimen with `EnheRedesignHeader locale="en"` and `EnheRedesignFooter locale="en"`. The Header passes the same locale to its language switch and mobile menu; no second boolean locale state was introduced.

The Footer keeps the existing deep ink-green background, responsive behavior, four-column semantic structure, link focus behavior, and CSS layout. No production Footer or route was modified.

## Footer copy

Chinese columns:

- `ENHE AI`
- `帮助与服务`: 帮助支持, 使用教程, 购买与下载, 产品更新
- `合规条款`: 用户协议, 隐私政策, 退款规则, 版权投诉, 未成年人保护
- `公司信息`: 品牌档案, 联系邮箱
- Filing: `ICP备案 · 公安备案`

English columns:

- `ENHE AI`
- `Help & Support`: Help Center, Tutorials, Purchase & Download, Product Updates
- `Legal`: Terms of Use, Privacy Policy, Refund Policy, Copyright Complaints, Protection of Minors
- `Company`: Brand Profile, Contact Email
- Filing: `ICP filing · Public-security filing`

All hrefs remain within the approved candidate link contract; no new production route was created.

## Tests and browser acceptance

The new RED assertions failed before implementation with 3 failures: missing complete bilingual copy, no English Footer specimen, and missing typed accessible/filing fields. After implementation they pass.

```text
FOOTER_I18N_TESTS=3 new behaviors covered; RED then GREEN
FOOTER_TESTS=10 candidate tests passed
HEADER_TESTS=covered by existing candidate contract; passed
MOBILE_MENU_TESTS=covered by existing candidate contract and browser check; passed
PREVIEW_ROUTE_TESTS=passed
FULL_TESTS=437 files passed, 9 PostgreSQL files skipped; 2103 tests passed, 90 skipped
npm run lint=PASS
npm run typecheck=PASS
```

Fresh dev-browser evidence on port 38125:

- `/redesign-preview/shell`: `200`.
- `/__redesign-preview/shell`: `404`.
- Robots: `noindex, nofollow, noarchive, noimageindex`.
- Chinese and English Footer DOM specimens are both visible and language-pure.
- No Footer/navigation link points to `redesign-preview`.
- No visible `File.fileUrl`, `File.filePath`, order, payment, or download data.
- New route had no page error or unexpected console error.
- Mobile menu focus, Escape return, overlay close, body scroll lock, focus-visible style, reduced-motion, and narrow viewport overflow checks passed.

Screenshots were captured with `fullPage`, no temporary focus ring, and inspected individually. PNG dimensions:

```text
zh-shell-1440.png  1440x1231
zh-shell-390.png    390x1766
en-shell-1440.png  1440x1126
en-shell-390.png    390x1717
```

All four screenshots contain the complete Footer. The two English screenshots show only English Footer copy; the two Chinese screenshots show only Chinese Footer copy.

## Build gate

```text
BUILD=OPEN_LOCAL_DOCKER_UNAVAILABLE
```

`docker version` reports the Docker client but cannot connect to the Docker Desktop Linux Engine. A fresh `npm run build` compiled successfully and completed lint/type checking, then failed during static generation because `DATABASE_URL` is unavailable. No production database, fake database URL, seed, migration, deployment, or environment change was used.

## Explicit non-actions

The existing production public routes, root layout, `globals.css`, sitemap, robots, product details, download, payment, OAuth, Runtime Heartbeat, R-008, Prisma, package files, lockfiles, remote, and production environment were not changed. R-008 was not executed. The candidate was not pushed or merged.

## Result artifacts

- `screenshots/zh-shell-1440.png`
- `screenshots/zh-shell-390.png`
- `screenshots/en-shell-1440.png`
- `screenshots/en-shell-390.png`

The final ZIP contains only this Phase 2A.1 documentation directory and its four screenshots; it contains no source archive, `node_modules`, `.next`, `.env`, database, secret, private URL, or Git credential.
