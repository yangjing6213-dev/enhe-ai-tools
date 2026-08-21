# Rollback

No deployment or push occurred, so rollback is local and does not require production operations.

## Commit boundaries

1. Documentation/media commit (this commit).
2. `6b861b58b66733f236cdd44b3ce102c2f8d8cc7a` — D4R final-gate tests.
3. `73564f90a495a6a31f7b0b3b7343622c84d2eb61` — category/support lifecycle suppression.
4. `fac9b688f78048109b58770cd8580a0dbd64363c` — home no-JavaScript fallback.

If an approved rollback is needed, use non-destructive `git revert` in reverse order and rerun the same targeted and full gates. Do not reset the D4 source worktree or delete its historical documents.

## Functional effects of rollback

- Reverting the SSR commit restores the original one-product no-JavaScript defect.
- Reverting the category/support commit restores the mobile collision defect.
- Reverting only tests/documents does not remove production behavior and must not be reported as a functional rollback.

The final-r1 result archive is evidence, not a deployment package.
