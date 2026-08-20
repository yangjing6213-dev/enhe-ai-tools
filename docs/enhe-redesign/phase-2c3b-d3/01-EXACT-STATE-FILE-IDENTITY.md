# Exact State-File Identity

## D2 authority validation

The D2 source branch and worktree were clean at exact HEAD `73fa4d18dad8624275284204c3c629eeca6f6f51`. The D1 documentation commit, three Motion-hygiene commits, R4 support-exclusion work, Phase 2C.2 software wiring, R-008 closure, Heartbeat seam, and Writer fix remain in its history.

The D2 result archive was independently streamed and extracted into a system temporary directory:

- size: `23424` bytes;
- SHA-256: `15e578c38a3ff4b9f70734e7cba4b5115525e6d6682d9efe0132913511641e8e`;
- file count: `13`;
- bad CRC count: `0`;
- invalid archive paths: `0`;
- Git file-set match: `YES`;
- Git Blob match: `YES`;
- mismatch count: `0`.

The required nine D2 documents were read in full and left unchanged.

## D3 unique resolution

Only the four authorized Docker-owned path families were scanned. The scan returned:

```text
CANDIDATE_COUNT=1
EXACT_MATCH_COUNT=1
SCAN_ERROR_COUNT=0
```

The unique candidate matched all D2 identity facts:

- basename: `windows-daemon.json`;
- path hash: `f66dab6d82e50c35c18a8571827a1893ae69e29942a713cbb19a0da8c1a9e9b8`;
- size: `28` bytes;
- SHA-256: `3addfb141cd7c9c4c6543a82191a3707ac29c7a041217782e61d4d91c691aee8`;
- all-zero: `YES`;
- NUL count: `28`;
- JSON parse: `INVALID`;
- reparse point: `NO`.

The full active path is intentionally omitted.

## Why `settings.dat` was not handled

`settings.dat` has a different basename, path hash, size, SHA-256, byte profile, and documented role. Its NUL bytes occur inside a 40-byte non-JSON binary record; it was never a candidate for the exact D2 source. D3 performed read-only fingerprint checks only and did not move, edit, replace, or delete it.

`EXACT_STATE_FILE_IDENTITY=PASS`
