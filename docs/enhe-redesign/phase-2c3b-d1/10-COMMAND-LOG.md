# Command Log

Paths in this table are represented by placeholders. Raw stdout/stderr is quarantined and excluded from Git.

| Stage | Read/control command family | Result |
|---|---|---|
| Source gate | Git branch/HEAD/status/log/ancestor checks | Required branch, HEAD, history, clean state, and absent D1 path/branch confirmed |
| Isolation | `git worktree add -b ... <required HEAD>` | Diagnostic worktree created clean |
| Config gate | Byte validation, JSON-object parse, Python streaming SHA-256 | Both Docker config files valid; zero NUL; daemon expected hash matched |
| VM backup gate | Python streaming SHA-256 and metadata | 6,251,610,112-byte source/backup match |
| Host baseline | CIM processor/system/OS; feature and BCD read attempts | Firmware virtualization and Hypervisor active; elevated details access denied |
| WSL baseline | help/version/status/list/running | WSL 2.6.3.0, kernel 6.6.87.2-1; only Docker distro registered |
| Services | Read-only service/CIM queries | WslService, vmcompute, HNS, HvHost Running |
| WSL probe | system `true` and `uname` | Both exit 0 within limits |
| Docker capability | desktop version/status/help/logs/diagnose help | Timeout/boot/since and local gather capabilities inventoried; no upload used |
| Attempt 1 | desktop start with 240-second timeout; bounded status/version/info samples | Engine unavailable through gate; 14 completed rows |
| Attempt 1 evidence | boot 0 and exact UTC post-filter; relevant event logs | 3 current NUL errors; zero historical; 13 logs with no matching event |
| Intermediate stop | desktop stop, then only verified Docker-install PIDs | CLI stop timed out; Docker-owned residual processes reached zero |
| Integrity checkpoint | Python SHA-256 comparison | Config, `.wslconfig` state, and VHDX unchanged |
| WSL control | running-distro precheck; one `wsl --shutdown` | Authorized, exit 0, zero user distros, stable zero running count |
| Attempt 2 | same 240-second start/sampling protocol | Engine unavailable again; 14 completed rows |
| Attempt 2 evidence | second boot 0 and exact UTC post-filter; relevant event logs | Same 3 current NUL errors; zero historical; no matching event |
| Final stop | desktop stop, then eight exact verified Docker-install PIDs | Docker-owned process count 0 |
| Final integrity | Python SHA-256, WSL/process/service/port checks | No config/VHDX drift; zero project-owned new listening ports |
| Docker inventory | read-only ps/image/volume/network list | Unavailable because engine remains down; VHDX unchanged and no resource-mutating command ran |
| Source scope | Git status and scoped diff | Zero application/dependency/database diff |

Not executed: WSL update/install/unregister/import/export/mount; service restart; Windows Feature/BCD/Registry mutation; VHDX mount/repair/resize; network reset; Docker reset/purge/reinstall/update; resource deletion/creation; local diagnostic gather/upload; app tests/build; migration/seed; deploy/push.

The attempted `--since` absolute-time forms were rejected by the local Docker CLI despite appearing in help. This failure and the fallback to boot-0 plus exact UTC post-filter are preserved as evidence.
