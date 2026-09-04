# EBOS GEO Evidence

## Role

GEO Evidence records whether ENHE pages are structurally ready to be understood, summarized, and cited by generative search and answer engines.

## Difference From SEO

SEO focuses on crawl, index, metadata, links, and search result readiness. GEO focuses on answerability and citation readiness: clear entities, summaries, FAQ, HowTo structure, author or brand signals, dates, sources, and structured data.

## Current v1 Scope

The v1 report is only AI citation readiness. It does not prove that ChatGPT, Perplexity, Gemini, Claude, Bing Copilot, Kimi, or Doubao currently cites ENHE.

## Scoring

Page score uses:

- Clear brand or product entity: 15
- Summary or introduction: 10
- FAQ: 15
- HowTo/tutorial/steps: 10
- Purchase/pricing/audience information: 10
- Author or brand signal: 10
- Date/update signal: 5
- External source or citation links: 10
- Structured data: 15

## Page Structure Impact

Answer engines are more likely to summarize a page accurately when the page has:

- A named entity near the top.
- A concise summary.
- Direct question-and-answer blocks.
- Step-by-step instructions.
- Dates and source links for time-sensitive claims.
- Structured data that clarifies page type.

## Action Items

Action items are generated when:

- Product pages lack FAQ, summary, entity, or HowTo signals.
- News pages lack source or date signals.
- Pages lack brand or author signals.
- AI Search Probe is not connected.

## Future AI Search Probe

Later GEO evidence should add real probe results from ChatGPT, Perplexity, Gemini, Claude, Bing Copilot, Kimi, Doubao, and other answer engines. Those results should be stored as `geo_evidence` or a compatible child evidence envelope with query, provider, answer, citation, competitor, and confidence fields.

## Run

```bash
npx tsx scripts/generate-ebos-geo-evidence.ts
npx tsx scripts/index-ebos-evidence.ts
```
