# Cherry-pick Evidence

All eight commits were cherry-picked into the fresh integration worktree with `git cherry-pick -x`, in the exact order required by Phase 2B.1. Each operation completed without conflict and produced the integration SHAs listed in `02-CANDIDATE-COMMIT-MAP.csv`.

The resulting integration HEAD before the Phase 2B.1 validation fix was `616b8520d28bfee1c5ec1ab8ff7969b796437af7`. A separate minimal validation fix then added the required `<html>/<body>` root to the standalone preview layout and its regression test; it did not alter the eight candidate commits or their scope.

The source-to-integration path audit found 18 authorized changed files and no unauthorized paths. Root layout, global stylesheet, package/lockfile, Prisma, and the seed content remained unchanged relative to `4061dee`.
