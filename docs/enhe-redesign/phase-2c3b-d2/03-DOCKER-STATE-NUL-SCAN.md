# Docker State NUL Scan

## Scope and Exclusions

The scanner covered four Docker-owned logical roots: roaming Desktop state, local Desktop state, local secrets-engine state, and per-user Docker state. It used a 16 MiB content-read ceiling.

It explicitly excluded credentials, credential-helper data, registry authentication, private keys, certificate bodies, project files, project `.env`, VHDX content, container filesystems, images, volumes, databases, and browser data. Docker JSON bodies, keys, values, URLs, account data, tokens, and proxy data were neither copied into this report nor exposed by the scanner output.

## Corrected Scan Totals

`DOCKER_STATE_FILE_SCAN_COUNT=41`

`DOCKER_STATE_JSON_FILE_COUNT=17`

`DOCKER_STATE_NUL_FILE_COUNT=2`

`DOCKER_STATE_ALL_ZERO_FILE_COUNT=1`

`DOCKER_STATE_INVALID_JSON_COUNT=2`

An initial classifier treated line-oriented log files as single JSON documents. It was corrected before the controlled start by classifying JSON only by the authorized extension/name rules. The superseded CSV was retained in quarantine for auditability and was not used for conclusions.

## NUL-Bearing Files

| Owner class | Basename | Size | NUL profile | JSON classification | SHA-256 | Conclusion |
| --- | --- | ---: | --- | --- | --- | --- |
| `LOCALAPPDATA_DOCKER` | `settings.dat` | 40 | 19 internal NULs; ratio `0.475`; not all zero | not a JSON candidate | `704b2667d4ca46496c37c75f91fe12b189534a2aaf8b437ce250f0a27f3a2e21` | binary/non-JSON state; not the current source |
| `USER_DOT_DOCKER` | `windows-daemon.json` | 28 | 28 leading NULs; all zero | invalid JSON | `3addfb141cd7c9c4c6543a82191a3707ac29c7a041217782e61d4d91c691aee8` | exact source candidate |

`SETTINGS_DAT_PRESENT=YES`

`SETTINGS_DAT_SIZE=40`

`SETTINGS_DAT_SHA256=704b2667d4ca46496c37c75f91fe12b189534a2aaf8b437ce250f0a27f3a2e21`

`SETTINGS_DAT_ALL_ZERO=NO`

`SETTINGS_DAT_NUL_RATIO=0.475`

`SETTINGS_DAT_TEXT_HEADER_RECOGNIZABLE=NO`

The other invalid JSON entry was a zero-byte installer error file with no NUL. It is not correlated with the current backend failure.

## Active Text Configuration Integrity

The active daemon configuration remained a valid JSON object with zero NULs and SHA-256 `27369c832f1be7d067b379f3236a203993e7bec45135e58829a9273c3209f53c` before and after the controlled start. The settings store also remained a valid JSON object with zero NULs and unchanged content hash. No configuration body, key, or value is included here.
