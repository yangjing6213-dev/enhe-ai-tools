# Red-green evidence

## RED

Before production-route implementation, the new route and adapter contract produced the expected failure: the formal bilingual routes were not wired, five production assertions failed across two suites, and the production adapter was absent. The failure was contract-specific rather than an environment or syntax failure.

SOFTWARE_PRODUCTION_WIRING_RED_STATUS=EXPECTED_FAIL

The failing contract covered formal route ownership, no preview fixture in production, 12-item pagination over 25 rows, prev/next, canonical and noindex behavior, SSR product semantics, bilingual detail links, formal Header/Footer, filing text, and absence of preview/file/delivery leakage.

## GREEN

The minimum implementation added the production adapter, route wiring, and only the media/accessibility hardening required by the tests and browser evidence. The final focused run passed 10 files and 58 tests. The full default and shuffled suites also passed.

SOFTWARE_PRODUCTION_WIRING_GREEN_STATUS=PASS
