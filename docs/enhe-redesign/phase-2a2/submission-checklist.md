# ENHE Phase 2A.2 Submission Checklist

## Candidate review

- [x] Isolated branch: `codex/enhe-public-shell-candidate-v1`.
- [x] Approved hero copy and locale-specific CTA routes.
- [x] Five products in approved order with local approved media.
- [x] Manual product controls, wraparound, fallback, keyboard behavior, and no autoplay.
- [x] Five labeled example experience records with product associations and 4/5-star displays.
- [x] Review auto interval 5000 ms, manual resume 6000 ms, pause guards, drag, keyboard, cleanup, and reduced-motion behavior.
- [x] Candidate route guarded in production and excluded from indexing.
- [x] Header, home, footer, root `lang`, and query/header locale behavior verified.

## Automated checks

- [x] `rtk npm run lint`
- [x] `rtk npm run typecheck`
- [x] Five candidate test files: 36 tests passed.
- [x] Full suite: 441 files passed, 9 skipped; 2129 tests passed, 90 skipped.
- [x] `rtk git diff --check`
- [x] Temporary Docker database build: 49 migrations, no seed, build passed, container removed.

## Browser and screenshots

- [x] Chinese and English at 1440x900 and 390x844.
- [x] HTTP 200 development preview and HTTP 404 production guard.
- [x] No horizontal overflow, no unexpected page/console errors, and 44 px targets.
- [x] Four full-page screenshots visually inspected.

Screenshot dimensions:

| File | Dimensions | Bytes |
| --- | ---: | ---: |
| `zh-home-candidate-1440.png` | 1440x3846 | 521527 |
| `zh-home-candidate-390.png` | 390x3514 | 175849 |
| `en-home-candidate-1440.png` | 1440x3956 | 529967 |
| `en-home-candidate-390.png` | 390x3681 | 170969 |

## Scope and Git

- [x] Only allowed candidate source, approved media, tests, screenshots, and Phase 2A.2 docs are staged.
- [x] No production homepage, root layout, globals.css, sitemap, robots, middleware, package, lockfile, Prisma, Heartbeat, or R-008 changes.
- [x] No push or remote change.
- [x] Fifth commit message: `docs(home): record phase 2A.2 homepage candidate review`.
- [x] Final worktree clean after the fifth commit.

## Results ZIP

Output: `C:\Users\HU\Desktop\ENHE-Phase2A.2-Homepage-Candidate-Results.zip`

The archive contains only `docs/enhe-redesign/phase-2a2/**`. The final archive size, SHA-256, entry count, and CRC-read result are recorded below after the archive is created and reopened:

```text
RESULT_ZIP_SIZE=RECORDED_IN_HANDOFF
RESULT_ZIP_SHA256=RECORDED_IN_HANDOFF
RESULT_ZIP_FILE_COUNT=RECORDED_IN_HANDOFF
ZIP_BAD_CRC=NO
```

The archive must not contain source files, `node_modules`, `.next`, `.env`, database files, secrets, private URLs, or Git credentials.

## Decision

`READY_FOR_REVIEW`: the candidate passed the Phase 2A.2 evidence gates. Production merge remains separately blocked by the Heartbeat/R-008 and scope-review gates.
