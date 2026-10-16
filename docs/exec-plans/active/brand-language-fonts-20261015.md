# Brand assets, language switch and font delivery

## Contract
- Replace favicon/app icons with the supplied blue mascot and the orange symbol in the existing sharing image with the supplied white mark.
- Smooth the shared language switch edge while preserving its size, links, interaction and focus indication.
- Keep the existing rounded font unchanged: the user chose to defer font size reduction after the font-splitting license could not be confirmed.
- No database/schema changes or unrelated UI changes. Release through existing checks and verify the production URLs.

## Plan and verification
1. Inspect asset/font sources and browser behavior, implement scoped branding and switch changes. Verify exact source provenance, dimensions and responsive browser rendering.
2. Verify the supplied icon provenance, generated sizes/transparency, sharing-image patch and browser language-switch behavior. Preserve typography and its existing caching rules.
3. Run focused and release checks, push/deploy, verify public assets, font transfers and service health. Preserve pre-existing changes.

## Evidence
- Baseline: clean worktree at d41a10c247991ad1dd29a5dab72eea2791d1f9dd; full Alimama WOFF2 is 2,408,604 bytes.
- No font splitting performed. User explicitly selected keeping the rounded font and deferring size reduction.
- Shared language track currently adds a grey inset shadow to its blue capsule.
- New icons derive from the supplied blue mascot; sharing image changes only the upper-left mark. New metadata asset URLs avoid reusing old preview/icon caches.
- PASS: 36 focused tests (icons, sharing image, metadata, typography preservation, home polish), typecheck, targeted ESLint and `git diff --check`.
- In progress: complete release gates, browser checks and production verification.
- Release investigation: preserve-symlinks flags cannot be applied globally (duplicate React in unit tests); use the previously established temporary legacy ESLint config only for local lint compatibility. No dependency or production configuration changes.
- PASS: dependency audit, disposable migration/recovery drills, 3041 unit tests (100 conditional skips), typecheck, standalone lint, production build. The existing Windows dependency-junction build warnings remain; production Docker build will also be checked.
- Archived only the generated local standalone image cache after a stale WebP cache key stalled requests. A fresh image cache resolves the original news-page navigation timeouts; source assets and production caches unchanged.
- Browser validation caught a computed-radius contract mismatch (999px vs original 16px). Preserve the original component radius; only remove the grey inset shadow and clip overflowing thumb pixels. Focused 36 tests pass again after this correction.

## iPhone home-screen follow-up (2026-10-16)
- Previous release `d1c73e69102c24dd7e17caaaa6eb1d68e1758a77` is deployed and verified: active release marker and all three runtime services match; 3041 unit tests and 386 browser tests passed, with 100/175 conditional skips. Production hashes matched all five icon/sharing assets; six viewport/locale checks and both catalog sharing previews passed.
- User confirms the placeholder E appears in Safari's native Add to Home Screen sheet. Native iOS share-sheet reproduction is not available on this Windows workstation.
- Live iPhone-UA investigation: declared icon is present in the raw HTML head and returns PNG/200, manifest returns 200, but `/apple-touch-icon.png` and the precomposed fallback return 404. The declared 180px icon retains transparency. These are observed compatibility gaps, not proof that transparency or the URL query alone caused the native failure.
- Minimal fix: opaque white 180px Apple tile, a fresh query-free declared filename and the conventional root fallback; preserve all browser favicon/manifest artwork, page layout and fonts. Retain legacy Apple filename.
- Regression was observed before implementation: metadata mismatch and missing fallback asset. After implementation 17 focused tests, typecheck and targeted ESLint pass; generated Apple artwork visually inspected.
- PASS: release `2f9bad0ed005c233d027bdf30bbf8349929523c1` deployed; 3042 unit tests and 388 browser checks passed (100/175 conditional skips), typecheck, standalone lint, build, dependency audit and recovery drills passed. Live raw HTML and all three opaque Apple icon hashes matched.
- FAIL: user retest still shows E in the native Safari share sheet. Server-side checks alone did not establish the native fix.
- Follow-up evidence: the actual TLS proxy is the existing `hot-content-nginx` container. Sanitized proxy logs at 2026-10-16 07:35:19 UTC show `NetworkingExtension/... iOS/27.2` downloading both the declared Apple icon and root fallback with HTTP 200 and 42,746 response bytes. Therefore missing HTML metadata or an absent declared image does not explain the observed result. The optional precomposed fallback is 404, but the declared icon and conventional fallback both succeed.
- Controlled diagnostic: two temporary static HTML pages differ only in the Apple icon href (network URL versus the exact same PNG embedded as a data URI). Both exclude search indexing, use no scripts/manifest and are absent from navigation/sitemap. This tests icon delivery without changing existing public pages, icon selection, fonts or caching. Safari 26+ officially supports data-URL icons; no claim is made that Apple has confirmed a specific iOS 27.2 bug.
- PASS: three targeted production-mode browser checks (JavaScript disabled), typecheck, targeted ESLint and diff whitespace check. The two probe documents differ only in their icon href; the decoded embedded PNG equals the network PNG byte-for-byte. Existing application code, dependencies and deployment configuration are unchanged, so prior full application checks remain applicable; the production Docker build will be checked during deployment.
- PASS: diagnostic release `6a995679d8768d4d00743e3a22084dcd01a7c754` deployed; production build succeeded, runtime services healthy, both probe pages returned HTTP 200 with noindex and matching decoded PNG hashes. Probes were absent from the sitemap.
- Native evidence from the user: direct PNG displays the correct supplied blue mascot in Safari on iOS 27.2, while ENHE's Add to Home Screen preview and isolated inline probe B still show E. Apple.com also shows a letter/placeholder on that same phone. A separate user-supplied screenshot showed Add Bookmark with an old colored logo; the user explicitly withdrew that screenshot as the wrong workflow.
- PASS on another physical phone: the user tested the ENHE site on a different phone and confirmed the icon works. This supports keeping the valid website icon configuration. The original phone's remaining Safari/system-state issue is not fixed or claimed to be an Apple-confirmed version-specific defect.
- Cleanup: remove the two temporary public probe HTML files and their probe-only E2E case; retain both permanent no-JavaScript Apple icon checks. Application assets, metadata, fonts and deployment configuration remain identical to verified release `2f9bad0ed005c233d027bdf30bbf8349929523c1`.
- PASS: cleanup validation includes six icon/source unit tests, both permanent production-mode browser checks, typecheck, targeted ESLint and diff whitespace checks. The diff from fully verified release `2f9bad0ed005c233d027bdf30bbf8349929523c1` contains only this engineering record; prior complete application validation remains applicable.
- Pending: publish probe removal and recheck the three permanent icon hashes, public metadata, deleted probe URLs and service health. Original-phone follow-up can start with normal restart or a user-selected icon through Apple's Shortcuts app; no website-data deletion is needed for this handoff.
