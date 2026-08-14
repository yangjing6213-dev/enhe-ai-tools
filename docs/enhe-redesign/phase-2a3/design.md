# ENHE Phase 2A.3 AI Tools Catalog Candidate Design

Status: approved design, pending implementation

Baseline: `596dae4` on `codex/enhe-public-shell-candidate-v1`

## Goal

Build an isolated bilingual AI tools catalog candidate at `/redesign-preview/software` without changing production `/software`, `/en/software`, the root layout, `globals.css`, sitemap, robots, R-008, product detail/download/commerce behavior, or database code.

## Design direction

The candidate keeps the approved ENHE editorial product language: warm white space, near-black type, sage action color, yellow labels, flat deep ink-green footer, thin rules, restrained motion, and semantic links. It is a catalog rather than a marketing wall: the user can scan by category, compare the approved highlighted groups, browse all records, and follow an ordinary public detail link.

## Route and shell

- Route: `/redesign-preview/software`.
- Development: HTTP 200 with one resolved locale.
- Production: `notFound()` and HTTP 404.
- Metadata: `noindex`, `nofollow`, `noarchive`, `noimageindex`; no production canonical, hreflang, sitemap, or navigation entry.
- The existing approved header and footer receive the same `zh` or `en` locale as the page. The preview label remains outside the catalog composition.
- The route uses a standalone document wrapper where required by this repository's App Router structure, without modifying any production layout.

## Data boundary

Three typed modules own the candidate data:

- `software-copy.ts`: bilingual page title, intro, section descriptions, category labels, load-more labels, and pagination labels.
- `software-categories.ts`: the exact seven-category order: `全部产品`, `AI Skill`, `视频生成`, `图片处理`, `语音音频`, `AI智能体`, `效率工具`, with exact English mirrors.
- `software-products.ts`: the twelve frozen Phase 1A records, in the approved order, each with id, bilingual name, type, description, price/status, category, detail path, and optional local public media metadata.

The candidate does not fetch production data, read Prisma, inspect `File.fileUrl` or `File.filePath`, call an API, or create delivery/payment/OAuth behavior. Detail paths are relative public route strings using the existing Chinese path and its `/en` mirror. No new product, renamed record, price, free status, category, or detail path is introduced.

## Page composition

The server-rendered composition is:

`Header → H1 and intro → centered category trigger → New releases → Featured products → All products → Load more + crawlable page 2 link → Footer`.

Exactly three named catalog sections are rendered:

1. New releases: four approved records.
2. Featured products: three approved records.
3. All products: twelve approved records, with the candidate initially exposing nine and the remaining three revealed by `加载更多` / `Load more`.

The page has exactly one H1. Product cards are semantic articles containing one factual description and one distinct ordinary detail link. The card is a small client boundary only because its local image needs an `onError` text fallback; Next still pre-renders its semantic HTML for the server response. No duplicated bilingual title, keyword wall, verified rating, delivery claim, or fake inventory state is emitted.

## Interaction boundaries

- Category selector: a small client island owns open/close, selected option, outside click, Escape, ArrowUp/ArrowDown, Enter, Space, focus return, and a downward mobile swipe close. Desktop uses a centered deep ink-green layer; mobile uses a bottom sheet. It filters the all-products cards without changing the URL or production route.
- New releases and Featured products: each horizontal region is a focusable client island below 768px. It uses native `overflow-x: auto`, `scroll-snap-type: x mandatory`, 18px gaps, start alignment, a visible next-card peek, and ArrowLeft/ArrowRight scroll only after user input. There is no timer or automatic movement.
- Load more: a small client island sets the all-products root to loaded, recomputes card visibility through the same category predicate, reveals the hidden three records, and hides the button. The ordinary `?page=2` link with `rel="next"` remains present and usable without JavaScript. Category changes and load-more dispatch the same catalog visibility event so neither interaction can bypass the other.

All controls are at least 44px, have visible focus treatment, and retain semantic names. The document root has no horizontal overflow at 390px.

## Media contract

The candidate reuses the five approved Phase 2A.2 local media under `public/redesign/home/**` and copies only the two approved Phase 1A catalog media not already present into `public/redesign/software/**`. Their SHA-256 values must match the Phase 1A manifest. Other records use a fixed 16:9 text cover with the product name; this is an intentional approved-media fallback, not newly generated artwork. All media has width, height, aspect-ratio, alt text, and a visible loading-error fallback.

## Responsive contract

- Grid columns: 4 at 1440px, 3 at 1024px, 2 at 768px, and 1 at 390px and 320px.
- New releases: 80vw cards below 768px.
- Featured products: 84vw cards below 768px.
- Both horizontal rows: 18px gap, mandatory x snap, start alignment, touch/trackpad support, and no automatic movement.
- All products: one vertical column on mobile, never a horizontal rail.

## Testing and acceptance

TDD starts with expected RED tests for frozen data, category order and interaction, three section counts, grid and mobile markers, load-more plus `?page=2` crawlability, locale propagation, metadata, production guard, accessibility, and forbidden-path boundaries. GREEN requires focused candidate tests, lint, typecheck, the full test suite, and browser acceptance for Chinese and English at 1440/1024/768/390/320. Build uses one temporary no-volume `postgres:16-alpine` container only when Docker is available; migrations run without seed, the build is run, and the container is removed. Production data and environment files remain untouched.

## Commit contract

The implementation keeps exactly these five commits, in order:

1. `feat(catalog): add typed bilingual AI tools candidate data`
2. `feat(catalog): add category selector and three-section layout`
3. `feat(catalog): add responsive mobile product browsing`
4. `test(catalog): add bilingual AI tools candidate regression`
5. `docs(catalog): record phase 2A.3 AI tools candidate review`

The design document is included in the required Phase 2A.3 documentation scope and will not create a sixth commit. No push, amend, reset, restore, clean, stash, checkout, switch, merge, rebase, fetch, or pull is permitted.
