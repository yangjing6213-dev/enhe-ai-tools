# Browser and SSR acceptance

Status: PASS

The local development server used the disposable validation database and formal production routes. Preview routes were not used as acceptance evidence.

## Formal route matrix

| Route | HTTP | Exact locale navigation | Verified filing | Generic filing absent | Console/page errors |
| --- | ---: | --- | --- | --- | --- |
| `/` | 200 | PASS | PASS | PASS | 0 / 0 |
| `/en` | 200 | PASS | PASS | PASS | 0 / 0 |
| `/software` | 200 | PASS | PASS | PASS | 0 / 0 |
| `/en/software` | 200 | PASS | PASS | PASS | 0 / 0 |
| `/skill-learning` | 200 | PASS | PASS | PASS | 0 / 0 |
| `/en/skill-learning` | 200 | PASS | PASS | PASS | 0 / 0 |
| `/ai-news` | 200 | PASS | PASS | PASS | 0 / 0 |
| `/en/ai-news` | 200 | PASS | PASS | PASS | 0 / 0 |
| `/ai-trends` | 200 | PASS | PASS | PASS | 0 / 0 |
| `/en/ai-trends` | 200 | PASS | PASS | PASS | 0 / 0 |
| `/about` | 200 | PASS | PASS | PASS | 0 / 0 |
| `/en/about` | 200 | PASS | PASS | PASS | 0 / 0 |

All six Chinese/English route pairs were exercised in both directions through the visible language links. Guest login links, desktop dropdowns, mobile drawer labels/dropdowns, Escape close behavior, and focus return were verified.

Additional checks passed:

- no `Preview` or `Candidate` marker on formal routes;
- no horizontal overflow at desktop, 390px mobile, 320px narrow, or 720px 200%-equivalent layout width;
- keyboard navigation produced a visible `:focus-visible` indicator;
- reduced-motion media preference was active and stable;
- raw server HTML for `/` and `/en` contained exact navigation, `中文` and `EN`, and both verified filing values;
- raw server HTML contained neither generic filing phrase.

## Screenshots

| Evidence | Width | Full-page height | File size |
| --- | ---: | ---: | ---: |
| `screenshots/zh-home-production-copy-fixed-1440.png` | 1440 | 3786 | 466481 bytes |
| `screenshots/zh-home-production-copy-fixed-390.png` | 390 | 3431 | 174743 bytes |
| `screenshots/en-home-production-copy-fixed-1440.png` | 1440 | 3896 | 488228 bytes |
| `screenshots/en-home-production-copy-fixed-390.png` | 390 | 3649 | 179465 bytes |

The harness removed only the local `<nextjs-portal>` development indicator before capture. It did not remove or alter application Header, Footer, filing, content, CSS, or support-widget DOM. All four images were opened and visually inspected: Header and Footer are complete, exact English navigation is legible, verified filing values are present, and no clipping, horizontal overflow, candidate filing placeholder, contrast regression, or blank header band is visible.
