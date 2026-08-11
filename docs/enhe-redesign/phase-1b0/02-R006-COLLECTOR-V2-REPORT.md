R006_V2_STATUS=COMPLETE_WITH_OPEN_CONFLICTS
V1_AUTOMATIC_REDIRECT_DEFECT=CONFIRMED
V2_ALLOW_AUTO_REDIRECT=FALSE

# R-006 public URL baseline V2

## Collection result

The V2 collection ran at `2026-08-10T20:33:31.1130635Z` with User-Agent `ENHE-Redesign-ReadOnly-Audit/1.1`, one worker, and at least 350 ms between HTTP requests.

| field | result |
|---|---:|
| sitemap HTTP status | 200 |
| unique sitemap URLs | 528 |
| explicit core-contract URLs | 24 |
| union after de-duplication | 534 |
| core-only URLs | 6 |
| total HTTP requests including sitemap and redirect hop | 536 |
| fetch errors | 0 |
| initial 200 | 528 |
| initial 301 | 1 |
| initial 302 | 0 |
| initial 404 | 5 |
| final 200 | 529 |
| final 404 | 5 |
| sitemap SHA-256 | `9597C70AC8A859FDFB434DAC3FA835EC6CC0E6C4689579324DF65EFD29522C4B` |

The handler is explicitly constructed as `System.Net.Http.HttpClientHandler`, and `AllowAutoRedirect` is set to `$false`. The collector manually follows no more than five hops and records `initial_http_status`, `first_redirect_target`, `redirect_chain`, `redirect_hop_count`, `final_url`, and `final_http_status`.

## Redirect evidence

- True initial 301/302 count: 1 (`301=1`, `302=0`).
- Sitemap redirect count: 0.
- Core redirect count: 1.
- Chain: `/online-tools` returned 301, redirected once to `/account-services`, and finished at 200 with the `/account-services` canonical.

This is direct confirmation that V1's final-200-only behavior concealed an initial redirect.

## Six former `NEEDS_DECISION` core URLs

| path | sitemap | initial | final | result |
|---|---|---:|---:|---|
| `/help` | no | 404 | 404 | `CORE_404` |
| `/en/help` | no | 404 | 404 | `CORE_404` |
| `/updates` | no | 404 | 404 | `CORE_404` |
| `/en/updates` | no | 404 | 404 | `CORE_404` |
| `/online-tools` | no | 301 | 200 | `CORE_REDIRECT` to `/account-services` |
| `/skill-learning/build-your-own-x` | no | 404 | 404 | `CORE_404` |

They are no longer status-unknown; their current real HTTP outcomes are recorded. Their product/SEO disposition still requires an owner decision.

## Diff V2

| classification | count |
|---|---:|
| `MATCHED` | 493 |
| `CODE_PRODUCTION_DRIFT` | 25 |
| `SITEMAP_REDIRECT` | 0 |
| `CORE_REDIRECT` | 1 |
| `SITEMAP_404` | 0 |
| `CORE_404` | 5 |
| `SITEMAP_NOINDEX` | 0 |
| `CANONICAL_MISMATCH` | 0 |
| `HREFLANG_MISMATCH` | 0 |
| `LANGUAGE_PARTNER_MISSING` | 2 |
| `CONTENT_LANGUAGE_MISMATCH` | 8 |
| `LOCAL_ONLY` | 15 |
| `PUBLIC_ONLY` | 0 |
| `NEEDS_DECISION` | 0 |
| total | 549 |

`LOCAL_ONLY` includes expected non-sitemap patterns such as auth, search, validation, and daily routes; the category is evidence, not an automatic defect verdict.

## Required historical comparisons

- Original 32 drift paths still publicly exist: **32/32**. V2 assigns 25 to `CODE_PRODUCTION_DRIFT` and seven Chinese paths to the higher-priority `CONTENT_LANGUAGE_MISMATCH` class.
- Original two missing English partners still exist: **2/2**, both HTTP 200 AI-news pages.
- Original eight non-`/en` `content-language=en-US` observations still exist: **8/8**. The V2 `CONTENT_LANGUAGE_MISMATCH` count is eight.
- `/help` and `/updates` also return `en-US` on their 404 fallback responses; they are correctly counted as `CORE_404`, not added to the eight 200-page language mismatches.

Evidence files: `03-R006-PUBLIC-URL-BASELINE-V2.csv` and `04-R006-DIFF-V2.csv`.
