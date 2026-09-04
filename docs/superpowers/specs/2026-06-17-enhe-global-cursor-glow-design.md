# ENHE Global Cursor Glow Design

- Date: 2026-06-17
- Status: Approved in conversation, pending written-spec review
- Scope: Public-facing ENHE website UI polish only

## Summary

Add a subtle global cursor-follow glow to the ENHE site so the existing dark, glassmorphism UI feels more alive and premium on desktop without changing site functionality. The effect will use a two-layer warm glow that follows the pointer with light easing, remains visually restrained, and stays fully non-blocking for interaction.

## Goals

1. Increase perceived polish and atmosphere on public pages.
2. Keep the effect consistent with the current dark night-mode visual language.
3. Preserve readability, clickability, and performance.
4. Apply the effect once at the app root so Chinese and English public pages stay visually consistent.

## Non-Goals

1. Replacing the native cursor.
2. Adding particle trails, click bursts, or strong hover-triggered animations.
3. Changing business logic, navigation, or page structure.
4. Enabling the effect on touch-first or coarse-pointer devices.

## Chosen Direction

The selected approach is a medium-strength dual-layer glow:

1. Outer glow: a larger, softer, heavily blurred warm halo.
2. Inner glow: a smaller, brighter core that adds depth.
3. Motion: slightly delayed tracking so the glow feels smooth instead of mechanically attached to the pointer.
4. Tone: warm orange family derived from the current ENHE accent color rather than introducing a new palette.

This direction balances presence and restraint better than a single-layer halo, while staying calmer than interactive hover amplifications.

## User Experience Rules

1. The native cursor remains visible and unchanged.
2. The glow sits above the background treatment but below readable content emphasis.
3. The effect must never intercept clicks, selections, or form input.
4. The glow should feel noticeable during motion and stable at rest.
5. It should enrich the homepage hero without overpowering cards, text, or buttons lower on the page.

## Architecture

### Root integration

Mount a dedicated client component once in the global app layout so all pages inheriting the main layout receive the effect automatically.

### New component

Create a global cursor glow component responsible for:

1. Tracking pointer position on desktop-class devices.
2. Smoothing the rendered glow position with `requestAnimationFrame`.
3. Hiding or disabling itself when the page should not animate.
4. Rendering the visual layers for the glow.

### Styling

Keep the effect mostly CSS-driven:

1. Fixed-position rendering.
2. `pointer-events: none`.
3. Radial gradients and blur for the two glow layers.
4. CSS variables or inline transform updates for position.
5. Media queries for reduced-motion and coarse-pointer fallbacks.

## Component Boundaries

### `CursorGlow` component

Responsibilities:

1. Detect whether the current environment should render the effect.
2. Subscribe to pointer movement.
3. Smoothly animate from current position to target position.
4. Show and hide the glow when entering or leaving the viewport as needed.

It should not:

1. Know anything about page-specific content.
2. Modify existing background components.
3. Change cursor shape, page scrolling, or element hover behavior.

### Existing layout

The root layout only mounts the component. It should not absorb pointer logic or effect state.

### Existing background

`InteractiveBackground` can continue owning existing pointer CSS variables for ambient backdrop behavior. The new glow should be independent enough that future tuning does not risk breaking the current background layer.

## Data Flow

1. Pointer moves.
2. `CursorGlow` stores the latest target coordinates.
3. A `requestAnimationFrame` loop eases the rendered coordinates toward the target.
4. The rendered glow updates via transform or CSS custom properties.
5. On reduced motion, coarse pointer, or unmount, listeners and animation work are removed.

## Motion and Visual Spec

1. Strength: medium visibility, clearly noticeable on desktop but still restrained.
2. Shape: soft circular glow with a brighter center.
3. Size:
   - Outer layer: large halo suitable for hero-scale ambiance.
   - Inner layer: much smaller core, used for depth rather than spotlight intensity.
4. Color:
   - Base from `--marketing-accent`.
   - Mixed with white and transparency for softness.
5. Blur:
   - Strong enough that edges disappear completely.
6. Easing:
   - Smooth interpolation that creates slight lag without feeling sluggish.
7. Opacity:
   - Default opacity kept below content dominance threshold.

## Accessibility and Performance

1. Disable or heavily suppress the effect under `prefers-reduced-motion: reduce`.
2. Disable the effect for coarse pointers such as phones and many tablets.
3. Keep rendering in a single mounted instance for the whole app.
4. Use `requestAnimationFrame` instead of unbounded per-event DOM work.
5. Avoid expensive layout reads during movement.

## Error Handling and Fallbacks

1. If browser APIs required for pointer tracking are unavailable, render nothing.
2. If motion is reduced, the page should still look complete and intentional.
3. If the component fails to initialize, all existing site functionality must remain unchanged.

## Testing Strategy

Before implementation:

1. Add a source-level regression test asserting the root layout mounts the new global glow component.
2. Add a source-level regression test asserting the global stylesheet contains reduced-motion and coarse-pointer protections for the glow.

After implementation:

1. Run the targeted test and confirm the red-green cycle.
2. Run `npm run typecheck`.
3. Run the full test suite.
4. Visually verify the homepage and a few public detail pages in desktop viewport.
5. Confirm no effect appears on mobile emulation.

## Acceptance Criteria

1. Desktop pages show a two-layer warm cursor glow that follows the pointer smoothly.
2. The effect does not block clicking, typing, selecting, or scrolling.
3. The effect is disabled for reduced motion and coarse-pointer environments.
4. The effect applies consistently across Chinese and English public pages through the shared root layout.
5. No existing page functionality changes.

## Out of Scope for This Change

1. Button-specific cursor morphing.
2. Hover-triggered bloom amplification on cards and links.
3. Per-page custom glow colors.
4. Admin-specific visual redesign.
