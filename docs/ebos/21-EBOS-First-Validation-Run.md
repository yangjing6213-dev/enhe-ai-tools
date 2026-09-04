# EBOS First Validation Run

## Purpose

Step 9.7 turns EBOS validation from planning into observed-result discipline. The goal is to run one small validation cycle, record only real signals, and let the next Validation Result, Weekly Report, Monthly Review, and Decision Report use those results.

This step does not create admin UI, migrations, external API calls, or fabricated metrics.

## Why Not Keep Developing Forever

EBOS should not keep adding product features before demand is observed. The first validation run forces three questions:

- Did anyone see the offer?
- Did anyone click, message, reply, leave a lead, preorder, or pay?
- Did any order refund or create delivery/support risk?

If the answer is unknown, record `not_started` or leave fields empty. Unknown is not failure.

## AI Prompt Kit Validation

Validate AI Prompt Kit with a focused offer page and marketplace/manual follow-up if used.

Record:

- `pageViews`
- `ctaClicks`
- `leads`
- `conversionRate`
- `listingViews`
- `messages`
- `presaleOrders`
- `paidOrders`
- `revenue`
- `notes`

Success signals are clean paid orders, presale orders, qualified leads, or repeated high-intent messages. CTA clicks without leads should trigger offer, trust, and consultation-entry optimization.

## FaceSwap Studio Validation

Validate FaceSwap Studio as an existing product revenue test.

Record:

- `priceShown`
- `ctaClicks`
- `paidOrders`
- `refundCount`
- `feedback`
- `productPageViews`
- `productPageCtaClicks`
- `listingViews`
- `messages`
- `deliveryFeedback`
- `supportQuestions`

Paid orders with no refunds are success. Paid orders with refunds are partial success and require refund reason, delivery expectation, product description, and support analysis.

## AI Video Studio Validation

Validate AI Video Studio with the same existing-product revenue rules as FaceSwap Studio.

Record:

- `priceShown`
- `ctaClicks`
- `paidOrders`
- `refundCount`
- `feedback`
- `productPageViews`
- `productPageCtaClicks`
- `listingViews`
- `messages`
- `deliveryFeedback`
- `supportQuestions`

If product page CTA clicks reach 10 or more but leads remain 0, treat the result as inconclusive or adjustment-needed, not success.

## Channel Data To Record

Marketplace listing:

- `listingViews`
- `clicks`
- `favorites`
- `messages`
- `orders`
- `revenue`

Product page:

- `productPageViews`
- `productPageCtaClicks`
- `ctaClicks`
- `leads`
- `paidOrders`

Manual outreach:

- `manualOutreachCount`
- `positiveReplies`
- `negativeReplies`
- `callsBooked`
- `orders`

Pricing test:

- `priceShown`
- `ctaClicks`
- `paidOrders`
- `refundCount`
- `feedback`

## How To Fill validation-input.json

Open:

```bash
reports/ebos/validation/inputs/YYYY-MM-DD-validation-input.json
```

Rules:

- Keep `planId` unchanged.
- Set `status` to `not_started`, `running`, `completed`, or `skipped`.
- Record only observed values.
- Keep unknown numeric fields as `0`.
- Keep unknown text fields as empty strings.
- Keep unknown arrays as `[]`.
- Do not fabricate CTA clicks, leads, orders, revenue, refunds, or feedback.

## Check Input

Run:

```bash
npx tsx scripts/check-ebos-validation-input.ts --date YYYY-MM-DD
```

Use `--input path/to/file.json` to check a non-default input file.

The check reports:

- input completeness
- validation errors
- data quality warnings
- per-plan status
- suggested fields to fill
- channel attribution summary

## Generate Validation Result Report

Run:

```bash
npx tsx scripts/generate-ebos-validation-report.ts --date YYYY-MM-DD
```

This reads the validation input and writes the validation result report under:

```bash
reports/ebos/validation/reports/
```

The report now includes channel attribution, input completeness, data quality reminders, and next-run recording suggestions.

## How The Next Decision Uses Results

The next Decision Report should use the validation result report as a decision input:

- `success`: continue or scale.
- `partial_success`: adjust offer, price, channel, delivery, or trust proof.
- `inconclusive`: collect more data or fix the recording funnel.
- `failed`: stop or pause only when a completed run has enough real data and no demand signal.
- `not_started`: do not judge demand; run or record the validation first.

Validation Result remains a tracker/report input. It is not an Evidence Catalog kind.
