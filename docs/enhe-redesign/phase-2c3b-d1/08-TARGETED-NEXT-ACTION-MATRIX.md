# Targeted Next-action Matrix

No action in this matrix was executed during D1.

| Root class | Authorized next-phase category | Verification gate |
|---|---|---|
| A | Administrator-led Windows Feature/BIOS/reboot inspection | Feature and BCD state explicitly confirmed, then WSL probe |
| B | Dedicated WSL platform repair phase | WSL system probes and events pass after repair |
| C | User-approved WSL update phase | Version requirement evidenced, update approved, probes rerun |
| D | User-approved Docker VHDX inspection or Docker support | Read-only diagnostics first; never direct `Repair-VHD` |
| E | vmcompute/HCS-directed repair phase | First fatal HCS code removed and WSL/Docker probes pass |
| F | HNS/network-directed diagnosis | VM starts before network provisioning; HNS error is removed |
| **G** | **Docker Desktop local-only diagnostics, version-specific analysis, or official support** | Backend no longer emits daemon NUL load failure and engine connects |
| H | Rerun PostgreSQL container gate | Engine connects after shutdown without file changes |
| I | Update startup-wait contract, then rerun container gate | Engine connects between 180 and 240 seconds without fatal error |
| J | Collect an approved local-only Docker/WSL diagnostic bundle | Evidence yields one proven class before any repair |

## Selected next action

`PHASE_2C_3B_D1_NEXT_ACTION=AUTHORIZE_DOCKER_BACKEND_LOCAL_DIAGNOSTIC_OR_VERSION_SPECIFIC_OFFICIAL_SUPPORT`

The CLI exposes local `gather` capability, but D1 did not run it because the root layer is already proven and the current phase forbids diagnostic-ID generation or upload. A later explicitly authorized phase must preserve local-only/no-upload boundaries.

Do not rewrite `daemon.json` or `settings-store.json`: their exact pre/post hashes and zero-NUL validations already pass while the backend's internal error persists.
