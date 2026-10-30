# ENHE icon and sharing-image assets

- `enhe-favicon-source.png` is the unchanged blue mascot PNG supplied by the site owner on 2026-10-15 (SHA-256 `048746c879e369d333b2db2beccc1d28a54456317e77b64ee46a1e136d355375`).
- `enhe-share-mark-white.png` is the transparent white three-bar/lightning symbol extracted from the owner's supplied `d6f966964ab05235a1b466f341ba9db7.jpg`. AI assisted mask extraction; detached JPEG residue was removed and the result visually reviewed at its final size.
- `enhe-ai-og-1200x630.png` remains the original sharing-image base. `enhe-ai-og-white-1200x630.png` replaces only the upper-left logo region, preserving all other pixels.

Regenerate favicon ICO (16/32/48/64 px), app icons (192/512 px), Apple icon (180 px), and the sharing image with:

```sh
node scripts/generate-enhe-brand-assets.mjs
```

Apple home-screen icons use an opaque white background. The Apple-only derivative crops the source's transparent outer margin to the square `(81, 81, 1092, 1092)` before resizing to 180 px; all source pixels with alpha at least 16/255 remain inside that crop. The original pale background, rounded corners, colors and mascot are retained. Metadata declares `apple-touch-icon-20261030.png`; `apple-touch-icon.png` supplies Apple's conventional root fallback, and `apple-icon.png` remains a compatible legacy URL. The old `apple-touch-icon-20261016.png` remains available for existing references. Browser favicon and manifest icons retain their original transparency and dimensions.

The old orange icon generator predates this artwork and must not be used to regenerate these mascot assets.
