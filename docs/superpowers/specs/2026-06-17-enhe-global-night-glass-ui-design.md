# ENHE Global Night Glass UI Design

## Goal

Unify the whole ENHE AI website around the approved night-mode homepage style without changing product behavior, routes, data flow, payment flow, authentication, or admin workflows.

## Visual Direction

The site uses a single dark visual system:

- Background: deep graphite night surface based on `#22242a` and `#202229`.
- Text: white primary text, muted cool gray secondary text.
- Accent: ENHE orange `#f05a35` for emphasis and positive brand moments.
- Material: translucent frosted glass panels with controlled highlights, blur, subtle borders, and dark shadows.
- Shape: softly rounded cards, fully rounded buttons and small pills.
- Type: Microsoft YaHei UI / Microsoft YaHei / MiSans / HarmonyOS Sans SC stack, with round, polished Chinese rendering and readable English fallback.

## Scope

Included surfaces:

- Public pages: homepage, software listing, online tools, skill learning, tutorials, pricing, legal pages, tool detail pages.
- Account pages: login, register, user center, order detail, payment page.
- Admin pages: dashboard, tool management, orders, payments, refunds, users, settings, categories, tags, tutorials, FAQ, files, audit, license generator.
- Both Chinese and English UI states.
- Desktop and mobile responsive states.

Out of scope:

- Changing business logic.
- Changing route slugs.
- Changing database schema.
- Changing payment, download, login, order, review, or admin behavior.
- Rewriting user-facing content except where an existing UI label is already controlled by the current dictionary.

## System Rules

### Global Tokens

Keep one global dark theme. Extend the existing tokens instead of introducing a new design system dependency.

Required token families:

- `--marketing-bg`
- `--marketing-bg-soft`
- `--marketing-text`
- `--marketing-muted`
- `--marketing-accent`
- `--marketing-button`
- `--marketing-card`
- `--marketing-card-soft`
- `--marketing-border`
- `--marketing-shadow`

### Components

Common public components must inherit the approved style:

- `Container` remains the layout wrapper.
- `Badge` becomes a dark translucent pill.
- `ButtonLink` uses black or orange pill styling, not old blue glow styling.
- `SectionTitle` uses compact, centered or left-aligned typography depending on context, with muted intro text.
- `EmptyState` uses the glass card style.
- `FormSubmitButton` uses the same black/orange/secondary/danger button language.
- `PasswordInput` inherits the orange focus ring and muted icon styling.
- `ToolCard` keeps functionality but uses the new graphite glass, orange accents, and quieter media treatment.

### Forms And Controls

Inputs, selects, textareas, upload controls, filter bars, search bars, and admin forms should use:

- Semi-transparent dark backgrounds.
- `rgba(255, 255, 255, 0.14)` borders.
- Orange focus borders or rings.
- White text and muted placeholder text.
- Stable heights and rounded corners.

### Admin UI

The admin area remains operational and dense enough for work, but visually aligns with the public site:

- Sidebar uses glass surface and orange hover/active accents.
- Admin section titles use the same type scale and muted intro copy.
- Admin inputs/selects/textareas use the shared dark form style.
- Existing data tables, forms, and action buttons keep their structure.

### Responsive Behavior

Mobile must preserve:

- Header usability.
- One-column card/list layouts.
- No horizontal overflow from English labels.
- Touch-friendly buttons.
- Readable tables and admin panels using existing layout constraints where possible.

## Acceptance Criteria

- No public or admin page uses the old cyan/blue primary visual language for core CTAs.
- Public cards, admin panels, forms, empty states, and filter bars share the approved glass material.
- Chinese and English pages render with consistent typography and button sizing.
- Existing behavior tests continue passing.
- TypeScript and lint pass.
- Playwright screenshots are generated for key pages in desktop and mobile where accessible.

