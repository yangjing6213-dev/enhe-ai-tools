# EBOS SEO Evidence

## Role

SEO Evidence records read-only page structure readiness for ENHE. It helps EBOS understand whether public pages expose the basic signals search engines need before deeper Search Console data is connected.

## Difference From Search Console

This v1 evidence does not read Google Search Console. It cannot prove impressions, clicks, CTR, rankings, or indexing status. It only inspects public site structure such as sitemap, robots, metadata, canonical links, structured data, headings, internal links, and product/FAQ signals.

## Current v1 Scope

The v1 script reads public ENHE URLs only:

- `sitemap.xml`
- `robots.txt`
- Home page
- Software listing and product pages
- AI news pages
- AI trends pages
- Account services pages
- Skill learning pages

If sitemap or page requests fail, the script records warnings and still generates evidence.

## Scoring

Page score uses:

- Title: 15
- Meta description: 15
- H1: 10
- Canonical: 10
- Structured data: 15
- OpenGraph: 5
- Twitter Card: 5
- Internal links: 10
- Product detail Product/FAQ signals: 15

The report overall score is the average audited page score.

## Action Items

Action items are generated when:

- Sitemap or robots is unavailable.
- Pages miss title, description, h1, canonical, or structured data.
- Software detail pages miss Product or FAQ signals.
- Pages lack useful internal links.

## Future GSC Integration

Later SEO evidence should add Search Console impressions, clicks, CTR, query, page, and indexing data as a separate evidence input. Until then, all ranking claims must remain low confidence.

## Run

```bash
npx tsx scripts/generate-ebos-seo-evidence.ts
npx tsx scripts/index-ebos-evidence.ts
```
