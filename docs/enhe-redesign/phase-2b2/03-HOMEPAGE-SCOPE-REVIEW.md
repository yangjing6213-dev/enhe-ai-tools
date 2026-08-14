# Homepage Candidate Scope Review

## Candidate boundary

The candidate branch was checked at `596dae4c4ca6eba867feeaab947bfafb51bd5130` with required ancestor `878a4bb`. The five required source commits were present in the required order and matched the commit map.

Allowed candidate paths were limited to:

- `src/components/redesign/home/**`
- `src/lib/redesign/home/**`
- `src/styles/redesign/**`
- `src/app/redesign-preview/home/**`
- `public/redesign/home/**`
- corresponding `docs/enhe-redesign/phase-2a2/**`

The integration diff from stable boundary `68481b54228b25216f6c91d5f237dfc8ff3af4b6` contains the candidate paths above plus this Phase 2B.2 evidence directory. The forbidden source checks were clean for:

- `src/app/root-layout-shared.tsx`
- `src/app/globals.css`
- `package.json`
- `package-lock.json`
- `prisma/**`
- `middleware.ts`

The candidate worktree also showed an unrelated untracked `docs/enhe-redesign/phase-2a3/` directory at final inspection. It was not created, edited, staged, or removed by this task. This means the historical candidate commit boundary is verified, but the live candidate worktree was not clean at final handoff.

## Integration correction

Browser verification exposed a real isolated candidate issue: after sequential product selection, the fifth local product image could remain incomplete through the Next image optimizer path. The smallest correction was committed as `1a667164234331d6c6578b3cd44266960b4df849`:

- add `loading="eager"` to the candidate `Image`;
- add `unoptimized` so the local candidate asset uses its direct path;
- add matching source-contract assertions.

No production route, header, footer, root layout, package, database, middleware, Heartbeat, or R-008 file was changed.

