# Docker Attempt 1

## Result

- `ATTEMPT_1_START_UTC=2026-08-19T02:47:55.1713018Z`
- `ATTEMPT_1_END_UTC=2026-08-19T02:52:13.4678345Z`
- `ATTEMPT_1_DURATION_SECONDS=258.297`
- `ATTEMPT_1_RESULT=FAIL_ENGINE_UNAVAILABLE`
- Engine OSType/server version: unavailable
- Backend process: present from the first sample and did not exit during the window
- WslService/vmcompute/HNS: Running at every completed sample

The 240-second gate was reached. The additional collector duration came from bounded Docker CLI status calls; it was not engine startup time.

## Timeline sampling limitation

The local `docker desktop status` subprocess held redirected pipes after its 2.5-second parent timeout. Completed rows therefore landed every 17-22 seconds rather than every 5 seconds. Fourteen rows still span elapsed 0 through 240 seconds. This deviation is recorded, not hidden. Sub-second boot-log timestamps, rather than sample cadence, establish the first-failure order.

## Boot-scoped evidence

| Metric | Count |
|---|---:|
| Current-window NUL errors | 3 |
| Historical NUL errors outside window | 0 |
| JSON parse/deadline errors | 1 |
| WSL/VM errors | 0 |
| HCS errors | 0 |
| HNS errors | 0 |
| VHDX errors | 0 |
| Named-pipe symptom errors | 2 |
| Other error/warning matches | 25 |

The first observed warning was an optional cloud-settings file absence at `02:47:55.9472261Z`; it did not terminate startup. The first fatal startup failure was the backend daemon-load NUL/JSON error at `02:47:56.2073081Z`. A module context deadline followed at `02:48:55.9880412Z`; the first named-pipe error followed at `02:50:41.2292890Z`.

All 13 enabled relevant Windows event logs returned `NO_MATCHING_EVENTS` for the exact attempt window. No container or other Docker resource was created.
