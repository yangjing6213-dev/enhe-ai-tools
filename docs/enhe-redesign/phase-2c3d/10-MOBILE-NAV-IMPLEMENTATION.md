# Mobile Navigation Implementation

## Authority and selected design

- Source branch: `codex/enhe-motion-product-stage-v1`
- Source HEAD: `f895dbee6434eb07ec1414e06997353973b2c1c4`
- Implementation branch: `codex/enhe-motion-mobile-nav-v1`
- Prototype authority commit: `82bb4c2c34a9481a60ec566134931895e3020f62`
- Mobile-navigation prototype commit: `cc65c799e0534e4c8d75de1ab8fcc3af9bfd06e9`
- User-selected variant: `directional-drawer`
- Code commit: `49bbd837edbd5a5d39b13485ad628b477e09490c`

The prototype branch remained read-only. No prototype commit was cherry-picked and no preview
route or component was copied into production.

## Production ownership

```text
CURRENT_MOBILE_NAV_TRIGGER_PATH=src/components/redesign/enhe-redesign-mobile-menu.tsx
CURRENT_MOBILE_NAV_COMPONENT_PATH=src/components/redesign/enhe-redesign-mobile-menu.tsx
CURRENT_MOBILE_NAV_STYLE_PATH=src/styles/redesign/shell.css
CURRENT_MOBILE_NAV_MOUNT_PATH=src/components/redesign/enhe-redesign-header.tsx
CURRENT_MOBILE_NAV_STATE_MODEL=authoritative_boolean_open_plus_exit_layer
CURRENT_MOBILE_NAV_BREAKPOINT=(width < 768px)
CURRENT_FOCUS_MODEL=first_control_focus_plus_document_tab_trap_plus_focus_return
CURRENT_SCROLL_LOCK_MODEL=body_inline_overflow_save_restore
CURRENT_STACKING_MODEL=drawer_40_overlay_39_support_10
```

The drawer keeps the desktop header's `navItems` and account model. Copy, order, URLs, language
switching, search, login, and conditional admin visibility are unchanged.

```text
NAV_ITEM_COUNT=6
NAV_ITEM_ORDER_ZH=AI工具|AI Skill|AI资讯|AI趋势|关于我们|搜索
NAV_ITEM_ORDER_EN=AI Tools|AI Skills|AI News|AI Trends|About|Search
LANGUAGE_SWITCH_POSITION=outside_drawer_before_trigger
SEARCH_POSITION=sixth_navigation_item
LOGIN_POSITION=after_navigation_in_mobile_account_region
```

## Directional drawer contract

| Profile | Phase | Drawer | Overlay | Duration | Easing |
| --- | --- | --- | --- | --- | --- |
| Pointer | Open | current/100% to 0 | current/0 to 1 | 230ms / 180ms | `[0.16, 1, 0.3, 1]` |
| Pointer | Close | current/0 to 100% | current/1 to 0 | 190ms / 160ms | `[0.16, 1, 0.3, 1]` |
| Keyboard | Open/close | opacity only | opacity only | 100ms | linear |
| Reduced motion | Open/close | opacity only | opacity only | 80ms | linear |

The existing `motion/react` dependency is reused. A pure resolver in
`src/lib/motion/mobile-nav-motion.ts` owns the four profiles. No dependency, CSS transition,
spring, bounce, overshoot, drag, swipe, stagger, blur, rotation, 3D transform, layout-property
animation, polling loop, or permanent `will-change` was added.

## Interruption and lifecycle behavior

- Every animation receives explicit current-rendered-value to target keyframes. This prevents a
  cancelled WAAPI animation from exposing a stale inferred origin.
- A new intent snapshots opacity and transform strings before cancelling active controls, then
  reapplies the snapshot synchronously.
- Keyboard and reduced-motion opening from a translated pointer state uses completion-driven
  fade-out, hidden transform normalization, then fade-in. The two phases stay within 100ms or 80ms.
- `animationIntentRef` rejects stale completions; `openRef` is the current intent.
- Close is idempotent. A repeated close during exit does not cancel the only exit animation.
- The exit layer unmounts only when the current close completes.
- Route anchors perform synchronous menu-state cleanup without delaying native navigation.

## Accessibility and cleanup

- The trigger retains `aria-expanded`, `aria-controls`, and its accessible label.
- The drawer is a named modal dialog; the closed exit layer is inert and `aria-hidden`.
- Opening focuses the first control. Tab and Shift+Tab wrap within the drawer.
- Escape and overlay close are supported; focus returns to the canonical trigger.
- Body overflow is restored to its previous inline value.
- A 767px to 768px resize removes the mobile layer, releases modal state, and focuses the first
  visible desktop navigation link.
- Ordinary links remain links; invalid `aria-selected` semantics were not introduced.

## Scope boundary

The support launcher remains z-index 10 below overlay 39 and drawer 40. Its 44x44 icon mode,
52px compact exclusion, 104px expanded exclusion, and 483/484px boundary are unchanged.

Only two production files changed:

- `src/components/redesign/enhe-redesign-mobile-menu.tsx`
- `src/lib/motion/mobile-nav-motion.ts`

Category Layer, Product Stage, desktop header geometry, footer, support geometry, product data,
pagination, SEO, SSR data, Prisma, migrations, packages, and lockfile are unchanged.
