# Forum media and managed emoji

## Contract
- Fix the two carousel timing checks first, preserving interval and pause assertions.
- Retain the unreleased sitemap commit 1a075b00 and publish it with this release.
- Show the whole forum cover including its top logo; separate category tags from author rows; remove public report controls; animate like clicks; place total approved reply count alongside post likes; use triangle back icons and blue reply buttons without arrows.
- Posts support image and video attachments; replies support images. Authenticated upload ownership, bounded sizes/types/counts, rate limits, and existing administrator review must apply. Pending assets must not become publicly accessible before moderation.
- Import the supplied 26 stickers. Ordinary text inputs/textarea, including usernames, offer the shared picker; structured/password fields retain format validation. Only administrators can add/remove/reorder sticker assets in the backend.
- Use existing storage, auth, audit, and admin styles. No unrelated dirty changes from the root worktree are included.

## Design and decisions
- Reuse the clean comment-avatar worktree on codex/forum-media-emojis-20261014, based on 1a075b00.
- Keep text plain and store administrator-managed sticker shortcodes; render them as image stickers in content and identity surfaces. Avoid arbitrary HTML.
- Use a dedicated attachment record tied to author and optionally post/reply, private storage until the parent content is approved. Serve through an authorization-aware, range-capable endpoint.
- Existing SiteSetting JSON can hold the sticker catalog, with bundled defaults; no separate sticker database model is needed.
- Forum media: up to 6 images (8MB each), 1 MP4/WebM video (100MB); replies up to 4 images. Validate extensions, MIME/signatures, ownership and successful upload references server-side.

## Three stages
1. Carousel repair -> run both bilingual timing cases and adjacent carousel tests.
2. Forum UI/media and sticker catalog/picker -> focused behavior/security tests, local browser checks, lint/typecheck/build.
3. Review scoped diff -> existing release workflow, production sitemap/forum/asset/header verification.

## Evidence and status
- PASS: carousel timing checks. Baseline isolated cases took 20.5s/19.7s; fastForward preserves interval/pause checks and both cases pass in 1.4s with two workers. No production carousel changes.
- PASS: private attachment upload/read/ownership/size/range checks; additive attachment migration applied only to a disposable local PostgreSQL test database. Independent review found and closed cleanup/claim races using discardedAt conditional updates, storage-failure quota retention, and final like-state re-query.
- PASS: 26 bundled stickers (207KB total), shared ordinary-text picker and administrator-only catalog. Independent review found and closed private COS read failures using registered-ID image proxy; uploaded-file cleanup uses real storage naming rules and protects already registered assets.
- PASS: trusted-origin validation permits configured external site origins when Next's internal URL differs; arbitrary forwarded origins remain denied.
- PASS: browser checks on phone/desktop cover ratio, tag/avatar spacing, saved animated likes, nested reply counts, actual topic image/video upload, pending-media access denial, admin approval, video playback/ranges, reply-image approval, ordinary username insertion, controlled input editing and password exclusion. Admin review now submits an explicit hidden status in each form after browser reproduction of missing submitter status.
- PASS: production build and scoped lint/type checks; full existing release gates remain to be run before publication.
- PASS: final production-build browser integration, all 3 cases in 22.6s. Actual administrator upload preserves 27 catalog entries, the new image decodes, and blue action buttons use white labels. Local and private-COS uploads both use registered-ID image reads; real local storage regression covers the existing flattened filename convention and failed-save unlink.
- pending: full release and production verification.
- Production before publication: sitemap.xml is a urlset with 923 URLs and no /forum; public /forum returns 200 without noindex or X-Robots-Tag. The source sitemap fix exists in base commit 1a075b00, previously unpublished because release browser gates failed.
- Production storage configuration verified without reading credentials: COS enabled, private upload root is the default private-uploads. The new mount persists only its forum-media subdirectory.
- Root worktree contains extensive unrelated uncommitted changes; it is untouched.
