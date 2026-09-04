# EBOS Validation Launch Execution

## Purpose

Validation Launch Execution turns Step 10.5 readiness and runbook output into an executable launch package. It does not publish to external platforms, does not log in to accounts, and does not claim deployment. It prepares the checks, copy packs, post-launch smoke plan, and data intake workflow needed for AI Prompt Kit validation.

## Difference From Readiness And Runbook

- Readiness answers whether validation pages, assets, tracking, SEO/GEO, and input files are prepared.
- Runbook explains the operator flow and minimum user actions.
- Launch Execution packages the concrete deployment checklist, smoke-test URLs, external copy pack, data intake sequence, rollback notes, and next commands.

## What Codex Can Execute

- Generate the launch execution JSON and Markdown reports.
- Run lint, typecheck, build, and EBOS validation scripts.
- Prepare post-launch dry-run checks for public validation URLs.
- Convert user-provided real channel data into external intake input.
- Run dry-run import, apply import after review, and regenerate validation, decision, weekly, and monthly reports.

## What The User Must Confirm

- Whether the validation page is actually deployed.
- Whether Xianyu, Taobao, Whop, Xiaohongshu, or WeChat content was manually published.
- The real observed metrics from those external platforms.
- Any user feedback, orders, revenue, refunds, or messages.

## Generate Launch Execution Report

```powershell
npx tsx scripts/generate-ebos-validation-launch-execution.ts --date 2026-07-03
```

This writes:

- `reports/ebos/validation/launch-execution/2026-07-03-validation-launch-execution.json`
- `reports/ebos/validation/launch-execution/2026-07-03-validation-launch-execution.md`

## Run Post-Launch Check

Use dry-run before confirmed deployment:

```powershell
npx tsx scripts/check-ebos-validation-post-launch.ts --date 2026-07-03 --site-url https://www.enhe-tech.com.cn --dry-run
```

This writes:

- `reports/ebos/validation/launch-execution/2026-07-03-post-launch-check.json`
- `reports/ebos/validation/launch-execution/2026-07-03-post-launch-check.md`

Without `--dry-run`, the script may perform low-frequency GET requests against the public validation URLs only. Network failures are recorded as warnings.

## External Data Backfill

1. User publishes or confirms external platform posts/listings manually.
2. User provides real observed metrics to Codex.
3. Codex writes `reports/ebos/validation/intake/inputs/YYYY-MM-DD-external-intake-input.json`.
4. Codex runs dry-run import.
5. Codex applies the import only after review.
6. Codex regenerates validation and decision reports.
7. Codex regenerates weekly and monthly reports.

## Regenerate Downstream Reports

```powershell
npx tsx scripts/import-ebos-external-intake.ts --date 2026-07-03
npx tsx scripts/import-ebos-external-intake.ts --date 2026-07-03 --apply
npx tsx scripts/generate-ebos-validation-report.ts --date 2026-07-03
npx tsx scripts/generate-ebos-decision-report.ts --date 2026-07-03
npx tsx scripts/generate-ebos-weekly-report.ts --date 2026-07-03
npx tsx scripts/generate-ebos-monthly-review.ts --date 2026-07-03
```

## Risk Boundaries

- Do not fabricate views, clicks, messages, orders, revenue, refunds, or user feedback.
- Do not log in to Xianyu, Taobao, Whop, Xiaohongshu, WeChat, or any other external platform.
- Do not claim `deployed_pending_verification` unless deployment is explicitly confirmed.
- Do not delete EBOS reports during rollback; keep them as audit artifacts.
