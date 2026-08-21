# Performance and Cleanup

## Layout and animation stability

- Category CLS delta: 0.
- Product-stage CLS delta: 0.
- Mobile-navigation CLS delta: 0.
- Fresh target-scoped SSR fallback/hydration CLS delta at 320, 390, 768, and 1440 for both languages: all 0.
- Relevant active animations after settle: 0.
- Detached motion nodes: 0 in the production gate.
- Support-suppression residuals: 0.
- `MOTION_LAYOUT_SHIFT_STATUS=PASS`
- `ANIMATION_CLEANUP_STATUS=PASS`

The prior English Hero H1 diagnostic observation (`0.0010843364072212537`) remains preserved as a historical, non-motion observation. This phase did not alter the Hero source or reclassify that observation. Fresh target-scoped product fallback CLS was 0, and no H1 regression was observed.

## Unconditional cleanup

- Standalone listener removed; local acceptance port listener count: 0.
- Disposable PostgreSQL container removed.
- Temporary database/auth process variables absent.
- `.next`, `test-results`, temporary video frames/scripts, and D4R extraction directory removed.
- Docker Desktop stopped; Engine pipe absent; Docker-owned process count: 0.

Docker resource sets after cleanup matched the pre-start baseline:

- Containers: 0, SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.
- Volumes: 38, SHA-256 `7b0e05b779bf158b60ed0f437b1e3a8501e2d68478a205239ed4f01b002732d4`.
- Networks: 3, SHA-256 `5306a2081435bb564ad8f9e2dcaf6a34ce7f3dd6a25d4e33199eaf2da080da93`.
- Images: 1, full-ID SHA-256 `90633f9f0131b237738271b5394a17bebed7122b543f2a45db79f61eebba3b3e`.

No named, anonymous, or bind volume was created by this phase.
