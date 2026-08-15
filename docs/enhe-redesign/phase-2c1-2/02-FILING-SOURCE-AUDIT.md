# Filing source audit

Status: PASS

`VERIFIED_FILING_SOURCE=TRACKED_EXISTING_FOOTER`

## Sources audited

1. The redesign Footer's prior generic candidate copy: `ICP备案 · 公安备案` and `ICP filing · Public-security filing`. These are category labels, not valid filing values.
2. The tracked legacy production `SiteFooter`, which already contained concrete bilingual filing labels and official links.
3. Git history for that tracked Footer, including `189d0fd Add ICP filing footer link` and `aea39c2 fix english routes and ui audit issues`.
4. The production redesign adapter and Preview routes, to identify whether candidate data crossed into production.

No production database, secret, internet lookup, untracked configuration, or `.env` file was used. No company address or name was treated as a filing number.

## Verified values

| Field | Chinese label | English label | Trusted href |
| --- | --- | --- | --- |
| ICP | 闽ICP备2025092404号-2 | ICP Filing: Min ICP No. 2025092404-2 | `https://beian.miit.gov.cn/` |
| Public security | 闽公网安备 35030302900035号 | Fujian Public Security Record No. 35030302900035 | `https://beian.mps.gov.cn/#/query/webSearch?code=35030302900035` |

The shared production values are defined as optional structured data in `src/lib/production-filing.ts`. The legacy `SiteFooter` now consumes the same tracked values, preserving its labels, links, icon alt text, and order.

## Rendering policy

- The production redesign adapter passes only `PRODUCTION_FILING[locale]`.
- `EnheRedesignFooter` accepts optional filing data and renders only present entries.
- When no entry exists, no filing paragraph or empty filing container is emitted; the copyright line remains and no placeholder spacing is reserved.
- A supplied verified object renders its actual labels and links.
- Generic labels are not accepted as production data.
- The four-column Footer structure, dark-green visual, spacing, and responsive rules are unchanged.

## Preview separation

The candidate specimen remains available only through `src/components/redesign/preview-filing.ts` and is passed explicitly by Preview routes. The production adapter does not import that module. Tests assert this source boundary and the production browser/SSR checks confirm the generic specimen is absent from formal routes.

Final production state:

```text
PRODUCTION_FILING_RENDERED=YES
ACTUAL_ICP_VALUE_RENDERED=YES
ACTUAL_PUBLIC_SECURITY_VALUE_RENDERED=YES
GENERIC_ZH_FILING_VISIBLE=NO
GENERIC_EN_FILING_VISIBLE=NO
```
