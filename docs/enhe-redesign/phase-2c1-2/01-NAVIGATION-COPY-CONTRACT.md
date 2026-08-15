# Navigation copy contract

Status: PASS

## Approved top-level copy and order

| Position | Chinese | English | Route pair |
| ---: | --- | --- | --- |
| 1 | AI工具 | AI Tools | `/software` · `/en/software` |
| 2 | AI Skill | AI Skills | `/ai-skills` · `/en/ai-skills` |
| 3 | AI资讯 | AI News | `/ai-news` · `/en/ai-news` |
| 4 | AI趋势 | AI Trends | `/ai-trends` · `/en/ai-trends` |
| 5 | 关于我们 | About | `/about` · `/en/about` |
| 6 | 搜索 | Search | `/search` · `/en/search` |

The former English values were `AI tools`, `AI Skill`, `AI news`, `AI trends`, and `About us`. Their capitalization, plurality, or wording did not match the approved contract. No route or ordering change was required.

## Dropdown contract

| Locale | Child 1 | Child 2 |
| --- | --- | --- |
| Chinese | AI 提示词 | AI Skill |
| English | AI Prompts | AI Skills |

The dropdown remains under the second navigation item and retains its two existing routes.

## Language switch

Both locales visibly render `中文 / EN` in that order. The Chinese and English anchors always exist, exactly one has `aria-current="page"`, and the paired route is preserved across all six tested route pairs.

## Shared typed source

`REDESIGN_NAV_ITEMS` is a typed `Record<RedesignLocale, ReadonlyArray<RedesignNavItem>>`. The production adapter selects one locale array and passes it to `EnheRedesignHeader`. That component maps the same `navItems` value for desktop navigation and passes the identical value to `EnheRedesignMobileMenu`; there is no second mobile dictionary.

The typed `RedesignLanguageHrefs` object likewise supplies both locale destinations to the desktop and mobile instances of `EnheRedesignLanguageSwitch`.

## Preserved boundaries

- Chinese top-level order and routes are unchanged.
- English route order and routes are unchanged.
- Desktop and mobile interaction structure is unchanged.
- Login/account behavior is unchanged.
- No Header CSS, layout, inline style, or `!important` rule was added.
