# Phase 2C.1 rollback

Rollback is source-local and does not require deployment action because `LIVE_PRODUCTION_CHANGED=NO`.

To remove this phase from the target branch, revert the three implementation commits in reverse order:

```text
cc97cc0 refactor(ui): scope legacy visual effects away from public routes
2c21d42 feat(home): wire approved bilingual homepage to production routes
0b1f251 feat(shell): wire redesigned public header and footer
```

Before any revert, inspect the target worktree and preserve unrelated user changes. Do not reset or force-checkout the worktree. The source boundary worktree remains the immutable Phase 2B.2R reference.
