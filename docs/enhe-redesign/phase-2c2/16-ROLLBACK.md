# Rollback

No live deployment occurred, so there is no production runtime, database, environment, or remote rollback to perform.

If this local integration must be withdrawn before staging acceptance, use non-destructive git revert commits in reverse order: docs evidence, media hardening, production wiring, pagination correction, candidate regression, responsive candidate, layout candidate, design sync, and candidate data. Keep the design sync separate so its one-file scope remains auditable. Do not reset or rewrite either source branch.

If a later staging deployment has already incorporated the branch, first capture staging route and data evidence, then revert only the failing layer and rerun the same focused tests, two default full suites, seed-21101 shuffled suite, build, standalone HTTP matrix, SEO assertions, and screenshots before promotion.
