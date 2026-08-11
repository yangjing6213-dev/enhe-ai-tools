# Phase 1B.2.3 deploy-config failure report

| required record | evidence |
|---|---|
| Test name | `isolated launch deployment contract > injects the complete app runtime environment from required env files` |
| Test command | `npm test -- src/lib/deploy-config.test.ts --reporter=verbose` |
| Failure message | The extracted `app` string was empty and did not match the required `env_file` pattern. |
| Failure assertion | `src/lib/deploy-config.test.ts:25`, the `env_file` contract assertion. |
| Call path | Vitest -> local `read()` -> tracked `deploy/enhe-ai-tools/docker-compose.yml` -> service-block regex -> `env_file` assertion. |
| Input source | Tracked Compose file resolved from `__dirname`; no fixture, `.env` body, caller CWD, network, Docker runtime, or production host. |
| Expected contract | The `app` service has `env_file` entries `.env` and `../../zpay.env`; unsupported object-form fields and inline sensitive keys remain absent. |
| Actual behavior | The tracked Compose contract was present, but the LF-only service-block regex returned no match on the CRLF worktree file. |
| Recent related commit | `951a207` introduced the test and Compose contract; Phase 1B.2 Prisma commits did not introduce this failure. |
| Working example | The same Compose file contains the required entries, and repository tests already use `\r?\n` when line endings are not contractual. |
| Difference list | HEAD text uses LF; this Windows checkout uses CRLF under `core.autocrlf=true`; service names and `env_file` values are unchanged; old block regex fails, portable block regex succeeds. |
| Root-cause hypothesis | The test parser is environment-dependent because it treats LF as the only valid line separator. |
| Minimum verification experiment | Count line endings and evaluate old versus `\r?\n` block regexes against the same tracked file. Result: CRLF 129, bare LF 0, old match false, portable match true, required `env_file` match true. |
| Confirmed root cause | `DEPLOY_TEST_ENVIRONMENT_DEPENDENT` — CRLF-unsafe test service-block extraction. The deployment contract is not missing. |
| Modified file | `src/lib/deploy-config.test.ts` only. No implementation or fixture exists or was needed. |
| Why this fixes the root cause | The test now accepts both Git-valid checkout line endings at the exact parsing boundary while retaining every deployment assertion and value. |
| Regression test | The original focused test changed from 12 passed / 1 failed to 13 passed / 0 failed. |
| Final status | `DEPLOY_CONFIG_GREEN_STATUS=PASS`; commit `264aed53f3839f8b679f9f31268b21b0fa1b9af5`. |

```text
DEPLOY_CONFIG_ROOT_CAUSE=DEPLOY_TEST_ENVIRONMENT_DEPENDENT
DEPLOY_CONFIG_RED_STATUS=CONFIRMED_EXISTING_FAILURE
DEPLOY_CONFIG_GREEN_STATUS=PASS
REAL_DEPLOYMENT_CONFIG_MODIFIED=NO
REAL_DEPLOYMENT_SEMANTICS_CHANGED=NO
```
