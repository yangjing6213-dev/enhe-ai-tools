# Version and Issue Correlation

## Official Release Check

As checked on 2026-08-19, [Docker Desktop release notes](https://docs.docker.com/desktop/release-notes/) list:

- `4.87.0`, released 2026-08-17, as the latest release;
- installed `4.86.0`, released 2026-08-10, as the immediately preceding release;
- no release-note item identifying a fix for an all-zero `windows-daemon.json` consumed by the backend.

The installed version is current but not latest. No controlled update is authorized because no fixed version for this signature was identified.

## Curated Public Results

Only `docs.docker.com`, `github.com/docker/desktop-feedback`, and `github.com/docker/for-win` were accessed. No login, issue creation, or diagnostic upload occurred.

| Issue | Status | Relevant evidence | Match level |
| --- | --- | --- | --- |
| [docker/for-win#12561](https://github.com/docker/for-win/issues/12561) | closed/locked | same NUL parse fragment from all-zero context metadata on 4.5.1 | `EXACT_SIGNATURE_DIFFERENT_VERSION` |
| [docker/for-win#13597](https://github.com/docker/for-win/issues/13597) | closed | same NUL fragment while reading container logs on 4.21.1 | `EXACT_SIGNATURE_DIFFERENT_VERSION` |
| [docker/for-win#13009](https://github.com/docker/for-win/issues/13009) | closed/stale | confirms Docker consumes `windows-daemon.json`; different failure | `RELATED_ENVIRONMENT_DIFFERENT_SIGNATURE` |
| [docker/for-win#14411](https://github.com/docker/for-win/issues/14411) | open/triage | reports Docker overwriting `windows-daemon.json`; different failure | `RELATED_ENVIRONMENT_DIFFERENT_SIGNATURE` |
| [docker/desktop-feedback#527](https://github.com/docker/desktop-feedback/issues/527) | open | build 26200 and WSL2, but stale inference-socket error 1920 | `RELATED_ENVIRONMENT_DIFFERENT_SIGNATURE` |
| [docker/desktop-feedback#448](https://github.com/docker/desktop-feedback/issues/448) | open | build 26200 and inference socket binding; different component/signature | `RELATED_ENVIRONMENT_DIFFERENT_SIGNATURE` |
| [docker/desktop-feedback#531](https://github.com/docker/desktop-feedback/issues/531) | open | build 26200 and stale inference/secrets sockets on 4.81.0 | `RELATED_ENVIRONMENT_DIFFERENT_SIGNATURE` |
| [docker/desktop-feedback#532](https://github.com/docker/desktop-feedback/issues/532) | open | build 26200 and stale inference socket on 4.69.0 | `RELATED_ENVIRONMENT_DIFFERENT_SIGNATURE` |

`PUBLIC_ISSUE_SEARCH_COUNT=8`

`EXACT_SIGNATURE_ISSUE_COUNT=0`

`RELATED_PLATFORM_ISSUE_COUNT=6`

`FIXED_VERSION_IDENTIFIED=NO`

The exact-signature count means the full observed combination: Docker Desktop 4.86.0, build 26200, backend daemon-load context, all-zero `windows-daemon.json`, and the same source correlation. Two older issues share only the generic NUL fragment and are not counted as exact full-signature matches.

## Independent Conclusion

Public issues strengthen two narrow facts: all-zero Docker JSON state can produce this parser fragment, and Docker uses `windows-daemon.json`. They do not prove who wrote the local file, when it became all zero, or that build 26200 caused it. The D2 on-disk and current-boot evidence—not public analogy—supports the final source classification.
