# ENHE Phase 2C.1.2 manifest

Date: 2026-08-15 (Asia/Shanghai)

Status: PASS

This phase corrects the approved production navigation copy and replaces the redesign Footer's generic filing specimen with verified, optional production filing data. It does not change the approved design, layout, routes, business behavior, or deployment state.

## Baseline

| Item | Verified value |
| --- | --- |
| Worktree | `C:\Users\HU\Documents\New project 2\.worktrees\enhe-production-wiring-v1` |
| Branch | `codex/enhe-production-wiring-v1` |
| Start HEAD | `8ff5678509e38971dec2a347f132a873855b4495` |
| Start worktree | clean |
| Copy-compliance commit | `74667631b8993d26d8ac4b8ace7e2cb2191ef1ef` |
| Verified filing source | `TRACKED_EXISTING_FOOTER` |

The baseline history contains the approved Phase 1A candidate, Phase 2C.1 production wiring, closed R-008 implementation, Heartbeat lifecycle seam, and concurrent Writer fix.

## Deliverables

- Exact Chinese and English production navigation contracts.
- One typed navigation source consumed by desktop Header and mobile menu.
- A visible `中文 / EN` switch in both locales.
- Optional structured production filing data with verified ICP and public-security values.
- Explicit Preview-only filing specimen separated from production data.
- TDD RED/GREEN and focused regression evidence.
- Two default full suites and one shuffled suite with seed `21101`.
- Twelve-route browser matrix, SSR scan, production build, and traced standalone validation.
- Four inspected full-page screenshots under `screenshots/`.

## Evidence index

1. `01-NAVIGATION-COPY-CONTRACT.md`
2. `02-FILING-SOURCE-AUDIT.md`
3. `03-RED-GREEN-EVIDENCE.md`
4. `04-BROWSER-AND-SSR.md`
5. `05-TEST-AND-BUILD.md`
6. `06-SOURCE-SCOPE.md`
7. `07-FINAL-RECEIPT.md`

## Safety boundary

No production deployment, push, production database access, production migration, seed, payment/refund operation, OAuth change, remote mutation, `.env` creation, or secret read occurred. The only database was a disposable loopback-bound PostgreSQL container with tmpfs data, removed after validation.
