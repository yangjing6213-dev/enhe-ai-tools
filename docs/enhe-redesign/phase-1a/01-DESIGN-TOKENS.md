---
locked: true
contract: ENHE Phase 1A.1
---

# ENHE visual tokens — approved contract

The visual language keeps warm white space, near-black type, neutral secondary text, sage actions, pale grey-green surfaces, yellow labels/stars, a deep ink-green footer, thin rules, and restrained motion. The home composition is centered and editorial; the large product stage is a neutral cover area and never imitates a software interface.

## Font stacks

- Chinese: `"Microsoft YaHei", "PingFang SC", "Noto Sans SC", system-ui, sans-serif`.
- English: `Inter, Arial, system-ui, sans-serif`.

## Required tokens

| token | value | purpose |
|---|---|---|
| `--page-bg` | `#FDFDFD` | page background |
| `--text` | `#080808` | primary text |
| `--text-muted` | `#5F665F` | secondary text |
| `--action` | `#527E54` | primary button |
| `--action-hover` | `#416A44` | button hover |
| `--surface` | `#EEF2EE` | stage/card surface |
| `--yellow` | `#FFD60A` | label and stars |
| `--footer` | `#071512` | flat footer |
| `--border` | `#D9E0D9` | fine rules |
| `--focus` | `#FFD60A` | focus outline |
| `--content-max` | `1200px` | desktop content width |
| `--home-max` | `920px` | centered home content |
| `--article-max` | `680px` | reading measure |
| `--button-h` | `48px` | button height |
| `--button-r` | `4px` | button radius |
| `--input-h` | `48px` | input height |
| `--input-r` | `4px` | input radius |
| `--card-r` | `12px` | card radius |
| `--card-gap` | `16px` | product card gap |
| `--section-y` | `88px` | section rhythm |
| `--header-h` | `72px` | desktop header height |
| `--footer-gap` | `36px` | footer column gap |
| `--motion-fast` | `170ms` | hover/focus |
| `--motion-panel` | `200ms` | category layer |
| `--motion-product` | `300ms` | product transition |
| `--motion-review` | `5000ms` | review interval |
| `--motion-resume` | `6000ms` | manual resume delay |
| `--z-header` | `20` | business header |
| `--z-layer` | `40` | category layer |
| `--z-focus` | `60` | focus ring |

Contrast evidence: text/page `19.69:1`, muted/page `5.81:1`, action/white `4.70:1`, footer/white `18.67:1`, text/yellow `14.19:1`. The focus ring uses the yellow `--focus` token at 3px with 2px offset plus a 7px near-black outer guard, preserving a contrast edge on light and dark surfaces. No gradients, glow, particles, glass, glitch, oversized shadow, or looping background motion are permitted.

## Phase 1A.2 polish values

- Public product media: fixed `1672 × 941` source dimensions, CSS `aspect-ratio: 16 / 9`, `object-fit: cover`, and a solid `rgba(7,21,18,.9)` name plate; the text fallback remains available if an image fails.
- Desktop brand label: 10px/900 text, 18px minimum height, 2px × 7px padding; it sits below the ENHE logo without changing the 72px header token.
- Mobile horizontal cards below 768px: new releases `80vw`, featured products `84vw`, gap `18px`, scroll snap mandatory.
- Provider icon: `20px × 20px`, a fixed 20px flex basis, with a 10px icon/text gap inside the existing 48px button.
