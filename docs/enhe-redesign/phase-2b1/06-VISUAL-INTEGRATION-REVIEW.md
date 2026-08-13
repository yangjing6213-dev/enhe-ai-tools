# Visual Integration Review

Dev server: local Next development server on `127.0.0.1:3101`.

Final Playwright result:

```text
PLAYWRIGHT_PREVIEW=PASS
SCREENSHOT_COUNT=4
```

Checks included:

- `/redesign-preview/shell` returned 200 in Dev Preview.
- `/__redesign-preview/shell` returned 404 for the old/invalid route.
- preview metadata included `noindex`, `nofollow`, `noarchive`, and `noimageindex`.
- Chinese and English footer specimens rendered with their matching locale copy.
- language switch hrefs stayed within the preview specimen; no production navigation wiring was added.
- guest state showed login only; admin state exposed the backend entry only inside the avatar menu.
- source and href checks found no `File.fileUrl`, `File.filePath`, order/payment/download target, or external business surface.
- mobile menu opened, Escape closed it, and focus returned to the trigger after React cleanup.
- focus-visible state was observable; reduced-motion media emulation completed without page errors.
- desktop 200% equivalent viewport (720 CSS px from a 1440px viewport) had no horizontal overflow. The 195px equivalent of a 390px phone is below the shell's practical minimum and was not treated as a real 200% phone acceptance viewport.

## Screenshot dimensions

```text
zh-shell-integration-1440.png = 1440x1231
zh-shell-integration-390.png  = 390x1766
en-shell-integration-1440.png = 1440x1126
en-shell-integration-390.png  = 390x1717
```

The four PNGs are stored under `screenshots/` in this phase directory. They are evidence of the isolated preview only; they do not indicate production header/footer replacement.
