# Sanitized Command Log

Variables used below are sanitized logical paths. Raw outputs remain in the D2 quarantine directory when allowed.

## Baseline and Worktree

```powershell
git -C $source branch --show-current
git -C $source rev-parse HEAD
git -C $source status --porcelain=v1 -uall
git worktree add -b codex/enhe-docker-backend-diagnostics-v1 $worktree aa83310340c3ef3f02427f02865800617343dfec
```

The D1 ZIP was verified with a stable Python streaming SHA-256 reader, ZIP CRC/path checks, temporary extraction, and per-file Git-blob hash comparison. The temporary extraction was removed after verification.

## Read-Only Version and Platform Checks

```powershell
docker desktop version
docker version
docker compose version
docker buildx version
wsl --version
wsl --status
```

Installed binary file metadata and SHA-256 values were read. Windows version and WindowsSelfHost metadata were read without exporting or changing Registry data. VHDX content was not read; only file size, timestamp, and attributes were compared.

## Diagnostic Capability Gate

```powershell
docker desktop diagnose --help
com.docker.diagnose.exe --help
com.docker.diagnose.exe gather --help
```

No gather command was run because the documented no-Diagnostic-ID gate could not be met.

## State Scans

A one-time system-temp Python scanner produced hashed-path metadata only:

```text
nul-scan-full.csv
context-scan-pre.csv
run-state-pre.csv
pre-start-state.csv
post-start-state.csv
context-scan-post.csv
run-state-post.csv
state-file-diff.csv
```

The scanner excluded credentials, private keys, certificates, project data, VHDX content, container filesystems, and files above the authorized content-read limit. It did not write Docker-owned state.

## Controlled Start and Stop

```powershell
docker desktop start
docker desktop status
docker version
docker desktop logs --boot 0
docker desktop stop
```

`docker desktop start` was invoked once. The monitor collected three samples and then failed with `WinError 8`; it was not retried. The boot log and state snapshots were collected separately. The final read-only process/pipe check found Docker stopped.

No `wsl --shutdown`, image pull, container command, Docker cleanup, reset, update, downgrade, reinstall, state-file move/delete, ACL edit, configuration edit, or resource mutation command was executed.

## Public Research

Read-only searches and page opens were limited to Docker Docs and the public `docker/desktop-feedback` and `docker/for-win` issue repositories. No login, comment, issue submission, or upload occurred.

## Project and Delivery Verification

```powershell
git status --porcelain=v1 -uall
git diff --name-only aa83310340c3ef3f02427f02865800617343dfec -- src public package.json package-lock.json prisma next.config.ts middleware.ts
git diff --check
git add <each of the 13 authorized D2 document paths>
git commit -m "docs(ops): trace Docker backend NUL provenance and version correlation"
```

No `git add .`, push, remote edit, deployment, application build, migration, seed, or production connection is authorized.
