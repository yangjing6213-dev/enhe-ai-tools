# Phase 2A.1 submission checklist

## Required artifacts

- [x] Isolated worktree and branch preserved.
- [x] Routable dev-only preview route added under `src/app/redesign-preview`.
- [x] Old `src/app/__redesign-preview` directory removed by route move.
- [x] Production guard and noindex metadata present.
- [x] Four visual-review screenshots captured.
- [x] Lint, typecheck, candidate tests, and full test suite run.
- [x] Build result and Docker/database gate recorded.
- [x] No source tree, `node_modules`, `.next`, `.env`, database dump, secret, private URL, or Git credential included in the results ZIP.

## Exact commits

```text
538af42 fix(preview): expose guarded redesign preview route
docs(ui): complete phase 2A public shell candidate review
```

The second commit is restricted to this review document directory and its four PNG screenshots.

## Explicitly unchanged production surfaces

- `src/app/layout.tsx`
- `src/styles/globals.css`
- existing production header/footer components
- `src/app/sitemap.ts`
- `src/app/robots.ts`
- `package.json`
- `package-lock.json`
- `prisma/**`
- Heartbeat and R-008 files

## Results ZIP contents

The ZIP contains only `docs/enhe-redesign/phase-2a1/**`, including this checklist, the review report, the allowed-path list, and four screenshots.
