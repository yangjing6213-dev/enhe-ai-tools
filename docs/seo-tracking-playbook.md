# SEO Tracking Playbook

## Recommended External Tools

1. Google Search Console
   - Use it for Google search impressions, clicks, CTR, average position, indexing status, sitemap submission, and Core Web Vitals reports.
   - Best question it answers: which keywords and pages are already visible in Google?

2. Bing Webmaster Tools
   - Use it for Bing search performance, crawl/indexing diagnostics, sitemap submission, and Microsoft search ecosystem visibility.
   - Best question it answers: which pages and queries are gaining visibility outside Google?

3. PageSpeed Insights
   - Use it for real-user Core Web Vitals and lab performance checks.
   - Best question it answers: which pages may lose SEO value because of speed or experience issues?

4. On-site SEO Insights
   - Use `/admin/seo-insights` for what external tools cannot fully explain: what visitors did after landing, which pages converted, which internal searches expose content gaps, and what content/product actions should happen next.

## On-Site Tracking Scope

The site records public SEO landing views through `seo_landing_view` analytics events.

Each event can include:
- landing path
- content type
- source and medium
- search engine
- available search query
- referrer host
- UTM source, medium, and campaign
- locale

Excluded from SEO landing tracking:
- admin pages
- API routes
- user center
- order/payment pages
- login/register pages

## How To Use The Data

Review `/admin/seo-insights` weekly.

Use the report this way:
- High search volume with weak content coverage: publish an AI news article or topic page.
- AI news traffic with no software/service clicks: add related tools, services, tutorials, and CTAs.
- Search terms containing account/subscription/platform names: create or improve account service consultation content with compliance-safe wording.
- Search terms containing tutorial/how-to/prompt words: create skill learning articles or courses.
- Search terms containing local/private/deployment/agent/tool words: evaluate software, local deployment packages, or workflow templates.

## Next Integration Stage

The next high-value step is connecting Google Search Console API and importing query/page metrics into a dedicated table. That will add impression, click, CTR, and position data to the current on-site behavior layer.
