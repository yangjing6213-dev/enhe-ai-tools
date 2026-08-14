# Phase 2C.1 bilingual homepage wiring

Status: PASS

The approved `EnheRedesignHome` is now the body for `/` in Chinese and `/en` in English. Existing page metadata ownership remains with `generateHomePageMetadata` in the route page files.

The production homepage contains the locked candidate structure: hero, five-product showcase, five-review experience section, brand-value section, and approved Footer. The primary CTA resolves to `/software` or `/en/software` by locale.

The source contains no `File.fileUrl`, `File.path`, product-rating aggregate, payment, download, product-detail, or commerce implementation in this phase. Product listing bodies, detail routes, and commerce flows are unchanged.

Browser SSR evidence confirmed one H1, server-rendered core homepage content, the locale-specific CTA, no preview marker, and no legacy visual-effect DOM on both production homepage routes.
