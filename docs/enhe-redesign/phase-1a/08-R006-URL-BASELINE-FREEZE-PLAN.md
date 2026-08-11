# R-006 URL baseline freeze plan

`R006_STATUS=OPEN`
`R006_PHASE1B_GATE=BLOCKED`

Before any Phase 1B route or global-link change, capture a production snapshot with these fields: deployment SHA, production image digest, URL, HTTP status, redirect target, canonical, hreflang, robots, index/noindex, sitemap inclusion, page language, language counterpart, traffic, external links, Search Console evidence, freeze timestamp, code/source, and review state. The snapshot command and output must be reproducible, for example:

```text
python scripts/audit-public-urls.py --base https://www.enhe-tech.com.cn --out docs/enhe-redesign/audit/url-baseline.csv
```

Required artifacts: `url-baseline.csv`, a named production SHA/digest, code-vs-production difference classification, human approver role, rollback file, and an explicit Phase 1B gate decision. Values not captured at this design-only baseline remain `UNKNOWN`, never guessed. Public routes, sitemap, canonical, and global links stay frozen until that evidence is approved.
