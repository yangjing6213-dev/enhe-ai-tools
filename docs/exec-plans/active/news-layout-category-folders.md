# News layout, account navigation and category folders

- Scope: stack all AI News card grids while preserving filter fields; white news badges; neutral account navigation matching link typography; replace the first homepage folder note with five existing category IDs and locale-aware links.
- Mobile: the tools folder spans its row and uses a smaller fan spread so five notes stay within the viewport. Other folder behavior is preserved.
- Verified: real local PostgreSQL news detail with an authenticated header, matching account typography, stacked card grids, white badges and no overflow at 320/768/1440 passed. 19 homepage/category/theme browser cases passed, including ten localized category destinations, pointer/keyboard/touch and note geometry.
- Full unit run: 2803 passed, 100 skipped; two module-import checks exceeded five seconds during concurrent browser startup. Both passed in an isolated rerun without changing tests/timeouts. Lint and initial typecheck passed.
- Final production build and 10 focused production browser cases passed. Pending scoped release and public live checks. No schema, credential or dependency changes. Disposable local test database removed.