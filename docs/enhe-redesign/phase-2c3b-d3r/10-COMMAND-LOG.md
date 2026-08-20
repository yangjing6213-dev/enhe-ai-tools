# Command Log

This is a sanitized command ledger. It intentionally omits state/configuration
bodies, complete active state-file paths, raw logs, environment values,
connection strings, credentials, and database content.

| Stage | Result |
| --- | --- |
| Control worktree/common Git directory/clean state | PASS |
| Existing D3 branch HEAD and docs-only commit scope | PASS |
| Normal D3 worktree reconstruction without `--force` | PASS |
| D3 ZIP SHA/CRC/path/file-set/Git-Blob comparison | PASS |
| Full read of twelve D3 documents | PASS |
| Retained backup/quarantine identity | PASS |
| Active state-file path-hash and valid/no-NUL form | PASS |
| Four protected fingerprints before start | PASS |
| `.env.example` tracked-template and active-env filename gate | PASS |
| `npm ci` | PASS |
| Docker stopped/process pre-gate | PASS |
| One `docker desktop start --timeout 300` | PASS |
| Linux Engine/context/current-boot checks | PASS |
| Docker resource pre-baseline | PASS |
| One labeled tmpfs PostgreSQL container | PASS |
| `pg_isready` | PASS |
| Prisma `migrate deploy` and `migrate status` | PASS, 49 |
| `npm run build` | PASS |
| Nested traced standalone and nine route probes | PASS |
| Formal-output content gates | PASS |
| Standalone stop and port check | PASS |
| Exact labeled container removal | PASS |
| Docker resource post-baseline comparison | PASS |
| `docker desktop stop` and final process check | PASS |
| Final quarantine, active, and protected fingerprints | PASS |
| Protected source Git canonical comparison | PASS |

Two early read-only inspect probes had shell-template quoting errors. They did
not alter the running container. The same selected fields were then verified
through argument-array invocation without reading full inspect data or the
container environment. An initial inline HTTP probe was rejected by PowerShell
before Node execution; an ignored `.next` probe file was used and then deleted.
