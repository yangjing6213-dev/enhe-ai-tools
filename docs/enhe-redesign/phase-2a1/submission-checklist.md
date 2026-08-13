# Phase 2A.1.1 submission checklist

## Required artifacts

- [x] Baseline `7052ce8` verified before work.
- [x] Candidate Footer uses one typed `zh`/`en` dictionary.
- [x] Preview pairs Header and Footer under the same explicit locale specimen.
- [x] RED test observed before implementation; GREEN test observed after implementation.
- [x] Four full-page screenshots regenerated and visually inspected.
- [x] English screenshots contain English Footer; Chinese screenshots contain Chinese Footer.
- [x] Lint, typecheck, candidate tests, and full test suite passed.
- [x] Route, noindex, sitemap, navigation, privacy, and browser regressions checked.
- [x] Build and Docker gate recorded without fake database configuration.
- [x] No source tree, `node_modules`, `.next`, `.env`, database dump, secret, private URL, or Git credential included in the ZIP.

## Exact commits

```text
1defa15 fix(ui): localize redesigned footer specimen
docs(ui): finalize bilingual public shell candidate review
```

The first commit contains only Footer localization, Preview specimen pairing, types, and candidate tests. The second commit is restricted to this review directory and the four screenshots.

## Explicitly unchanged production surfaces

- `src/app/layout.tsx`
- `src/styles/globals.css`
- existing production header/footer components
- `src/app/sitemap.ts`
- `src/app/robots.ts`
- `package.json`
- `package-lock.json`
- `prisma/**`
- Runtime Heartbeat and R-008 files
- product detail, download, payment, OAuth, database, remote, and production environment

## Results ZIP contents

Only `docs/enhe-redesign/phase-2a1/**` is included: this checklist, the review report, the allowed-path list, and four screenshots.
