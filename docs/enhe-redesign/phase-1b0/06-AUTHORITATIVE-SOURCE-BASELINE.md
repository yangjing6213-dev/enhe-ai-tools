AUTHORITATIVE_SOURCE_BASELINE=BLOCKED

# Authoritative source baseline reconciliation

## Candidate refs

| candidate | observed commit | relevant result |
|---|---|---|
| redesign current `HEAD` | `ef9465b8c8b5010233f0117f5456bce347d499a4` | missing product video component, tool-category module, and EBOS JSON fixture; root loader markers absent |
| local `main` | `33048847b3ff9253b15aee916cb07ba04a31ab4f` | contains the three missing items; root loader markers and historical positive R-008 assertion present |
| local `feature/enhe-api-gateway` | `bc66ea5032a414a1870bcb6890faeee1a8da08c1` | same relevant missing-item lineage and root blob as redesign |
| `origin/main` (existing ref, not fetched) | `12503ec50069f500c52b1d7107e530627791f262` | contains the missing items; remote-tracking metadata is not production evidence |
| `origin/feature/enhe-api-gateway` (existing ref, not fetched) | `c3060f0ee22b7915403ed2fd4819d454b81730cc` | same missing-item lineage as redesign |
| original worktree | `feature/enhe-api-gateway`, `bc66ea5032a414a1870bcb6890faeee1a8da08c1` | dirty (122 modified, 1 deleted, 252 untracked overall); target files include untracked variants and modified `media.ts` |

No branch was switched, no worktree was copied, and no fetch was performed.

## Required item provenance

| item | redesign | main candidate / recent commit | feature branch | original worktree | production match |
|---|---|---|---|---|---|
| `src/components/product-video-player.tsx` | missing; redesign tree has no blob | blob `0bde74dd…`; `3925a369` / 2026-07-04 | missing | untracked; variant does not automatically equal main | unknown |
| `src/lib/tool-category-groups.ts` | missing | blob `e683082a…`; `aa5b8ce6` / 2026-07-07 | missing | untracked; matches the main candidate in the observed hash check | unknown |
| `normalizeMediaSrc` | definition missing, references remain in the page shell | defined in `src/lib/media.ts`; `d1af01f9` / 2026-06-24 | definition missing | modified `media.ts`, definition present but dirty | unknown |
| `skills/ebos/skill-registry.json` | missing | blob `a945aa7a…`; `f3500ddf` / 2026-07-05 | missing | untracked; matches the main candidate in the observed hash check | unknown |

The exact candidate SHA-256 values and all observed ref names are in `07-MISSING-SOURCE-PROVENANCE.csv`. The CSV records metadata only; it does not copy source contents.

## R-008 root-layout provenance

- Redesign and feature root blob: `ed36c974b0416641d379321d8189659b79184a40`; ByteDance/`next/script`/`beforeInteractive` markers absent; `AnalyticsTracker` remains.
- Local main root blob: `df5b62df7186ffaae9b00ee2c80c19aa9184d50f`; loader markers present.
- Existing `origin/main` root blob: `440ea02d4cfaacd3d38906477c380bf9ee502959`; loader markers present.

The redesign negative test is therefore not a production deletion proof. R-008 must be resolved on whichever baseline the production fingerprint identifies, preserving analytics behavior and testing both the old positive and new negative contracts.

## Decision

`AUTHORITATIVE_SOURCE_BASELINE=BLOCKED` because no current production Git SHA/image revision/route-manifest fingerprint maps the running source to any local candidate. Local `main` is a candidate source for the missing modules, not permission to copy dirty worktree files or to start implementation.
