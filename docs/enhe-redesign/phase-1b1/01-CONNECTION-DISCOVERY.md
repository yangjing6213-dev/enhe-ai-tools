PRODUCTION_CONNECTION_STATUS=PASS
CONNECTION_SOURCE_FILE=scripts/push-and-deploy.ps1
CONNECTION_CANDIDATE_COUNT=1
CONNECTION_CANDIDATE_ID=415A2C4D69AE288959439F1F4F1B323F1365E6BD6054DC0814CE41799E32BCB1
KEY_FILE_EXISTS=YES
KEY_FILE_CONTENT_READ=NO

# Tracked production connection discovery

The connection target, user, port, project path, and identity-path resolver came only from the tracked deployment script. Discovery did not use shell history, browser history, clipboard, untracked files, `.env`, credential stores, another project, or private-key content.

## Candidate checks

| check | result |
|---|---|
| unique effective candidate | PASS (`1`) |
| tracked source | PASS |
| project path equals `/opt/enhe-ai-tools` | PASS |
| identity file exists | PASS |
| password option absent | PASS |
| `StrictHostKeyChecking=no` absent | PASS |
| staging/test marker absent | PASS |
| candidate identifier | SHA-256 over the in-memory target/user and resolved identity-path tuple |

The target, public IP, remote user, and identity-file path were never printed or written to an artifact.

## Connection contract

The successful probe used `BatchMode=yes`, `ConnectTimeout=10`, `StrictHostKeyChecking=yes`, `LogLevel=ERROR`, password authentication disabled, no TTY, no forwarding, no agent forwarding, and no X11 forwarding. The only probe output was:

```text
PRODUCTION_READONLY_CONNECTION=PASS
```

No host key was added or bypassed, and no interactive shell was opened.
