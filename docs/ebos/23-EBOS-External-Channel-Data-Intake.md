# EBOS External Channel Data Intake

## Purpose

External Channel Data Intake converts EBOS validation manual slots into a local file that the user can fill with real external channel data. Codex can generate the template, validate the local file, run a dry-run import, back up the current validation input, and merge the data only when `--apply` is used.

## Safety Boundary

Codex must not invent external platform data. Codex must not log in to Xianyu, Taobao, Whop, Xiaohongshu, WeChat, email, or any other external platform for this flow. Codex must not call external APIs. The only accepted source is a local intake file filled from real user observations.

Keep unknown metrics as `0`. Only replace a zero when the user has observed the metric from a real channel.

## Generate Template

```bash
npx tsx scripts/generate-ebos-external-intake-template.ts --date 2026-07-03
```

Generated files:

- `reports/ebos/validation/intake/templates/2026-07-03-external-intake-template.json`
- `reports/ebos/validation/intake/templates/2026-07-03-external-intake-template.md`
- `reports/ebos/validation/intake/inputs/2026-07-03-external-intake-input.json`

The editable input is not overwritten unless `--force` is passed.

## Fill JSON

Open the editable input JSON and fill only real observed values:

- `views`, `clicks`, `messages`, `orders`, `paidOrders`, `revenue`, `refundCount`
- `userFeedback` as an array of real user feedback summaries
- `notes` for short channel context

Leave unavailable or zero metrics as `0`.

## Fill Markdown Table

The Markdown template contains a CSV-like table. The same columns can be copied into a local Markdown intake file and imported with `--input path`.

Required columns are:

- `channel`
- `targetPlanId`

All numeric columns can stay `0` when no real value is available.

## Dry-Run Import

```bash
npx tsx scripts/import-ebos-external-intake.ts --date 2026-07-03
```

Dry-run validates the intake and reports candidate changes. It does not write `validation-input.json` and does not create a backup.

## Apply Import

```bash
npx tsx scripts/import-ebos-external-intake.ts --date 2026-07-03 --apply
```

`--apply` backs up the current validation input, writes merged values, and creates an import report.

## Backup

Backups are written to:

```text
reports/ebos/validation/intake/backups/YYYY-MM-DD-validation-input.before-external-intake.TIMESTAMP.json
```

## Import Reports

Import reports are written to:

- `reports/ebos/validation/intake/imports/YYYY-MM-DD-external-intake-import-report.json`
- `reports/ebos/validation/intake/imports/YYYY-MM-DD-external-intake-import-report.md`

The report lists applied fields, skipped fields, data quality warnings, and remaining data gaps.

## Regenerate Downstream Reports

After applying an import, run:

```bash
npx tsx scripts/check-ebos-validation-input.ts --date 2026-07-03
npx tsx scripts/generate-ebos-validation-report.ts --date 2026-07-03
npx tsx scripts/generate-ebos-decision-report.ts --date 2026-07-03
npx tsx scripts/generate-ebos-weekly-report.ts --date 2026-07-03
npx tsx scripts/generate-ebos-monthly-review.ts --date 2026-07-03
```

Validation, weekly, and monthly reports can reference whether external intake is not generated, generated but unfilled, filled but not imported, dry-run only, or imported.
