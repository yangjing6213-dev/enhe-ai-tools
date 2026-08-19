# Host and WSL Baseline

## Versions

| Item | Observed value |
|---|---|
| Windows edition | Windows 11 Home Chinese |
| CIM OS version | `10.0.26200` |
| CIM build | `26200` |
| WSL-reported Windows version | `10.0.26200.9168` |
| WSL package | `2.6.3.0` |
| WSL kernel | `6.6.87.2-1` |
| Default WSL version | `2` |
| Registered distros | `1` (`docker-desktop` only) |
| Running distros before diagnosis | `0` |

Absence of Ubuntu or another user distro is not a failure condition for Docker Desktop's WSL2 backend.

## Virtualization and features

| Probe | Result |
|---|---|
| Firmware virtualization | `true` |
| Hypervisor present | `true` |
| CIM SLAT property | `false` |
| BCD hypervisor launch type | `ACCESS_DENIED` |
| WSL optional feature query | `ACCESS_DENIED_OR_UNAVAILABLE` |
| VirtualMachinePlatform query | `ACCESS_DENIED_OR_UNAVAILABLE` |

The CIM SLAT value is a contradictory observation, not a proven failure: firmware virtualization and the Hypervisor are active, and the WSL system kernel executed successfully. Feature and BCD state could not be read without elevation; no UAC or feature mutation was attempted.

## Services

| Service | Exists | Status | Start mode |
|---|---:|---|---|
| `WslService` | yes | Running | Auto |
| `LxssManager` | no | Not present on this host | n/a |
| `vmcompute` | yes | Running | Manual |
| `hns` | yes | Running | Manual |
| `HvHost` | yes | Running | Manual |

No service was started, stopped, or restarted by the diagnosis.

## WSL system probe

- `WSL_SYSTEM_PROBE_SUPPORTED=YES`
- `WSL_SYSTEM_TRUE_EXIT=0` in 4,112 ms
- `WSL_SYSTEM_UNAME_EXIT=0` in 175 ms
- Kernel family observed: Microsoft-standard WSL2, x86_64; hostname omitted.

These results reject a basic WSL platform/system-distro failure for this run.

## User configuration and reboot state

- `WSLCONFIG_PRESENT=NO`
- `WINDOWS_REBOOT_PENDING=NO`
- `CBS_REBOOT_PENDING=NO`
- `PENDING_FILE_RENAME=YES`
- `UPDATE_EXE_VOLATILE=NO`

The pending-file-rename flag is only a candidate environmental condition. It does not satisfy any root-cause class by itself and was not cleared.
