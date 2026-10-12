# Homepage spacing and persistent card click totals

- Scope: hero top whitespace +30%, subtitle gap ×2, CTA-to-folder whitespace ×1.2; PulseHeart on software, AI Skills and AI News cards.
- Preserve: Google login work remains paused; no environment edits, schema migrations or unrelated changes.
- Counts: each successfully saved click +1, shared across languages and card instances; published targets only; atomic PostgreSQL updates. Existing news count field and reserved SiteSetting keys avoid a migration.
- Controls: sibling to navigation links, dedicated footer space, accessible keyboard/touch input and reduced motion.
- Validation: focused API tests, real local PostgreSQL concurrency/persistence, browser navigation/layout/error/repeated click checks, lint/typecheck/build and release checks.
- Reserved counter keys are excluded from public settings payloads and the admin website-settings list.
- Verified: 2802 unit checks (99 environment-dependent skips); targeted follow-up checks passed after final adjustments; PostgreSQL persistence/concurrency checks passed; 15 focused homepage/Skill browser checks and 6 real-database card checks passed, including 320/768/1440px layouts and failed saves.
- Release checks: lint, typecheck, final production build, dependency audit (0 vulnerabilities), fresh/upgrade migration rehearsal and 359 production-browser checks passed (152 profile-dependent skips).
- Implementation state: verified. Publish via the existing Compose release workflow, retaining rollback and persistent data; actual deployment and live results are recorded in the task handoff.
