# News compact cards and home folder refinements

Scope: compact stacked news cards and capped cover height; remove exactly the requested coverless production launch article with protected backup; align account name; add two skills and five news-topic destinations in both locales; blue/white language toggle; white daily-analysis action text.
No credentials, schema, dependencies or unrelated user data changed. Preserve existing release process and rollback version.

Checks: TypeScript passed. Focused ESLint passed. Build and browser checks in progress. Production article deletion: exact id/title/slug/empty-cover condition matched, one deleted; backup retained at /opt/enhe-ai-tools/backups/deleted-news-ai-news-trend-insights-launch-20261013.json (not in Git).

Validation: npx tsc --noEmit PASS; focused ESLint PASS; 16 focused Vitest tests PASS; npm run build PASS; 9 production-mode Playwright folder/navigation/responsive tests PASS. No production credentials used locally. Release/live verification pending.
