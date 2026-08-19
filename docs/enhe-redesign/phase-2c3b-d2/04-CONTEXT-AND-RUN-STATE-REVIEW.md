# Context and Run-State Review

## Docker Context Metadata

One context metadata object was scanned by hashed identifier. Its metadata file existed, contained no NUL, was not all zero, parsed as valid JSON, and its non-sensitive endpoint metadata also validated. No context name, endpoint URL, certificate, or credential was read into this report.

`CONTEXT_METADATA_SCAN_COUNT=1`

`CONTEXT_METADATA_NUL_CANDIDATE=NO`

`CONTEXT_METADATA_INVALID_COUNT=0`

This rules out `CORRUPT_DOCKER_CONTEXT_METADATA` for the current boot.

## Socket-Like Run State

Metadata-only checks found the expected zero-byte NTFS reparse-point entries for `dockerInference`, `engine.sock`, and two other Docker run-state objects. Attribute reads succeeded for all four. The scanner did not open socket contents, request write handles, change ACLs, delete, or rename any entry.

`DOCKER_INFERENCE_SOCKET_PRESENT=YES`

`DOCKER_INFERENCE_SOCKET_ACCESS_STATUS=ATTRIBUTES_READABLE_REPARSE_POINT`

`SECRETS_ENGINE_SOCKET_PRESENT=YES`

`INFERENCE_MANAGER_ERROR_COUNT=0`

## Build 26200 Pattern Check

The current boot did not contain an Inference manager failure, `dockerInference` failure, Model Runner failure, secrets-engine failure, AF_UNIX removal failure, or error 1920. A generic socket token occurred once but did not match the public stale-socket signature.

`RELATED_BUILD26200_PATTERN_STATUS=NOT_OBSERVED`

Public reports on build 26200 are therefore related platform evidence only. A shared Windows build does not make their socket failure the same defect as the current all-zero Docker JSON state file.
