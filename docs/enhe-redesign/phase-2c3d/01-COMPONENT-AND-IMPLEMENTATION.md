# Component Audit and Implementation

## Pre-change audit

`CURRENT_CATEGORY_COMPONENT=src/components/redesign/software/EnheRedesignSoftwareCategorySelector.tsx`

`CURRENT_CATEGORY_STATE_MODEL=selectedIndex + focusedIndex + open; optional server navigation`

`CURRENT_ACCESSIBILITY_MODEL=aria-expanded/aria-controls, Escape, arrows, Enter/Space, outside pointer close, focus return; mobile focus trap, aria-modal, body lock, and explicit close control were absent`

`CURRENT_MOBILE_BEHAVIOR=fixed bottom sheet below 768px, overlay, 48px downward swipe close, existing customer-support stacking protection`

The attachment said to preserve the mobile focus trap, body lock, and modal semantics, but
the source baseline did not contain them. The implementation adds only that missing lifecycle
inside the same category component.

## Implemented contract

| Profile | Duration | Animated properties | Start | End |
| --- | ---: | --- | --- | --- |
| Desktop pointer | 190ms | opacity, transform | opacity 0; translateY(4px) scale(0.98) | opacity 1; identity |
| Mobile pointer | 230ms | opacity, transform | opacity 0; translateY(12px) scale(1) | opacity 1; identity |
| Keyboard | 100ms | opacity only | opacity 0 | opacity 1 |
| Reduced motion | 80ms linear | opacity only | opacity 0 | opacity 1 |

Desktop transform origin is sampled from the trigger center against the untransformed panel
box. The panel remains server-rendered and hidden while closed, preserving the existing seven
category SSR contract. Exit completes before `hidden` is restored. Mobile open state uses a
dialog, modal semantics, focus containment, body scroll lock, Escape, explicit close control,
and trigger focus return.

Mixed input is explicit: a pointer-opened layer closed by Escape first switches to the 100ms
keyboard profile. Reduced-motion preference is initialized after hydration with `matchMedia`,
so the server and first client render stay identical.
