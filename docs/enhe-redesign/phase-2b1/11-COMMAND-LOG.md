# Command Log

The following command groups were executed in `C:\Users\HU\Documents\New project 2\.worktrees\enhe-public-shell-integration-v1`:

```text
npm ci
npm run lint
npm run typecheck
npm test -- focused public-shell and technical regression files
npm test                         # three default runs
npm test -- shuffle seed 21101
npm test -- shuffle seed 21102
npm test -- shuffle seed 21103
node .phase2b1-playwright.mjs
docker pull postgres:16-alpine
docker run ... --tmpfs /var/lib/postgresql/data -p 127.0.0.1::5432 postgres:16-alpine
npm run prisma:deploy            # process-only temporary DATABASE_URL/DIRECT_URL
npx prisma migrate status
npm run build
node .next/standalone/**/server.js # actual traced standalone entry
```

The first two Build attempts failed only in the disposable verification harness: Windows `spawnSync npm.cmd` returned `EINVAL`, then the harness selected a nested Next testmode `server.js`. Both issues were corrected in the harness before the final successful Build. No source or production configuration was changed for either correction.

The Dev Preview required a restart after HMR became unresponsive. The final single-run Playwright result was `PLAYWRIGHT_PREVIEW=PASS`. Temporary harness scripts/logs were removed before the docs-only commit.

