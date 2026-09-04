# ENHE Global Cursor Glow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a restrained dual-layer cursor-follow glow across the public ENHE site, keep all interactions intact, and deploy the finished UI polish to GitHub and Tencent Cloud.

**Architecture:** Mount a single client-only `CursorGlow` component from the root app layout, keep pointer smoothing inside that component with `requestAnimationFrame`, and style the visual layers in the global stylesheet so the glow can be tuned centrally. Protect the experience with source-level regression tests for layout integration and global CSS safeguards before implementation, then verify visually with Playwright before pushing and deploying.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS 4, Vitest, Playwright, Git, existing Tencent Cloud deployment scripts.

---

### Task 1: Lock The Cursor Glow Source Contract

**Files:**
- Create: `src/lib/cursor-glow-source.test.ts`
- Read: `src/app/layout.tsx`
- Read: `src/app/globals.css`

- [ ] **Step 1: Write the failing test**

Add a source-level regression test that checks:
1. `src/app/layout.tsx` imports `CursorGlow` from `@/components/cursor-glow`.
2. The root layout renders `<CursorGlow />` alongside the existing global wrappers.
3. `src/app/globals.css` contains `.cursor-glow-shell`, `.cursor-glow-orb`, `@media (pointer: coarse)`, and `@media (prefers-reduced-motion: reduce)` hooks.

Use this test body:

```ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();

function read(relativePath: string) {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

describe("global cursor glow source contract", () => {
  it("mounts the cursor glow from the root layout", () => {
    const layoutSource = read("src/app/layout.tsx");

    expect(layoutSource).toContain('import { CursorGlow } from "@/components/cursor-glow";');
    expect(layoutSource).toContain("<CursorGlow />");
  });

  it("defines cursor glow styling and accessibility guards in globals.css", () => {
    const cssSource = read("src/app/globals.css");

    expect(cssSource).toContain(".cursor-glow-shell");
    expect(cssSource).toContain(".cursor-glow-orb");
    expect(cssSource).toContain("@media (pointer: coarse)");
    expect(cssSource).toContain("@media (prefers-reduced-motion: reduce)");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/cursor-glow-source.test.ts`

Expected: FAIL because `CursorGlow` is not yet imported or rendered, and the cursor glow CSS hooks do not exist.

- [ ] **Step 3: Commit the failing test**

```bash
git add src/lib/cursor-glow-source.test.ts
git commit -m "test: lock global cursor glow source contract"
```

### Task 2: Add The Global Cursor Glow Component

**Files:**
- Create: `src/components/cursor-glow.tsx`
- Test: `src/lib/cursor-glow-source.test.ts`

- [ ] **Step 1: Write the minimal component implementation**

Create `src/components/cursor-glow.tsx` with a client-only component that:
1. Returns `null` until mounted and desktop-capable.
2. Uses `matchMedia("(pointer: coarse)")` and `matchMedia("(prefers-reduced-motion: reduce)")` to disable the effect when needed.
3. Tracks target pointer coordinates on `pointermove`.
4. Uses a `requestAnimationFrame` loop to ease current coordinates toward target coordinates.
5. Renders a shell and two orb layers with inline `transform`.

Use this implementation skeleton:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";

const INITIAL_X = 0;
const INITIAL_Y = 0;
const EASE = 0.14;

export function CursorGlow() {
  const [enabled, setEnabled] = useState(false);
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const frameRef = useRef<number | null>(null);
  const targetRef = useRef({ x: INITIAL_X, y: INITIAL_Y });
  const currentRef = useRef({ x: INITIAL_X, y: INITIAL_Y });
  const shellRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);

    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const coarseQuery = window.matchMedia("(pointer: coarse)");
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const syncEnabled = () => {
      const nextEnabled = !coarseQuery.matches && !reducedMotionQuery.matches;
      setEnabled(nextEnabled);
      if (!nextEnabled) {
        setVisible(false);
      }
    };

    syncEnabled();

    const tick = () => {
      const dx = targetRef.current.x - currentRef.current.x;
      const dy = targetRef.current.y - currentRef.current.y;
      currentRef.current.x += dx * EASE;
      currentRef.current.y += dy * EASE;

      if (shellRef.current) {
        shellRef.current.style.transform = `translate3d(${currentRef.current.x}px, ${currentRef.current.y}px, 0)`;
      }

      frameRef.current = window.requestAnimationFrame(tick);
    };

    const handlePointerMove = (event: PointerEvent) => {
      targetRef.current = { x: event.clientX, y: event.clientY };
      if (!visible) {
        currentRef.current = { x: event.clientX, y: event.clientY };
        setVisible(true);
      }
    };

    const handlePointerLeave = () => setVisible(false);

    coarseQuery.addEventListener("change", syncEnabled);
    reducedMotionQuery.addEventListener("change", syncEnabled);
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerleave", handlePointerLeave);
    frameRef.current = window.requestAnimationFrame(tick);

    return () => {
      coarseQuery.removeEventListener("change", syncEnabled);
      reducedMotionQuery.removeEventListener("change", syncEnabled);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerleave", handlePointerLeave);
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, [visible]);

  if (!mounted || !enabled) {
    return null;
  }

  return (
    <div
      ref={shellRef}
      aria-hidden="true"
      className={`cursor-glow-shell${visible ? " is-visible" : ""}`}
    >
      <div className="cursor-glow-orb cursor-glow-orb-outer" />
      <div className="cursor-glow-orb cursor-glow-orb-inner" />
    </div>
  );
}
```

- [ ] **Step 2: Keep the implementation focused**

Before moving on, review the component and make these minimal corrections if needed:
1. Keep the component self-contained and do not couple it to any page content.
2. Ensure the shell only exposes `aria-hidden="true"` and has no interactive props.
3. Keep the easing constant and initial coordinate values local to this file.

- [ ] **Step 3: Do not run the test yet**

At this stage, the source test should still fail because the root layout import/render and global CSS hooks are not in place yet.

- [ ] **Step 4: Commit the component**

```bash
git add src/components/cursor-glow.tsx
git commit -m "feat: add global cursor glow component"
```

### Task 3: Mount The Glow And Add Global Styles

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`
- Test: `src/lib/cursor-glow-source.test.ts`

- [ ] **Step 1: Update the root layout**

Modify `src/app/layout.tsx` to import and render `CursorGlow` directly after `InteractiveBackground` so it is globally available:

```tsx
import { CursorGlow } from "@/components/cursor-glow";
```

and inside `<body>`:

```tsx
        <InteractiveBackground />
        <CursorGlow />
        <AnalyticsTracker />
```

- [ ] **Step 2: Add the cursor glow styles**

Add these focused rules to `src/app/globals.css` near the other global background effects:

```css
.cursor-glow-shell {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 0;
  width: 0;
  height: 0;
  pointer-events: none;
  opacity: 0;
  transition: opacity 220ms ease;
  will-change: transform, opacity;
}

.cursor-glow-shell.is-visible {
  opacity: 1;
}

.cursor-glow-orb {
  position: absolute;
  top: 50%;
  left: 50%;
  border-radius: 999px;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.cursor-glow-orb-outer {
  width: 320px;
  height: 320px;
  background:
    radial-gradient(circle, rgba(240, 90, 53, 0.2) 0%, rgba(240, 90, 53, 0.08) 36%, rgba(240, 90, 53, 0) 72%);
  filter: blur(26px);
}

.cursor-glow-orb-inner {
  width: 140px;
  height: 140px;
  background:
    radial-gradient(circle, rgba(255, 255, 255, 0.18) 0%, rgba(255, 163, 122, 0.2) 24%, rgba(240, 90, 53, 0.06) 54%, rgba(240, 90, 53, 0) 76%);
  filter: blur(12px);
  mix-blend-mode: screen;
}
```

- [ ] **Step 3: Add the global protection rules**

Extend `src/app/globals.css` with protection and fallback rules:

```css
@media (pointer: coarse) {
  .cursor-glow-shell {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cursor-glow-shell {
    display: none !important;
    transition: none !important;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/cursor-glow-source.test.ts`

Expected: PASS with both assertions green.

- [ ] **Step 5: Commit the integration**

```bash
git add src/app/layout.tsx src/app/globals.css src/lib/cursor-glow-source.test.ts
git commit -m "feat: mount global cursor glow"
```

### Task 4: Refine Motion Behavior And Prevent Animation Churn

**Files:**
- Modify: `src/components/cursor-glow.tsx`
- Test: `src/lib/cursor-glow-source.test.ts`

- [ ] **Step 1: Remove effect re-subscription churn**

Refactor `src/components/cursor-glow.tsx` so the main `useEffect` does not depend on `visible`, which would re-bind listeners on every visibility change. Replace the visibility read in the pointer handler with a ref-backed boolean.

Use this pattern:

```tsx
  const visibleRef = useRef(false);
```

When showing or hiding:

```tsx
      if (!visibleRef.current) {
        currentRef.current = { x: event.clientX, y: event.clientY };
        visibleRef.current = true;
        setVisible(true);
      }
```

and:

```tsx
    const handlePointerLeave = () => {
      visibleRef.current = false;
      setVisible(false);
    };
```

Then change the effect dependency array to:

```tsx
  }, []);
```

- [ ] **Step 2: Guard the animation loop**

Only apply transform work inside `tick` when `enabled` state is active and `shellRef.current` exists. Keep the loop lightweight and avoid extra state writes inside `requestAnimationFrame`.

- [ ] **Step 3: Re-run the source test**

Run: `npm test -- src/lib/cursor-glow-source.test.ts`

Expected: PASS, proving the source contract remains intact after refinement.

- [ ] **Step 4: Commit the refinement**

```bash
git add src/components/cursor-glow.tsx
git commit -m "refactor: smooth cursor glow lifecycle"
```

### Task 5: Verify Locally And Capture Visual Evidence

**Files:**
- Output: `output/playwright/enhe-cursor-glow-home-desktop.png`
- Output: `output/playwright/enhe-cursor-glow-home-mobile.png`
- Output: `output/playwright/enhe-cursor-glow-listing-desktop.png`

- [ ] **Step 1: Run the full verification commands**

Run:

```bash
npm run typecheck
npm test
```

Expected:
1. `npm run typecheck` exits `0`.
2. `npm test` exits `0` with no failing suites.

- [ ] **Step 2: Start or reuse the local dev server**

Run from the project root if no healthy dev server is already running:

```bash
npm run dev
```

Expected: A local Next.js dev server is reachable for Playwright checks.

- [ ] **Step 3: Capture desktop and mobile evidence**

Use Playwright to:
1. Open the homepage in a desktop viewport and move the pointer through the hero area.
2. Capture `output/playwright/enhe-cursor-glow-home-desktop.png`.
3. Open the homepage in a mobile viewport and confirm the glow does not render.
4. Capture `output/playwright/enhe-cursor-glow-home-mobile.png`.
5. Open a public listing page such as `/software` in desktop viewport and capture `output/playwright/enhe-cursor-glow-listing-desktop.png`.

- [ ] **Step 4: Check the acceptance criteria manually**

Confirm from the running site:
1. The glow is visible on desktop and feels restrained.
2. Buttons, cards, and inputs remain fully clickable.
3. The effect does not dominate text or cards.
4. Mobile view has no glow layer.

- [ ] **Step 5: Commit the verified UI polish**

```bash
git add src/components/cursor-glow.tsx src/app/layout.tsx src/app/globals.css src/lib/cursor-glow-source.test.ts output/playwright/enhe-cursor-glow-home-desktop.png output/playwright/enhe-cursor-glow-home-mobile.png output/playwright/enhe-cursor-glow-listing-desktop.png
git commit -m "feat: add premium cursor glow polish"
```

### Task 6: Push To GitHub And Deploy To Tencent Cloud

**Files:**
- Read: `deploy.sh`
- Read: `docs/tencent-cloud-push-deploy-workflow.md`

- [ ] **Step 1: Inspect deployment instructions before release**

Read:

```bash
Get-Content -Raw .\\deploy.sh
Get-Content -Raw .\\docs\\tencent-cloud-push-deploy-workflow.md
git remote -v
```

Expected: Confirm the correct GitHub remote and the Tencent Cloud deployment flow before pushing.

- [ ] **Step 2: Push the verified branch to GitHub**

Run:

```bash
git push origin HEAD
```

Expected: Push completes successfully against the repo's primary GitHub remote.

- [ ] **Step 3: Deploy the latest code to Tencent Cloud**

Run the documented deployment command from the project root. If `deploy.sh` is the canonical script, use:

```bash
bash ./deploy.sh
```

Expected: The Tencent Cloud deployment completes successfully with no fatal errors.

- [ ] **Step 4: Verify the live deployment**

After deployment, use Playwright or browser-backed checks to load the live homepage and confirm:
1. The new cursor glow appears on desktop.
2. Mobile still suppresses the effect.
3. Existing homepage interactions still work.

- [ ] **Step 5: Record the release state**

Capture:
1. The pushed commit hash.
2. The deployment result.
3. Any follow-up notes if the live cursor glow needs brightness tuning after production verification.

## Self-Review

Spec coverage check:
1. Global desktop-only cursor glow: covered by Tasks 2, 3, and 5.
2. Reduced-motion and coarse-pointer protection: covered by Tasks 1 and 3.
3. Root-layout mounting across the shared app: covered by Tasks 1 and 3.
4. Non-blocking interaction and visual restraint: covered by Tasks 2, 3, and 5.
5. GitHub push and Tencent deployment: covered by Task 6.

Placeholder scan:
1. No `TODO`, `TBD`, or deferred implementation placeholders remain.
2. All steps specify files, commands, or code content.

Type consistency check:
1. `CursorGlow` naming is consistent across test, component, and layout tasks.
2. `.cursor-glow-shell` and `.cursor-glow-orb` class names are consistent across tests and stylesheet tasks.
