# Build and Standalone

## Production Build

`npm run build` ran once after successful migration status. No source fix or
native PostgreSQL fallback was used.

```text
DOCKER_BUILD=PASS
BUILD_EXIT_CODE=0
BUILD_ID=FP7wI58O2w1u0J8C8Awnc
STATIC_PAGE_COUNT=119
BUILD_DURATION_MS=209772
```

Next.js emitted its existing multi-lockfile/output-tracing-root warning. The
Build still compiled, type-validated, generated all static pages, and collected
traces successfully. The nested standalone root was therefore used as in the
historical verified flow. Its 224 static files and 491 public files matched the
Build sources by relative path, size, and SHA-256.

## Traced standalone

```text
DOCKER_STANDALONE=PASS
FORMAL_ROUTE_200_COUNT=6
PREVIEW_ROUTE_404_COUNT=3
STANDALONE_PROCESS_REMOVED=YES
```

Routes `/`, `/en`, `/software`, `/en/software`, `/robots.txt`, and `/sitemap.xml`
returned 200. Preview home, shell, and software routes each returned 404.

Formal-output checks passed:

- legacy `fade-in 0.45s` production wrapper absent;
- review APG region, rotating `aria-live=off`, inactive `aria-hidden`, and pause
  control `aria-pressed` semantics present;
- the unique review bundle retained 5000 ms and 6000 ms contracts, minified as
  `5e3` and `6e3`;
- ByteDance loader script count zero;
- Analytics tracker client bundle present;
- software output contained no Candidate/Preview, `fileUrl`, `filePath`, or
  delivery-address marker.

No broad lint, test, browser matrix, or animation review was rerun, as directed.
