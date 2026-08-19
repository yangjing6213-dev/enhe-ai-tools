# Docker Attempt 2

## WSL shutdown control

- Running distros before control: 0
- Non-Docker user distros: 0
- `WSL_SHUTDOWN_CONTROL_TEST=AUTHORIZED_NO_RUNNING_USER_DISTRO`
- `wsl --shutdown` exit: 0
- Timed out: no
- Two stability samples both showed zero running distros

No WSL service, vmcompute, HNS, feature, kernel, configuration, or distro registration was modified.

## Result

- `ATTEMPT_2_START_UTC=2026-08-19T03:04:29.0944390Z`
- `ATTEMPT_2_END_UTC=2026-08-19T03:08:49.0467189Z`
- `ATTEMPT_2_DURATION_SECONDS=259.952`
- `ATTEMPT_2_RESULT=FAIL_ENGINE_UNAVAILABLE`
- Engine OSType/server version: unavailable
- Backend process: present from the first sample and did not exit during the window
- WslService/vmcompute/HNS: Running at every completed sample

Fourteen completed rows span elapsed 0 through 242 seconds. The same documented status-subprocess limitation produced an effective 17-21 second row cadence.

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
| Other error/warning matches | 26 |

The backend began logging at `03:04:30.4682540Z`. The same daemon-load NUL/JSON failure appeared at `03:04:30.8370985Z`, followed by the module deadline at `03:05:30.5576098Z` and the first named-pipe failure at `03:06:36.5127897Z`.

All 13 enabled relevant Windows event logs again returned `NO_MATCHING_EVENTS`. The shutdown did not change the outcome, so `STALE_WSL_STATE_RECOVERED_BY_SHUTDOWN` is rejected.
