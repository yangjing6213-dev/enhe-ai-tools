# Command Log

| Stage | Result | Evidence boundary |
| --- | --- | --- |
| D2 branch/HEAD/status/history | PASS | Read-only Git checks |
| D2 ZIP size/SHA/CRC/path/file-set/Blob comparison | PASS | System temporary extraction removed |
| Four-family exact candidate scan | PASS | 1 candidate, 1 exact match, 0 errors |
| Docker stopped/process gate | PASS | Desktop unavailable; matching processes 0 |
| First ACL metadata attempt | EXPECTEDLY PRESERVED FAILURE | Wrong PowerShell-major module selected; no file mutation |
| Explicit system Security module check | PASS | Owner SID and SDDL available; values not documented |
| Exact backup | PASS | 28 bytes and original SHA-256 verified |
| Exact move to quarantine | PASS | Source absent; backup and quarantine equal |
| Protected-file quarantine diff | PASS | Four protected content fingerprints unchanged |
| Controlled Docker start | PASS | Exactly 1 invocation; Linux server ready at 10 seconds |
| Current boot analysis | PASS | 0 raw NUL bytes; 0 target error lines |
| Regenerated active-state validation | PASS | Nonempty, no NUL, UTF-8 JSON object |
| Container-gate environment filename guard | BLOCKED | Tracked `.env.example` misclassified; body not read |
| Docker resource pre-baseline | NOT_RUN | Guard stopped before baseline |
| Image inspect/pull | NOT_RUN | No image mutation |
| `docker run` | NOT_RUN | Container-create invocation count 0 |
| `pg_isready` | NOT_RUN | No temporary PostgreSQL |
| Prisma deploy/status | NOT_RUN | No database connection |
| `npm run build` | NOT_RUN | Migration prerequisite missing |
| Traced standalone/routes/content | NOT_RUN | Build prerequisite missing |
| Residual D3 container check | PASS | 0 |
| Temporary DB environment equality | PASS | Inherited values unchanged; values never printed |
| Docker Desktop stop | PASS | exit 0; processes 0; server disconnected |
| Final backup/quarantine hash | PASS | Both original copies retained |

No command included or printed a secret. No container log, volume content, database content, Docker configuration body, or project environment-file body was read.
