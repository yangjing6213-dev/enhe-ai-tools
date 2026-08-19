# Installed Version and Platform

## Docker Installation

| Field | Verified value |
| --- | --- |
| Docker Desktop | `4.86.0` |
| Docker Desktop build | `236216` |
| Product/file version | `4.86.0.236216` |
| Docker Desktop CLI | `v0.4.3` |
| Bundled Docker Engine/CLI | `29.7.2` |
| Compose | `v5.3.1` |
| Buildx | `v0.36.0-desktop.1` |
| Install mode | `ALL_USERS` |
| Install-root hash | `8868a7ec02508a9dfc3949cb426cee49ce12c2dde1dc6862d03a14993e82f64e` |
| Backend SHA-256 | `951a96fab7e1d922c042633b121440a9c1bf22c777cd411b67763c5cdd2eb505` |
| Diagnose SHA-256 | `dce84f9cf8a529c0ee2072322d7316568b7b6302ad302e9f7c52ee2987ad1caa` |
| Docker CLI SHA-256 | `5c077f7e830dd07109dd062b99c0ad9154714a2a5baf4ec3dcbd44ff9545972d` |

Authenticode verification was not available in the active PowerShell runtime. File metadata and hashes were collected, but no signature-validity claim is made.

`DOCKER_BINARY_SIGNATURE_STATUS=UNAVAILABLE_CMDLET`

## Windows and WSL

| Field | Verified value |
| --- | --- |
| Windows build | `26200.9168` |
| Display version | `25H2` |
| Edition identifier | `CoreCountrySpecific` |
| BuildLabEx | `26100.1.amd64fre.ge_release.240331-1435` |
| WSL | `2.6.3.0` |
| WSL kernel | `6.6.87.2-1` |
| WSLg | `1.0.71` |
| Default WSL version | `2` |

The legacy product-name string conflicts with the current build/display metadata, so it is not used to reclassify the operating system. WindowsSelfHost keys exist, but active branch, ring, content type, and UI selection values were absent.

`WINDOWS_INSIDER_STATUS=NOT_CONFIRMED`

`WINDOWS_INSIDER_CHANNEL=NONE_OBSERVED`

This means no active Insider enrollment was proved; it does not prove that the build has never been a preview build.

## Official Version and Eligibility

Docker's release notes list Docker Desktop `4.87.0`, released 2026-08-17, as the current release. Installed `4.86.0` was released 2026-08-10 and is the immediately preceding current release.

The official Windows page requires WSL `2.1.5` or later and Windows 11 `23H2` build `22631` or later. The local WSL/build exceed those numeric minima. However, the primary requirement bullets do not explicitly list the local Home China edition while a separate note says Home can run Linux containers. Coupled with the unconfirmed preview history, paid-support eligibility is not asserted.

`OFFICIAL_LATEST_DOCKER_DESKTOP_VERSION=4.87.0`

`DOCKER_OFFICIAL_SUPPORT_VERSION_STATUS=CURRENT`

`INSTALLED_VERSION_SUPPORT_STATUS=CURRENT_PREVIOUS_RELEASE`

`WINDOWS_PREVIEW_STATUS=NOT_CONFIRMED`

`DOCKER_SUPPORT_OS_ELIGIBILITY=UNKNOWN`

Sources: [Docker Desktop release notes](https://docs.docker.com/desktop/release-notes/) and [Docker Desktop for Windows requirements](https://docs.docker.com/desktop/setup/install/windows-install/).
