# Global shell contract — rework

## Desktop header

The left brand region stacks the ENHE logo and the independently made yellow label `给人生加一个 AI 外挂`. At widths >=768px this header copy is the only visible/accessibly exposed yellow label; the duplicate above the home H1 is hidden and `aria-hidden=true`. The prototype uses the repository-owned source `public/images/enhe-logo.svg`, materialized as the in-scope design asset `prototype/assets/enhe-logo.svg`; no TypeShare asset is used. The right sequence is fixed and must remain in this order: `AI工具`, `AI Skill`, `AI资讯`, `AI趋势`, `关于我们`, search icon, `中文 / EN`, then sign-in/user entry. The administrator entry is not exposed to visitors. The home header is ordinary document flow (no sticky/fixed positioning); business pages may use a light sticky header with only a thin divider.

## Mobile header

Below 768px only the ENHE logo, locale toggle, and menu button are visible in the header. The header label is `hidden` and `aria-hidden=true`; on the home page the same approved label is exposed above H1. JavaScript uses `matchMedia('(max-width: 767px)')` to keep both DOM copies synchronized across live viewport changes. The disclosure supports keyboard focus and Escape.

## Footer

The footer is a flat four-column ink-green band: `ENHE AI`, `帮助与服务`, `合规条款`, `公司信息`. It contains the approved brand lines, support/legal/company links, and `© ENHE AI`, ICP filing, and public-security filing. Locale links exist only in the header.
