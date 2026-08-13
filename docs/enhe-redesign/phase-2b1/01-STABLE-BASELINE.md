# Stable Baseline

## Source worktree

```text
path=C:\Users\HU\Documents\New project 2\.worktrees\enhe-full-suite-stability-v1
branch=codex/enhe-full-suite-stability-v1
HEAD=4061dee2942cc87f81647604e3097e92129d100a
```

Required ancestry was verified for `1175061`, `4061dee`, `85cb3dc`, `64d1e72`, and `7acebac`. Commit `4061dee` is docs-only and its changed paths are exactly the four files under `docs/enhe-redesign/phase-1b213/14-17`.

The stable worktree had its pre-existing stat-only `M prisma/seed-ai-news-topics-data.cjs`. It was not modified, staged, committed, restored, or cleaned. Root layout inspection retained `AnalyticsTracker` and found no ByteDance loader. Heartbeat seam and writer files were not changed by this integration.

## Integration base

```text
path=C:\Users\HU\Documents\New project 2\.worktrees\enhe-public-shell-integration-v1
branch=codex/enhe-public-shell-integration-v1
base=4061dee2942cc87f81647604e3097e92129d100a
```

The fresh integration worktree started clean at the exact stable SHA. Its seed file blob matched the baseline blob `14db43f7aef16cb5a1a546a8d27b66e837552a60`.

