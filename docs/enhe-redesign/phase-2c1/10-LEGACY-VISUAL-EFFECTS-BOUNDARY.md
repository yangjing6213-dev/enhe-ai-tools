# Phase 2C.1 legacy visual-effect boundary

Status: PASS

`RootDocument` now accepts an explicit `disableLegacyVisualEffects` boundary. Public Chinese and English layouts pass it for public routes. The English shared parent excludes `/en/login`, `/en/register`, and `/en/user` so private English surfaces are not changed.

The legacy `InteractiveBackground`, `CursorGlow`, and `BorderGlowController` are omitted from the new public pages while `AnalyticsTracker` remains in the root document. Source and browser checks found no interactive-background, cursor-glow, border-glow, or target-cursor DOM on checked public pages.

Admin, private user, auth, and order layouts remain outside this boundary.
