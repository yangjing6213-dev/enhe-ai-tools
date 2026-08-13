# ENHE Phase 2B.1 Manifest

Date: 2026-08-14 (Asia/Shanghai)

This integration worktree combines the exact stable technical baseline at `4061dee2942cc87f81647604e3097e92129d100a` with the eight approved Phase 2A public-shell candidate commits. The integration branch is `codex/enhe-public-shell-integration-v1`.

Scope is limited to the approved public shell candidate: redesign tokens, isolated header, mobile menu, language switch, footer, guarded local preview, candidate tests, and Phase 2A review evidence. No production layout wiring, public page replacement, commerce, Prisma, package, lockfile, Heartbeat, or writer changes are included.

The authoritative Phase 1B.2.13R state remains `docs/enhe-redesign/phase-1b213/15-DOCKER-AND-R008-RESUME.md` through `17-PHASE-1B213R-RECEIPT.md`; `00`-`14` remain historical audit/blocked evidence. This document records integration evidence only and does not rewrite earlier phase documents.

## Required outcome

```text
PHASE_2B_1_STATUS=PASS
PUBLIC_SHELL_CANDIDATE_INTEGRATION_STATUS=PASS
PHASE_1B_PUBLIC_SHELL_STATUS=READY_FOR_PRODUCTION_WIRING_APPROVAL
PUBLIC_SHELL_PRODUCTION_WIRING_STATUS=NOT_STARTED
PUBLIC_HEADER_REPLACED=NO
PUBLIC_FOOTER_REPLACED=NO
PUBLIC_HOME_REPLACED=NO
PRODUCT_DETAIL_STATUS=NOT_READY
COMMERCE_STATUS=NOT_READY
OVERALL_PUBLIC_SHELL_RELEASE_STATUS=NOT_READY
```

