# ENHE Deployment Command Audit

- commandsAudited: 31
- dangerousCommandsDetected: 0
- migrationCommandsDetected: 0
- secretExposureRisks: 0
- manualRequiredCommands: 7
- safeToProceed: true

## Manual Required Commands
- server | Server project path must be confirmed before SSH or deployment commands are run.
- docker | docker compose -f deploy/enhe-ai-tools/docker-compose.yml up -d --build
- docker | docker compose -f deploy/enhe-ai-tools/docker-compose.yml ps
- server | Manual confirmation required: Server project path must be confirmed before SSH or deployment commands are run.
- docker | docker compose -f deploy/enhe-ai-tools/docker-compose.yml up -d --build
- docker | docker compose -f deploy/enhe-ai-tools/docker-compose.yml ps
- nginx | nginx -t && nginx -s reload

## Warnings
- Must be executed by the user in the server context or after explicit executable environment confirmation.
