# Phase 2C.3B-D1 Manifest

`PHASE_2C_3B_D1_STATUS=PASS`

`DOCKER_ROOT_CAUSE_CLASS=DOCKER_BACKEND_INTERNAL_FAILURE`

`DOCKER_ROOT_CAUSE_STATUS=PROVEN`

本阶段仅诊断 Docker Desktop Linux Engine 启动失败。未执行系统修复、配置重写、Windows Feature 变更、WSL 更新、VHDX 挂载/修复、Docker 资源创建、应用改动、部署或 push。

## Authority and source

- Source worktree: `<PROJECT_ROOT>\.worktrees\enhe-motion-hygiene-v1`
- Source branch: `codex/enhe-motion-hygiene-v1`
- Source HEAD: `dc662c0263552e5c85f862f22c32799fb1cc82bd`
- Diagnostic worktree: `<PROJECT_ROOT>\.worktrees\enhe-docker-wsl-diagnosis-v1`
- Diagnostic branch: `codex/enhe-docker-wsl-diagnosis-v1`
- Start HEAD: `dc662c0263552e5c85f862f22c32799fb1cc82bd`

## Evidence boundary

Raw evidence is isolated under `<DESKTOP_QUARANTINE>\docker-wsl-diagnosis-d1-20260819T023852Z`. Its `manifest.json` records 147 files, including 86 raw-log or raw-command-output files and zero configuration-body copies. Raw evidence is excluded from Git and the result ZIP.

The two boot-scoped Docker log sources have distinct SHA-256 values:

- Attempt 1: `1e7de1236d744c3a6c9788d0732bcbc9360ce01693791537acb8a2bbb73251c2`
- Attempt 2: `e2be859dde6be4997192abc547f9f662341ff7a9973f664d70a714818fff3d40`

## Document inventory

1. `00-PHASE-2C3B-D1-MANIFEST.md`
2. `01-HOST-AND-WSL-BASELINE.md`
3. `02-DOCKER-CONFIG-AND-VHDX-BASELINE.md`
4. `03-DOCKER-ATTEMPT-1.md`
5. `04-DOCKER-ATTEMPT-2.md`
6. `05-BOOT-SCOPED-LOG-SUMMARY.md`
7. `06-FAILURE-TIMELINE.csv`
8. `07-ROOT-CAUSE-CLASSIFICATION.md`
9. `08-TARGETED-NEXT-ACTION-MATRIX.md`
10. `09-SOURCE-SCOPE.md`
11. `10-COMMAND-LOG.md`
12. `11-FINAL-RECEIPT.md`

`PHASE_2C_3B_STATUS=BLOCKED` remains unchanged because the PostgreSQL container gate was not rerun. `MOTION_HYGIENE_STATUS=PASS` remains unchanged.
