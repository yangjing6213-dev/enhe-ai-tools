# EBOS Remaining Dirty Handling Plan

- reportType: remaining_dirty_handling_plan
- targetDate: 2026-07-03
- generatedAt: 2026-07-07T17:57:31.1433785+08:00
- mainProjectPath: C:\Users\HU\Documents\New project 2
- sourceAudit: reports/ebos/deployment/2026-07-03-remaining-dirty-risk-audit.json
- totalRemainingDirty: 180

## 1. Package dependency audit

- scope: package.json, package-lock.json
- riskLevel: high
- recommendedAction: Inspect dependency and script changes, verify lockfile intent, run full install/build checks in a separate batch, then commit only package files if approved.
- commitPolicy: separate commit only after audit
## 2. Prisma migration/schema audit

- scope: prisma/**
- riskLevel: high
- recommendedAction: Review seed and migration files, confirm schema intent, require backup evidence and explicit migration approval before any migration-related commit.
- commitPolicy: separate commit; no migration in audit mode
## 3. Admin/API/core audit

- scope: src/app/admin/**, src/app/api/**, src/lib/** non-EBOS
- riskLevel: high
- recommendedAction: Split by behavior domain, verify auth and data mutation boundaries, and run targeted tests before commit.
- commitPolicy: multiple small commits by domain
## 4. Unknown file triage

- scope: public/**, src/app public routes, src/components/**, scripts/**, docs/**, content/**, remotion/**, skills/**, deployment support files
- riskLevel: medium
- recommendedAction: Assign ownership and source for each group. Exclude generated artifacts and only commit intentional source/content changes.
- commitPolicy: separate commits after classification
## 5. EBOS report residue commit

- scope: reports/ebos/** residue
- riskLevel: low
- recommendedAction: Review report-only diffs for date/status correctness and no secrets, then commit as a report-only batch if still needed.
- commitPolicy: dedicated report-only commit allowed after review
## 6. Promotion Manager development branch preparation

- scope: new Promotion Manager work
- riskLevel: medium
- recommendedAction: Create or switch to a clean isolated worktree/branch only after remaining dirty ownership is understood, so new development does not mix with legacy residue.
- commitPolicy: start from clean or explicitly isolated state

## Guardrails

- No git add .
- No git add during audit-only stages.
- No git commit or push until the selected batch passes separate review.
- No Prisma migration command without explicit migration approval phrase and backup evidence.
- No server, Docker, Nginx, SSH, or deployment command during dirty audit stages.
- Do not delete untracked files without explicit user confirmation.

## Recommended Order

1. EBOS report residue commit can be handled first because it is low risk and scoped.
2. Package and Prisma audits should be separate high-risk tracks.
3. Admin/API/core audits should be split by behavior and test surface.
4. Unknown/generated triage should run before Promotion Manager work starts.
