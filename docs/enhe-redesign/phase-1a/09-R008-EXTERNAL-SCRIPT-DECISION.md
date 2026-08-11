# R-008 external script decision

Audit evidence identifies a ByteDance external script in `src/app/root-layout-shared.tsx`, around lines 63–71, loaded with `beforeInteractive`.

`R008_DESIGN_DECISION=REMOVE_FROM_GLOBAL_BEFOREINTERACTIVE`
`R008_IMPLEMENTATION_STATUS=OPEN`
`R008_PHASE1B_GATE=BLOCKED`

The Phase 1B public shell must not continue a site-wide `beforeInteractive` load. This phase does not modify production code. Reintroduction is possible only after an identified owner, purpose, privacy policy, consent mechanism, route, performance budget, error handling, and data destination are all documented. The only permitted future patterns are route-scoped loading, `afterInteractive`, or loading after user consent.
