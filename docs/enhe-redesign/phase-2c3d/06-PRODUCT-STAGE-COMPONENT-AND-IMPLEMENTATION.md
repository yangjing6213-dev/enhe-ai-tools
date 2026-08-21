# Product Stage Component and Implementation

## Existing production model

- Component: `EnheRedesignProductShowcase`
- State: one authoritative index into the existing five-item `HOME_PRODUCTS` array
- Order: Ultimate Edition, InfiniteTalk, AI Voice, Lumi-OS, FaceSwap Studio
- Switching before this phase: manual previous/next and ArrowLeft/ArrowRight, with one rendered
  product and no automatic rotation
- Media: existing per-product loading/ready/error state and existing public image records

## Implemented transition

The component now renders the authoritative current product and, only while a transition is
active, one inert outgoing layer. Motion is restricted to opacity and transform.

| Input profile    | Incoming                   | Outgoing                   | Duration | Easing              |
| ---------------- | -------------------------- | -------------------------- | -------- | ------------------- |
| Pointer forward  | `translateX(12px)` to `0`  | `0` to `translateX(-12px)` | 240ms    | `[0.16, 1, 0.3, 1]` |
| Pointer backward | `translateX(-12px)` to `0` | `0` to `translateX(12px)`  | 240ms    | `[0.16, 1, 0.3, 1]` |
| Keyboard         | instant replacement        | instant removal            | 0ms      | linear              |
| Reduced motion   | opacity only               | opacity only               | 80ms     | linear              |

There are no timers, autoplay, queued transitions, springs, bounce, rotation, blur, layout
properties, permanent `will-change`, or `transition: all`.

## Latest-intent behavior

- `indexRef` remains authoritative during rapid events.
- Every new intent stops obsolete Motion controls before calculating the next state.
- A transition key prevents a stale completion callback from removing the current layer.
- A rapid reversal resumes a returning layer from its computed opacity and transform rather than
  flashing from a forced start frame.
- Existing loaded media state is retained, preventing a reused image from remaining in a false
  loading state.

## Accessibility and SSR boundary

- Previous/next buttons remain stable and keep focus; each references the active panel through
  `aria-controls`.
- The counter is a polite, atomic live region and names the current product.
- The current layer uses `aria-current`; the transient previous layer is `aria-hidden` and inert.
- Arrow navigation is instant. Arrow keys on the current CTA are not intercepted, so its focus is
  not hidden or removed.
- Server HTML contains only the default `ultimate-edition` product. The product data model,
  ordering, and server-side source contract are unchanged; only the animation wrapper markup was
  added.

The instruction said to "keep `aria-selected`", but the baseline component did not contain that
attribute and the previous/next controls do not implement a tab or option role where it would be
valid. Adding it would create invalid ARIA. The valid existing semantics are preserved and made
explicit with `aria-controls`, `aria-current`, and the live region.
