# ENHE GitHub -> Tencent Cloud one-click deploy workflow

This workflow is for publishing local changes to GitHub and then asking the Tencent Cloud server to pull and deploy the latest `main` branch.

## Default target

- Git branch: `main`
- Server: `ubuntu@111.229.135.3`
- SSH key path: `E:\Ai Project\01.网站相关资料\密钥`
- Remote project directory: `/opt/enhe-ai-tools`
- Remote deploy script: `/opt/enhe-ai-tools/deploy.sh`

## Recommended command

Run from the project root on Windows PowerShell:

```powershell
.\scripts\push-and-deploy.ps1 -CommitMessage "Update ENHE AI tools site"
```

The script will:

1. Run local checks: `npm test`, `npm run typecheck`, `npm run lint`.
2. Stage and commit local changes.
3. Pull with rebase from GitHub.
4. Push to `origin/main`.
5. SSH into Tencent Cloud.
6. Run `/opt/enhe-ai-tools/deploy.sh`.

## Useful options

Skip local checks only when you are doing an urgent server sync:

```powershell
.\scripts\push-and-deploy.ps1 -SkipChecks -CommitMessage "Hotfix deploy"
```

Run a production build before pushing:

```powershell
.\scripts\push-and-deploy.ps1 -RunBuild -CommitMessage "Verified production build"
```

Push to GitHub but do not deploy to Tencent Cloud:

```powershell
.\scripts\push-and-deploy.ps1 -NoDeploy -CommitMessage "Save work in GitHub"
```

Use an explicit key file instead of the default key folder:

```powershell
.\scripts\push-and-deploy.ps1 -SshKeyPath "E:\Ai Project\01.网站相关资料\密钥\fushengpe.pem"
```

## Safety notes

- The script refuses to commit `.env`, `.env.*`, `.codex-logs`, `.dev-logs`, or `web-access`.
- On Windows, the script copies the selected SSH private key to `%USERPROFILE%\.ssh\enhe-ai-tools-tencent.pem` and locks its ACL before connecting, so OpenSSH will not reject it as "too open".
- The remote deployment still uses the existing project directory `/opt/enhe-ai-tools`.
- The remote deployment relies on the existing `deploy.sh`, which uses the isolated ENHE Docker Compose file and port `3001:3000`.
