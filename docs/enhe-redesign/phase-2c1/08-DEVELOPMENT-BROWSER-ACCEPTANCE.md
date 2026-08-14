# Phase 2C.1 development browser acceptance

Status: PASS

A temporary Playwright harness exercised 14 public routes in a database-backed local development process. It checked public shell presence, locale-specific navigation, AI Skill child count, guest/admin boundary, metadata, SSR home content, mobile menu focus return, Escape and overlay close, body scroll locking, reduced-motion behavior, 200% zoom overflow, runtime errors, robots, sitemap, and preview separation.

Development candidate routes remained available only for local candidate regression: `/redesign-preview/home` and `/redesign-preview/shell` returned 200; `/redesign-preview/software` and `/__redesign-preview/shell` returned 404. This is distinct from production mode, where all four preview probes returned 404.

The clean production screenshots were captured from four independent fresh pages after `networkidle`; the capture also asserted that no drawer, menu overlay, Next overlay, body scroll lock, or Preview marker was present. They are stored under `screenshots/`:

- `zh-home-production-wired-1440.png`
- `zh-home-production-wired-390.png`
- `en-home-production-wired-1440.png`
- `en-home-production-wired-390.png`

The temporary harness and local process logs were removed after capture.
