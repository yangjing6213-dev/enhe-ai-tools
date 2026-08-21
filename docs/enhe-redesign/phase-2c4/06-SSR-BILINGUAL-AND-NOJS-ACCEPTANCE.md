# SSR, Bilingual, and No-JS Acceptance

## Bilingual shell and SEO

The four formal public routes returned 200 with matching language headers, titles, H1s, canonical URLs, three hreflang alternates, index/follow metadata, and valid JSON-LD. Header navigation order and Footer text matched the approved Chinese and English contracts. Chinese and English filing strings were both visible.

## Home SSR

- SSR home product count: 5.
- Order: `ultimate-edition`, `infinitetalk`, `ai-voice`, `lumi-os`, `faceswap-studio`.
- Product fallback usable without JavaScript: yes.
- Default interactive product visible: yes.
- Hidden media requests before activation: 0.
- Formal no-JS cases: 4.
- Home SSR cases: 2 locales × 4 widths = 8.
- Hydration transition cases: 2.

## Software SSR and pagination

- Category links: 7 (`all`, `skill`, `video`, `image`, `audio`, `agent`, `efficiency`).
- Product list visible in SSR: yes.
- Page size: 12.
- Pagination crawlable: yes, including the next relation.
- Deterministic disposable dataset: 25 synthetic local records, yielding `12/12/1` over three pages.

The 25 records were acceptance fixtures in the disposable tmpfs database. They are not production catalog data and were destroyed with the container.

- `SEO_SSR_CONTRACT_STATUS=PASS`
- `BILINGUAL_CONTRACT_STATUS=PASS`
- `SSR_PRODUCT_ORDER_MATCH=YES`
- `SSR_DEFAULT_PRODUCT_VISIBLE=YES`
- `SSR_PRODUCT_FALLBACK_USABLE=YES`
