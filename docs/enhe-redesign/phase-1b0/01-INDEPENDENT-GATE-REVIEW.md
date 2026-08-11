# Independent Phase 1B gate review

## Verified facts

1. The V1 collector used the default `HttpClient` handler. Automatic redirects were not disabled, so its apparent 528 final HTTP 200 results could not prove that initial 301/302 responses were absent.
2. The V2 collector explicitly sets `HttpClientHandler.AllowAutoRedirect = false`, follows at most five redirect hops itself, and retains initial/final status and the chain. The fresh run exposed a real one-hop 301 that V1 had hidden.
3. The fresh public run succeeded without authentication or form/API mutation. The 528 sitemap URLs and 24 core-contract memberships de-duplicated to 534 public requests.
4. Production Git/image/route/migration/config fingerprints were not obtained. Tracked deployment materials contain no `Host` declaration, `BatchMode` command, or `ConnectTimeout` command for a production alias. The existing deployment script uses a literal host plus a key and performs writes; it is not a permitted read-only alias.
5. A historical operator-authored report says a July deployment reached commit `f3500ddf45a65211b017930b48324659ca1795a6`. It lacks current host output, immutable image digest, route manifest, migration/config hashes, and a current observation window. It is historical evidence, not the current production fingerprint.
6. Current redesign and `feature/enhe-api-gateway` share the missing-module lineage. Local `main` and `origin/main` contain the missing modules but differ in root layout and other source. The original worktree has hundreds of unrelated dirty entries and untracked versions of the missing files.
7. No production File metadata was available. Therefore only two external-source rows and one parser false positive can be closed from public evidence. The other 15 rows remain `UNKNOWN_REQUIRES_OWNER`; no paid/free inference was made.

## Evidence-led judgments

- `R006_V2_STATUS=COMPLETE_WITH_OPEN_CONFLICTS`: collection is trustworthy, but HTTP/core/language/source conflicts remain.
- `PRODUCTION_FINGERPRINT_STATUS=BLOCKED`: a historical report or local ref is not a substitute for current immutable production evidence.
- `AUTHORITATIVE_SOURCE_BASELINE=BLOCKED`: main is a strong source candidate, not an authority, until production is mapped.
- `R008_INTEGRATION_STATUS=BLOCKED_PRODUCTION_BASELINE`: the loader is absent in redesign but present in main and in the historical deployment candidate. That branch divergence cannot be closed by the redesign-only negative test.
- `P0_CONTAINMENT_REQUIRED=YES`: the rule is triggered by 15 unclassified delivery-address observations, not by a claim that 15 paid packages are proven leaks.
- `PHASE_1B_OVERALL_STATUS=NOT_READY`: Phase 1A approval alone does not close production, source, R-008, exposure, or build-baseline gates.

## Important uncertainties and bias controls

- Public responses are a time-bounded observation and may change after the recorded UTC timestamp.
- Local refs are stale unless fetched, and fetch was prohibited. Remote-tracking names are not current production evidence.
- Historical deployment reports are operator assertions and susceptible to staleness and incomplete capture.
- A public permanent address is evidence of exposure, not evidence of price, ownership, or entitlement.
- Local test/build failures are evidence about this branch, not proof of production behavior.
