# Shared language switch and detail UI polish

- Scope: match English hero spacing to Chinese; common desktop title/subtitle slots; official React Bits SquishSwitch with existing locale hrefs and preference cookie; rounded triangular back icons; white product primary button text; download button glow/shadow exclusion.
- Constraints: retain routes, authentication, query/filter locale targets and product behavior. No credentials, dependencies or schema changes.
- Verified: 17 focused navigation/home browser cases; six switch/layout cases (including corrected narrow widths); mouse, keyboard, touch and reduced motion. Full unit run: 2803 passed, two source-wiring assertions updated for the shared component and then all 35 affected tests passed. Lint/typecheck and production build passed.
- Verified production browser profile: 363 passed, 157 database-gated skipped, two obsolete layout assertions failed; assertions updated for requested switch and narrow-screen logo, affected rerun 3 passed/1 gated skipped. No app code changed after final build. Pending: scoped push, Compose release and live checks.
- Operations: server had 1.7 GB free. Age-filtered cache pruning reclaimed zero. Age-filtered dangling image prune authorized by prior cleanup request; live release fe6afd0e and rollback 846586af were verified tagged before cleanup. Database, volumes and running containers preserved.
- Cleanup completed: 65.42 GB reclaimed from dangling images older than one day; 68 GB free. Live and rollback image IDs retained and confirmed after cleanup.
