# Command Log

| Area | Command category | Result |
| --- | --- | --- |
| Baseline | branch, HEAD, status, log, ancestry, commit scope | PASS |
| Seam | two `git cherry-pick` operations | PASS; `85cb3dc`, `64d1e72` |
| Dependencies | `npm ci` | PASS; package and lockfile unchanged |
| Lint | `npm run lint` | PASS |
| Typecheck | `npm run typecheck` | PASS |
| Core pressure | contract test, 20 runs | 20/20 |
| Writer pressure | state-store test, 20 runs | 20/20 |
| Engine pressure | protocol test, 20 runs | 20/20 |
| Heartbeat pressure | all four Heartbeat tests, 20 runs | 20/20 |
| GSC pressure | GSC test, 20 runs | 20/20 |
| Deploy config | deploy-config test, 20 runs | 20/20 |
| SEO API | public-api test, 20 runs | 20/20 |
| Final default | full suite, 5 runs | 5/5 |
| Final shuffle | seeds 21101, 21102, 21103 | 3/3 |
| Docker preflight | Docker version / named container check | BLOCKED; daemon unavailable |
| Build | disposable PostgreSQL + migration + build | NOT RUN; Docker blocked |
| R-008 | RED/GREEN and post-R-008 gates | NOT RUN; build prerequisite blocked |
