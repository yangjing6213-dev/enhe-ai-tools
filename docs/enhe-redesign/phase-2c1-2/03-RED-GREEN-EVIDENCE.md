# TDD RED/GREEN evidence

Status: PASS

## Valid RED

The focused compliance tests were added before the production implementation. After correcting test-harness-only setup errors, the valid RED run produced six behavioral failures attributable to the existing product source:

1. English top-level labels did not match the approved exact values.
2. English and Chinese dropdown labels did not match the contract.
3. The language switch still used current/alternate ordering instead of always rendering `中文 / EN`.
4. The redesign Footer unconditionally rendered generic filing copy when no data existed.
5. The Footer could not render a supplied verified filing object.
6. Desktop/mobile source identity and Preview/production filing separation were not established.

The initial harness errors (`React is not defined` and a not-yet-exported test symbol) were fixture errors, were corrected before the valid RED run, and are not counted as product RED evidence.

```text
HEADER_COPY_RED_STATUS=EXPECTED_FAIL
FOOTER_FILING_RED_STATUS=EXPECTED_FAIL
```

## Minimal GREEN

The implementation introduced only:

- one typed bilingual navigation record;
- one typed two-locale language-href object;
- optional filing rendering in the existing Footer;
- one verified production filing module;
- one explicit Preview specimen module;
- production adapter wiring and legacy Footer reuse.

No CSS hiding, empty-string data, invisible DOM, inline style, `!important`, route change, or screenshot-time deletion of filing content was used.

## Focused GREEN result

The final focused group covered production copy compliance, public-shell candidate regression, homepage Preview regression, production wiring, visual source regression, English shared UI, and R-008/GEO source boundaries.

```text
Test Files  7 passed (7)
Tests       50 passed (50)
HEADER_COPY_GREEN_STATUS=PASS
FOOTER_FILING_GREEN_STATUS=PASS
```

An independent specification review and a separate code-quality review both returned no Critical, Important, or Minor issue. The quality reviewer explicitly marked the source ready to commit while keeping full-suite, browser, build, and standalone gates separate.
