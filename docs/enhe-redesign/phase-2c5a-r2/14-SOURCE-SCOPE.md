# Source Scope

```text
SOURCE_BRANCH=codex/enhe-phase2c5-same-host-rc-audit-r1
SOURCE_HEAD=9d686f93917a6ae3a9ba5df079b89e24788ebf1e
SOURCE_TREE=9bf5f9a1200e2ee8b0d5111f8df60cbe208da70a
WORKTREE_PATH=C:\Users\HU\Documents\New project 2\.worktrees\enhe-phase2c5-same-host-rc-audit-r2
BRANCH=codex/enhe-phase2c5-same-host-rc-audit-r2
START_HEAD=9d686f93917a6ae3a9ba5df079b89e24788ebf1e
APPLICATION_SOURCE_CHANGED=NO
DEPLOYMENT_SOURCE_CHANGED=NO
PACKAGE_CHANGED=NO
LOCKFILE_CHANGED=NO
PRISMA_CHANGED=NO
SCHEMA_CHANGED=NO
MIGRATION_CHANGED=NO
UNAUTHORIZED_PATHS=0
```

Relative to the locked start commit, the following protected ranges have zero diff: `src`, `public`, `package.json`, `package-lock.json`, `prisma`, `Dockerfile`, `next.config.ts`, `middleware.ts`, `deploy`, and `scripts`.

Only `docs/enhe-redesign/phase-2c5a-r2/**` is eligible for the R2 commit. Temporary Bash, Python, tests, Parsed JSON, and sanitized runtime receipt remain outside Git and are deleted after packaging.
