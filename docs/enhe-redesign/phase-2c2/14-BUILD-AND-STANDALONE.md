# Build and standalone verification

Docker Linux engine 29.7.2 ran one disposable postgres:16-alpine container bound only to a random loopback port, with no named volume or host mount. A temporary database received the repository's existing 49 migrations from a temporary schema copy. A temporary script inserted exactly 25 non-production Tool fixtures; no production seed or business/customer/order/download data was used.

npm run build passed on Next.js 15.5.18: compilation completed, 119/119 static pages generated, and production software routes appeared in the route output. The only build warning was Next.js tracing-root inference caused by multiple lockfiles outside the isolated worktree.

The worktree produced a nested traced standalone entry. Static assets and public were copied into that traced output for verification only; no source or configuration changed. The server used process-only temporary values and no repository environment file.

Standalone status checks passed for /, /en, /software, /en/software, /robots.txt, and /sitemap.xml. Software pages 2 and 3 also returned 200; invalid routes returned 404; all known redesign-preview home, shell, and software routes returned 404 in production mode.

After verification the server stopped, the disposable container was stopped and auto-removed, and the temporary migration/browser directory was recursively removed after its resolved path was checked inside the system temp directory. Docker now reports no matching container.

No .env file existed, was read, created, or modified. No production database was accessed, and no production migration or seed ran.

BUILD=PASS, STANDALONE=PASS, DISPOSABLE_DB_CONTAINER_REMOVED=YES, TEMP_DATABASE_ENV_RESTORED=YES.
